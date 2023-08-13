import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { AddQuoteToken, MoveQuoteToken, Pool } from "../../../generated/schema"
import {
    AddQuoteToken as AddQuoteTokenERC20Event,
    MoveQuoteToken as MoveQuoteTokenERC20Event
} from "../../../generated/templates/ERC20Pool/ERC20Pool"
import {
    AddQuoteToken as AddQuoteTokenERC721Event,
    MoveQuoteToken as MoveQuoteTokenERC721Event
} from "../../../generated/templates/ERC721Pool/ERC721Pool"

import { loadOrCreateAccount, updateAccountLends, updateAccountPools } from "../../utils/account"
import { ONE_BI, ZERO_BD } from "../../utils/constants"
import { addressToBytes, wadToDecimal } from "../../utils/convert"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "../../utils/pool/bucket"
import { getLendId, loadOrCreateLend, lpbValueInQuote } from "../../utils/pool/lend"
import { isERC20Pool, updatePool } from "../../utils/pool/pool"
import { incrementTokenTxCount as incrementTokenTxCountERC20Pool } from "../../utils/token-erc20"
import { incrementTokenTxCount as incrementTokenTxCountERC721Pool } from "../../utils/token-erc721"


/*****************************/
/*** Lender Event Handlers ***/
/*****************************/

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

export function _handleMoveQuoteToken(erc20Event: MoveQuoteTokenERC20Event | null, erc721Event: MoveQuoteTokenERC721Event | null): void {
    // get pool based upon the event source
    const pool = erc20Event === null ? Pool.load(addressToBytes(erc721Event!.address))! : Pool.load(addressToBytes(erc20Event.address))!

    // set event attribute types to local variables
    let logIndex: i32;
    let lender: Address;
    let amount: BigInt;
    let fromIndex: u32;
    let toIndex: u32;
    let lpRedeemedFrom: BigInt;
    let lpAwardedTo: BigInt;
    let lup: BigInt;
    let blockNumber: BigInt;
    let blockTimestamp: BigInt;
    let transactionHash: Bytes;

    // access event attributes and write to local variables
    if (isERC20Pool(pool)) {
        incrementTokenTxCountERC20Pool(pool)

        logIndex = erc20Event!.logIndex.toI32()
        lender = erc20Event!.params.lender
        fromIndex = erc20Event!.params.from.toU32()
        toIndex = erc20Event!.params.to.toU32()
        amount = erc20Event!.params.amount
        lpRedeemedFrom = erc20Event!.params.lpRedeemedFrom
        lpAwardedTo = erc20Event!.params.lpAwardedTo
        lup = erc20Event!.params.lup
        blockNumber = erc20Event!.block.number
        blockTimestamp = erc20Event!.block.timestamp
        transactionHash = erc20Event!.transaction.hash
    } else {
        incrementTokenTxCountERC721Pool(pool)

        logIndex = erc721Event!.logIndex.toI32()
        lender = erc721Event!.params.lender
        fromIndex = erc721Event!.params.from.toU32()
        toIndex = erc721Event!.params.to.toU32()
        amount = erc721Event!.params.amount
        lpRedeemedFrom = erc721Event!.params.lpRedeemedFrom
        lpAwardedTo = erc721Event!.params.lpAwardedTo
        lup = erc721Event!.params.lup
        blockNumber = erc721Event!.block.number
        blockTimestamp = erc721Event!.block.timestamp
        transactionHash = erc721Event!.transaction.hash
    }

    const moveQuoteToken = new MoveQuoteToken(
        transactionHash.concatI32(logIndex)
    )
    moveQuoteToken.lender         = lender
    moveQuoteToken.amount         = wadToDecimal(amount)
    moveQuoteToken.lpRedeemedFrom = wadToDecimal(lpRedeemedFrom)
    moveQuoteToken.lpAwardedTo    = wadToDecimal(lpAwardedTo)
    moveQuoteToken.lup            = wadToDecimal(lup)

    moveQuoteToken.blockNumber = blockNumber
    moveQuoteToken.blockTimestamp = blockTimestamp
    moveQuoteToken.transactionHash = transactionHash

    // update pool entity
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update from bucket state
    const fromBucketId = getBucketId(pool.id, fromIndex)
    const fromBucket = loadOrCreateBucket(pool.id, fromBucketId, fromIndex)
    const fromBucketInfo = getBucketInfo(pool.id, fromIndex)
    fromBucket.collateral   = wadToDecimal(fromBucketInfo.collateral)
    fromBucket.deposit      = wadToDecimal(fromBucketInfo.quoteTokens)
    fromBucket.lpb          = wadToDecimal(fromBucketInfo.lpb)
    fromBucket.exchangeRate = wadToDecimal(fromBucketInfo.exchangeRate)

    // update to bucket state
    const toBucketId = getBucketId(pool.id, toIndex)
    const toBucket = loadOrCreateBucket(pool.id, toBucketId, toIndex)
    const toBucketInfo = getBucketInfo(pool.id, toIndex)
    toBucket.collateral   = wadToDecimal(toBucketInfo.collateral)
    toBucket.deposit      = wadToDecimal(toBucketInfo.quoteTokens)
    toBucket.lpb          = wadToDecimal(toBucketInfo.lpb)
    toBucket.exchangeRate = wadToDecimal(toBucketInfo.exchangeRate)

    // update from bucket lend state
    const fromBucketLendId = getLendId(fromBucketId, lender)
    const fromBucketLend = loadOrCreateLend(fromBucketId, fromBucketLendId, pool.id, moveQuoteToken.lender)
    if (moveQuoteToken.lpRedeemedFrom.le(fromBucketLend.lpb)) {
        fromBucketLend.lpb = fromBucketLend.lpb.minus(moveQuoteToken.lpRedeemedFrom)
    } else {
        log.warning('handleMoveQuoteToken: lender {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0',
                    [moveQuoteToken.lender.toHexString(), moveQuoteToken.lpRedeemedFrom.toString(), fromBucketLend.lpb.toString()])
        fromBucketLend.lpb = ZERO_BD
    }
    fromBucketLend.lpbValueInQuote = lpbValueInQuote(pool.id, fromBucket.bucketIndex, fromBucketLend.lpb)

    // update to bucket lend state
    const toBucketLendId = getLendId(toBucketId, lender)
    const toBucketLend = loadOrCreateLend(toBucketId, toBucketLendId, pool.id, moveQuoteToken.lender)
    toBucketLend.lpb = toBucketLend.lpb.plus(wadToDecimal(lpAwardedTo))
    toBucketLend.lpbValueInQuote = lpbValueInQuote(pool.id, toBucket.bucketIndex, toBucketLend.lpb)

    // update account state
    const accountId = addressToBytes(lender)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)
    // update account lends if necessary
    updateAccountLends(account, fromBucketLend)
    updateAccountLends(account, toBucketLend)

    // save entities to store
    pool.save()
    fromBucket.save()
    toBucket.save()
    fromBucketLend.save()
    toBucketLend.save()
    account.save()

    // associate moveQuoteToken event with relevant entities and save to the store
    moveQuoteToken.from = fromBucketId
    moveQuoteToken.to = toBucketId
    moveQuoteToken.pool = pool.id
    moveQuoteToken.save()
}
