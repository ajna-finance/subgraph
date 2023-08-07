import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { AddQuoteToken, Pool } from "../../../generated/schema"
import { AddQuoteToken as AddQuoteTokenERC20Event } from "../../../generated/templates/ERC20Pool/ERC20Pool"
import { AddQuoteToken as AddQuoteTokenERC721Event } from "../../../generated/templates/ERC721Pool/ERC721Pool"

import { loadOrCreateAccount, updateAccountLends, updateAccountPools } from "../../utils/account"
import { ONE_BI } from "../../utils/constants"
import { addressToBytes, wadToDecimal } from "../../utils/convert"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "../../utils/pool/bucket"
import { getLendId, loadOrCreateLend, lpbValueInQuote } from "../../utils/pool/lend"
import { isERC20Pool, updatePool } from "../../utils/pool/pool"
import { incrementTokenTxCount as incrementTokenTxCountERC20Pool } from "../../utils/token-erc20"
import { incrementTokenTxCount as incrementTokenTxCountERC721Pool } from "../../utils/token-erc721"

// As assembly script doesn't support union types, we use two separate nullable params that are generated in their respective pool handler types
export function _handleAddQuoteToken(erc20Event: AddQuoteTokenERC20Event | null, erc721Event: AddQuoteTokenERC721Event | null): void {
    // get pool based upon the event source
    const pool = erc20Event === null ? Pool.load(addressToBytes(erc721Event!.address))! : Pool.load(addressToBytes(erc20Event.address))!

    // set event attribute types to local variables
    let logIndex: i32;
    let lender: Address;
    let index: u32;
    let amount: BigInt;
    let lpAwarded: BigInt;
    let lup: BigInt;
    let blockNumber: BigInt;
    let blockTimestamp: BigInt;
    let transactionHash: Bytes;

    // access event attributes and write to local variables
    if (isERC20Pool(pool)) {
        incrementTokenTxCountERC20Pool(pool)

        logIndex = erc20Event!.logIndex.toI32()
        lender = erc20Event!.params.lender
        index = erc20Event!.params.index.toU32()
        amount = erc20Event!.params.amount
        lpAwarded = erc20Event!.params.lpAwarded
        lup = erc20Event!.params.lup
        blockNumber = erc20Event!.block.number
        blockTimestamp = erc20Event!.block.timestamp
        transactionHash = erc20Event!.transaction.hash
    } else {
        incrementTokenTxCountERC721Pool(pool)

        logIndex = erc721Event!.logIndex.toI32()
        lender = erc721Event!.params.lender
        index = erc721Event!.params.index.toU32()
        amount = erc721Event!.params.amount
        lpAwarded = erc721Event!.params.lpAwarded
        lup = erc721Event!.params.lup
        blockNumber = erc721Event!.block.number
        blockTimestamp = erc721Event!.block.timestamp
        transactionHash = erc721Event!.transaction.hash
    }

    // use local variables to create shared AddQuoteToken entity
    const addQuoteToken = new AddQuoteToken(
        transactionHash.concatI32(logIndex)
    )
    addQuoteToken.lender    = lender
    addQuoteToken.index     = index
    addQuoteToken.amount    = wadToDecimal(amount)
    addQuoteToken.lpAwarded = wadToDecimal(lpAwarded)
    addQuoteToken.lup       = wadToDecimal(lup)

    addQuoteToken.blockNumber = blockNumber
    addQuoteToken.blockTimestamp = blockTimestamp
    addQuoteToken.transactionHash = transactionHash

    // update pool entity
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update bucket state
    const bucketId      = getBucketId(pool.id, index)
    const bucket        = loadOrCreateBucket(pool.id, bucketId, index)
    const bucketInfo    = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update account state
    const accountId = addressToBytes(lender)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId         = getLendId(bucketId, accountId)
    const lend           = loadOrCreateLend(bucketId, lendId, pool.id, addQuoteToken.lender)
    lend.lpb             = lend.lpb.plus(addQuoteToken.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    // update account's list of pools and lends if necessary
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)

    // associate entities
    addQuoteToken.bucket = bucket.id
    addQuoteToken.pool = pool.id

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()
    addQuoteToken.save()
}

