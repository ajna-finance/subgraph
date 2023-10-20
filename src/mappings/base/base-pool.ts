import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { Account, AddQuoteToken, BondWithdrawn, Bucket, BucketBankruptcy, BucketTakeLPAwarded, Flashloan, Lend, LoanStamped, MoveQuoteToken, Pool, PositionLend, RemoveQuoteToken, ReserveAuctionKick, ReserveAuctionTake, Token, TransferLP, UpdateInterestRate } from "../../../generated/schema"
import {
    AddQuoteToken as AddQuoteTokenERC20Event,
    MoveQuoteToken as MoveQuoteTokenERC20Event,
    RemoveQuoteToken as RemoveQuoteTokenERC20Event,
    TransferLP as TransferLPERC20Event
} from "../../../generated/templates/ERC20Pool/ERC20Pool"
import {
    AddQuoteToken as AddQuoteTokenERC721Event,
    MoveQuoteToken as MoveQuoteTokenERC721Event,
    RemoveQuoteToken as RemoveQuoteTokenERC721Event,
    TransferLP as TransferLPERC721Event
} from "../../../generated/templates/ERC721Pool/ERC721Pool"

import { loadOrCreateAccount, updateAccountLends, updateAccountPools, updateAccountReserveAuctions } from "../../utils/account"
import { ONE_BI, TEN_BI, ZERO_BD } from "../../utils/constants"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "../../utils/convert"
import { getBucketId, getBucketInfo, loadOrCreateBucket, updateBucketLends } from "../../utils/pool/bucket"
import { getDepositTime, getLendId, loadOrCreateLend, lpbValueInQuote, saveOrRemoveLend } from "../../utils/pool/lend"
import { addReserveAuctionToPool, getBurnInfo, getLenderInfo, isERC20Pool, updatePool, updatePoolMulticall } from '../../utils/pool/pool';
import { incrementTokenTxCount as incrementTokenTxCountERC20Pool } from "../../utils/token-erc20"
import { incrementTokenTxCount as incrementTokenTxCountERC721Pool } from "../../utils/token-erc721"
import { loadOrCreateReserveAuction } from "../../utils/pool/reserve-auction"
import { saveOrRemovePositionLend } from "../../utils/position"
import { decreaseAllowances, increaseAllowances, loadOrCreateAllowances, revokeAllowances, saveOrRemoveAllowances } from "../../utils/pool/lp-allowances"
import { approveTransferors, loadOrCreateTransferors, revokeTransferors, saveOrRemoveTransferors } from "../../utils/pool/lp-transferors"
import { loadOrCreateBucketTake } from "../../utils/pool/liquidation"


/*******************************/
/*** Borrower Event Handlers ***/
/*******************************/

export function _handleFlashLoan(event: ethereum.Event, tokenAddress: Address, borrower: Address, amount: BigInt): void {
    const flashloan = new Flashloan(event.transaction.hash.concatI32(event.logIndex.toI32()))
    const pool = Pool.load(addressToBytes(event.address))!
    const token = Token.load(addressToBytes(tokenAddress))!
    const scaleFactor = TEN_BI.pow(18 - token.decimals as u8)

    flashloan.pool = pool.id
    flashloan.borrower = borrower

    const normalizedAmount = wadToDecimal(amount.times(scaleFactor))
    flashloan.amount = normalizedAmount
    if (token.id == pool.quoteToken) {
      pool.quoteTokenFlashloaned = pool.quoteTokenFlashloaned.plus(normalizedAmount)
    } else if (token.id == pool.collateralToken) {
      pool.collateralFlashloaned = pool.collateralFlashloaned.plus(normalizedAmount)
    }
    token.txCount = token.txCount.plus(ONE_BI)
    pool.txCount = pool.txCount.plus(ONE_BI)

    token.save()
    pool.save()
    flashloan.save()
}

export function _handleLoanStamped(event: ethereum.Event, borrower: Address): void {
    const entity = new LoanStamped(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.borrower = borrower
    entity.pool = addressToBytes(event.address)

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash
    entity.save()
}

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
    updatePoolMulticall(pool)
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
    const lend           = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, addQuoteToken.lender)
    lend.depositTime     = blockTimestamp
    lend.lpb             = lend.lpb.plus(addQuoteToken.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)
    updateBucketLends(bucket, lend)

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
    const fromBucketLend = loadOrCreateLend(fromBucketId, fromBucketLendId, pool.id, fromBucket.bucketIndex, moveQuoteToken.lender)
    if (moveQuoteToken.lpRedeemedFrom.le(fromBucketLend.lpb)) {
        fromBucketLend.lpb = fromBucketLend.lpb.minus(moveQuoteToken.lpRedeemedFrom)
    } else {
        log.warning('handleMoveQuoteToken: lender {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0',
                    [moveQuoteToken.lender.toHexString(), moveQuoteToken.lpRedeemedFrom.toString(), fromBucketLend.lpb.toString()])
        fromBucketLend.lpb = ZERO_BD
    }
    fromBucketLend.lpbValueInQuote = lpbValueInQuote(pool.id, fromBucket.bucketIndex, fromBucketLend.lpb)
    updateBucketLends(fromBucket, fromBucketLend)

    // update to bucket lend state
    const toBucketLendId = getLendId(toBucketId, lender)
    const toBucketLend = loadOrCreateLend(toBucketId, toBucketLendId, pool.id, toBucket.bucketIndex, moveQuoteToken.lender)
    toBucketLend.depositTime = getDepositTime(fromBucketLend.depositTime, toBucketLend)
    toBucketLend.lpb = toBucketLend.lpb.plus(wadToDecimal(lpAwardedTo))
    toBucketLend.lpbValueInQuote = lpbValueInQuote(pool.id, toBucket.bucketIndex, toBucketLend.lpb)
    updateBucketLends(toBucket, toBucketLend)

    // update account state
    const accountId = addressToBytes(lender)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)
    // update account lends if necessary
    updateAccountLends(account, fromBucketLend)
    updateAccountLends(account, toBucketLend)
    // remove lend from store if necessary
    saveOrRemoveLend(fromBucketLend)

    // save entities to store
    pool.save()
    fromBucket.save()
    toBucket.save()
    toBucketLend.save()
    account.save()

    // associate moveQuoteToken event with relevant entities and save to the store
    moveQuoteToken.from = fromBucketId
    moveQuoteToken.to = toBucketId
    moveQuoteToken.pool = pool.id
    moveQuoteToken.save()
}

export function _handleRemoveQuoteToken(erc20Event: RemoveQuoteTokenERC20Event | null, erc721Event: RemoveQuoteTokenERC721Event | null): void {
    // get pool based upon the event source
    const pool = erc20Event === null ? Pool.load(addressToBytes(erc721Event!.address))! : Pool.load(addressToBytes(erc20Event.address))!

    // set event attribute types to local variables
    let logIndex: i32;
    let lender: Address;
    let index: u32;
    let amount: BigInt;
    let lpRedeemed: BigInt;
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
        lpRedeemed = erc20Event!.params.lpRedeemed
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
        lpRedeemed = erc721Event!.params.lpRedeemed
        lup = erc721Event!.params.lup
        blockNumber = erc721Event!.block.number
        blockTimestamp = erc721Event!.block.timestamp
        transactionHash = erc721Event!.transaction.hash
    }

    const removeQuote = new RemoveQuoteToken(
        transactionHash.concatI32(logIndex)
    )
    removeQuote.lender     = lender
    removeQuote.index      = index
    removeQuote.amount     = wadToDecimal(amount)
    removeQuote.lpRedeemed = wadToDecimal(lpRedeemed)
    removeQuote.lup        = wadToDecimal(lup)

    removeQuote.blockNumber = blockNumber
    removeQuote.blockTimestamp = blockTimestamp
    removeQuote.transactionHash = transactionHash

    // update pool entity
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update bucket state
    const bucketId   = getBucketId(pool.id, index)
    const bucket     = loadOrCreateBucket(pool.id, bucketId, index)
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update account state
    const accountId = removeQuote.lender
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, removeQuote.lender)
    if (removeQuote.lpRedeemed.le(lend.lpb)) {
      lend.lpb = lend.lpb.minus(removeQuote.lpRedeemed)
    } else {
      log.warning('handleRemoveQuoteToken: lender {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0',
                  [removeQuote.lender.toHexString(), removeQuote.lpRedeemed.toString(), lend.lpb.toString()])
      lend.lpb = ZERO_BD
    }
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    // update account's list of pools and lends if necessary
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)
    // remove lend from store if necessary
    saveOrRemoveLend(lend)

    // save entities to store
    account.save()
    bucket.save()
    pool.save()

    // associate removeQuoteToken event with relevant entities and save to the store
    removeQuote.bucket = bucket.id
    removeQuote.pool = pool.id
    removeQuote.save()
}

export function _handleTransferLP(erc20Event: TransferLPERC20Event | null, erc721Event: TransferLPERC721Event | null): void {
    // get pool based upon the event source
    const pool = erc20Event === null ? Pool.load(addressToBytes(erc721Event!.address))! : Pool.load(addressToBytes(erc20Event.address))!

    // set event attribute types to local variables
    let logIndex: i32;
    let owner: Address;
    let newOwner: Address;
    let indexes: Array<BigInt>;
    let lp: BigInt;
    let blockNumber: BigInt;
    let blockTimestamp: BigInt;
    let transactionHash: Bytes;

    // access event attributes and write to local variables
    if (isERC20Pool(pool)) {
        logIndex = erc20Event!.logIndex.toI32()
        owner = erc20Event!.params.owner
        newOwner = erc20Event!.params.newOwner
        indexes = erc20Event!.params.indexes
        lp = erc20Event!.params.lp
        blockNumber = erc20Event!.block.number
        blockTimestamp = erc20Event!.block.timestamp
        transactionHash = erc20Event!.transaction.hash
    } else {
        logIndex = erc721Event!.logIndex.toI32()
        owner = erc721Event!.params.owner
        newOwner = erc721Event!.params.newOwner
        indexes = erc721Event!.params.indexes
        lp = erc721Event!.params.lp
        blockNumber = erc721Event!.block.number
        blockTimestamp = erc721Event!.block.timestamp
        transactionHash = erc721Event!.transaction.hash
    }

    const transferLP = new TransferLP(
        transactionHash.concatI32(logIndex)
    )
    transferLP.owner    = addressToBytes(owner)
    transferLP.newOwner = addressToBytes(newOwner)
    transferLP.indexes  = bigIntArrayToIntArray(indexes)
    transferLP.lp       = wadToDecimal(lp)

    transferLP.blockNumber = blockNumber
    transferLP.blockTimestamp = blockTimestamp
    transferLP.transactionHash = transactionHash

    // increment pool and token tx counts
    pool.txCount = pool.txCount.plus(ONE_BI)
    const quoteToken = Token.load(pool.quoteToken)!
    quoteToken.txCount = quoteToken.txCount.plus(ONE_BI)
    quoteToken.save()
    // TODO: should this also call updatePool?

    log.info("handleTransferLP from {} to {}" , [transferLP.owner.toHexString(), transferLP.newOwner.toHexString()])

    // update Lends for old and new owners, creating entities where necessary
    const oldOwnerAccount = Account.load(transferLP.owner)!
    const newOwnerAccount = loadOrCreateAccount(transferLP.newOwner)
    for (var i=0; i<indexes.length; ++i) {
        const bucketIndex = indexes[i]
        const bucketId = getBucketId(pool.id, bucketIndex.toU32())
        const bucket = Bucket.load(bucketId)!
        const oldLendId = getLendId(bucketId, transferLP.owner)
        const newLendId = getLendId(bucketId, transferLP.newOwner)

        // If PositionManager generated this event, it means either:
        // Memorialize - transfer from lender to PositionManager, eliminating the lender's Lend
        // Redeem      - transfer from PositionManager to lender, creating the lender's Lend

        // event does not reveal LP amounts transferred for each bucket, so query the pool and update
        // remove old lend
        const oldLend = loadOrCreateLend(bucketId, oldLendId, pool.id, bucketIndex.toU32(), transferLP.owner)
        oldLend.lpb = wadToDecimal(getLenderInfo(pool.id, bucketIndex, owner).lpBalance)
        oldLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, oldLend.lpb)
        updateBucketLends(bucket, oldLend)
        updateAccountLends(oldOwnerAccount, oldLend)
        // remove lend from store if necessary
        saveOrRemoveLend(oldLend)

        // add new lend
        const newLend = loadOrCreateLend(bucketId, newLendId, pool.id, bucketIndex.toU32(), transferLP.newOwner)
        const newLendInfo = getLenderInfo(pool.id, bucketIndex, newOwner)
        newLend.depositTime = newLendInfo.depositTime
        newLend.lpb = wadToDecimal(newLendInfo.lpBalance)
        newLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, newLend.lpb)
        newLend.save()
        updateBucketLends(bucket, newLend)
        updateAccountLends(newOwnerAccount, newLend)
        bucket.save()
    }

    // save entities to the store
    oldOwnerAccount.save()
    newOwnerAccount.save()
    pool.save()
    transferLP.save()
}

/*************************************/
/*** LPB Management Event Handlers ***/
/*************************************/

export function _handleApproveLPTransferors(event: ethereum.Event, lender: Address, transferors: Address[]): void {
    const poolId = addressToBytes(event.address)
    const lpTransferorList = loadOrCreateTransferors(poolId, addressToBytes(lender))
    approveTransferors(lpTransferorList, transferors)

    const pool = Pool.load(poolId)!
    pool.txCount = pool.txCount.plus(ONE_BI)

    // save entities to the store
    pool.save()
    lpTransferorList.save()
}

export function _handleDecreaseLPAllowance(event: ethereum.Event, owner: Address, spender: Address, indexes: BigInt[], amounts: BigInt[]): void {
    const poolId = addressToBytes(event.address)
    const lpAllowanceList = loadOrCreateAllowances(poolId, addressToBytes(owner), addressToBytes(spender))
    decreaseAllowances(lpAllowanceList, indexes, amounts)

    const pool = Pool.load(poolId)!
    pool.txCount = pool.txCount.plus(ONE_BI)

    // save entities to the store
    pool.save()
    saveOrRemoveAllowances(lpAllowanceList)
}

export function _handleIncreaseLPAllowance(event: ethereum.Event, owner: Address, spender: Address, indexes: BigInt[], amounts: BigInt[]): void {
    const poolId = addressToBytes(event.address)
    const lpAllowanceList = loadOrCreateAllowances(poolId, addressToBytes(owner), addressToBytes(spender))
    increaseAllowances(lpAllowanceList, indexes, amounts)

    const pool = Pool.load(poolId)!
    pool.txCount = pool.txCount.plus(ONE_BI)

    // save entities to the store
    pool.save()
    lpAllowanceList.save()
}

export function _handleRevokeLPAllowance(event: ethereum.Event, owner: Address, spender: Address, indexes: BigInt[]): void {
    const poolId = addressToBytes(event.address)
    const lpAllowanceList = loadOrCreateAllowances(poolId, addressToBytes(owner), addressToBytes(spender))
    revokeAllowances(lpAllowanceList, indexes)

    const pool = Pool.load(poolId)!
    pool.txCount = pool.txCount.plus(ONE_BI)

    // save entities to the store
    pool.save()
    saveOrRemoveAllowances(lpAllowanceList)
}

export function _handleRevokeLPTransferors(event: ethereum.Event, lender: Address, transferors: Address[]): void {
    const poolId = addressToBytes(event.address)
    const lpTransferorList = loadOrCreateTransferors(poolId, addressToBytes(lender))
    revokeTransferors(lpTransferorList, transferors)

    const pool = Pool.load(poolId)!
    pool.txCount = pool.txCount.plus(ONE_BI)

    // save entities to the store
    pool.save()
    saveOrRemoveTransferors(lpTransferorList)
}

/**********************************/
/*** Liquidation Event Handlers ***/
/**********************************/

export function _handleBondWithdrawn(event: ethereum.Event, kicker: Address, reciever: Address, amount: BigInt): void {
    const entity = new BondWithdrawn(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.kicker = kicker
    entity.reciever = reciever
    entity.amount = wadToDecimal(amount)

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

// emitted along with BucketTake
export function _handleBucketTakeLPAwarded(event: ethereum.Event, kicker: Address, taker: Address, lpAwardedKicker: BigInt, lpAwardedTaker: BigInt): void {
    const lpAwardedId                   = event.transaction.hash.concatI32(event.logIndex.toI32());
    const bucketTakeLpAwarded           = new BucketTakeLPAwarded(lpAwardedId)
    bucketTakeLpAwarded.taker           = taker
    bucketTakeLpAwarded.pool            = addressToBytes(event.address)
    bucketTakeLpAwarded.kicker          = kicker
    bucketTakeLpAwarded.lpAwardedTaker  = wadToDecimal(lpAwardedTaker)
    bucketTakeLpAwarded.lpAwardedKicker = wadToDecimal(lpAwardedKicker)

    bucketTakeLpAwarded.blockNumber     = event.block.number
    bucketTakeLpAwarded.blockTimestamp  = event.block.timestamp
    bucketTakeLpAwarded.transactionHash = event.transaction.hash
    bucketTakeLpAwarded.save()

    // since this is emitted immediately before BucketTakeEvent, create BucketTake entity to associate it with this LP award
    const bucketTakeId   = event.transaction.hash.concatI32(event.logIndex.toI32() + 1)
    const bucketTake     = loadOrCreateBucketTake(bucketTakeId)
    bucketTake.lpAwarded = lpAwardedId
    bucketTake.save()
}

/*******************************/
/*** Reserves Event Handlers ***/
/*******************************/

export function _handleReserveAuctionKick(event: ethereum.Event, currentBurnEpoch: BigInt, claimableReservesRemaining: BigInt, auctionPrice: BigInt): void {
  // create the ReserveAuctionKick entity (immutable) and ReserveAuction entity (mutable)
  const reserveKick = new ReserveAuctionKick(
    event.transaction.hash.concat(event.transaction.from)
  )
  const pool           = Pool.load(addressToBytes(event.address))!
  const reserveAuction = loadOrCreateReserveAuction(pool.id, currentBurnEpoch)

  reserveKick.kicker            = event.transaction.from
  reserveKick.reserveAuction    = reserveAuction.id
  reserveKick.pool              = pool.id
  reserveKick.claimableReserves = wadToDecimal(claimableReservesRemaining)
  reserveKick.startingPrice     = wadToDecimal(auctionPrice)

  reserveKick.blockNumber = event.block.number
  reserveKick.blockTimestamp = event.block.timestamp
  reserveKick.transactionHash = event.transaction.hash

  reserveAuction.claimableReservesRemaining = reserveKick.claimableReserves
  reserveAuction.kick = reserveKick.id

  // update pool state
  pool.burnEpoch = currentBurnEpoch
  updatePool(pool)
  addReserveAuctionToPool(pool, reserveAuction)
  pool.txCount = pool.txCount.plus(ONE_BI)

  // update account state
  const account   = loadOrCreateAccount(addressToBytes(event.transaction.from))
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountReserveAuctions(account, reserveAuction.id)

  account.save()
  pool.save()
  reserveAuction.save()
  reserveKick.save()
}

export function _handleReserveAuctionTake(event: ethereum.Event, currentBurnEpoch: BigInt, claimableReservesRemaining: BigInt, auctionPrice: BigInt): void {
    const reserveTake = new ReserveAuctionTake(
        event.transaction.hash.concat(event.transaction.from)
    )
    const pool           = Pool.load(addressToBytes(event.address))!
    const reserveAuction = loadOrCreateReserveAuction(pool.id, currentBurnEpoch)

    reserveTake.taker                      = event.transaction.from
    reserveTake.reserveAuction             = reserveAuction.id
    reserveTake.pool                       = pool.id
    reserveTake.claimableReservesRemaining = wadToDecimal(claimableReservesRemaining)
    reserveTake.auctionPrice               = wadToDecimal(auctionPrice)

    // retrieve ajna burn information from the pool
    const burnInfo = getBurnInfo(pool, currentBurnEpoch)
    // update burn information of the reserve auction take
    // since only one reserve auction can occur at a time, look at the difference since the last reserve auction
    reserveTake.ajnaBurned = wadToDecimal(burnInfo.totalBurned).minus(pool.totalAjnaBurned)
    reserveAuction.claimableReservesRemaining = reserveTake.claimableReservesRemaining
    reserveAuction.lastTakePrice              = reserveTake.auctionPrice
    reserveAuction.ajnaBurned                 = reserveAuction.ajnaBurned.plus(reserveTake.ajnaBurned)
    reserveAuction.takes                      = reserveAuction.takes.concat([reserveTake.id])

    // event does not provide amount purchased; use auctionPrice and ajnaBurned to calculate
    reserveTake.quotePurchased = reserveTake.ajnaBurned.div(reserveTake.auctionPrice)

    reserveTake.blockNumber = event.block.number
    reserveTake.blockTimestamp = event.block.timestamp
    reserveTake.transactionHash = event.transaction.hash

    // update pool state
    pool.totalAjnaBurned = wadToDecimal(burnInfo.totalBurned)
    pool.totalInterestEarned = wadToDecimal(burnInfo.totalInterest)
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)
    if (isERC20Pool(pool)) {
        incrementTokenTxCountERC20Pool(pool)
    } else {
        incrementTokenTxCountERC721Pool(pool)
    }

    // update account state
    const account   = loadOrCreateAccount(addressToBytes(event.transaction.from))
    account.txCount = account.txCount.plus(ONE_BI)
    updateAccountReserveAuctions(account, reserveAuction.id)

    // save entities to store
    account.save()
    pool.save()
    reserveAuction.save()
    reserveTake.save()
}

/***************************/
/*** Pool Event Handlers ***/
/***************************/

export function _handleBucketBankruptcy(event: ethereum.Event, index: BigInt, lpForfeited: BigInt): void {
    const bucketBankruptcy = new BucketBankruptcy(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    bucketBankruptcy.index = index.toU32()
    bucketBankruptcy.lpForfeited = wadToDecimal(lpForfeited)

    bucketBankruptcy.blockNumber = event.block.number
    bucketBankruptcy.blockTimestamp = event.block.timestamp
    bucketBankruptcy.transactionHash = event.transaction.hash

    // update entities
    const pool = Pool.load(addressToBytes(event.address))!

    // update pool state
    log.info("_handleBucketBankruptcy updating pool {} for bankruptcy in bucket {}", [event.address.toHexString(), index.toString()])
    updatePool(pool)

    // update bucket state to zero out bucket contents
    const bucketId      = getBucketId(pool.id, index.toU32())
    const bucket        = loadOrCreateBucket(pool.id, bucketId, index.toU32())
    bucket.collateral   = ZERO_BD
    bucket.deposit      = ZERO_BD
    bucket.lpb          = ZERO_BD
    bucket.exchangeRate = ZERO_BD

    bucketBankruptcy.bucket = bucketId
    bucketBankruptcy.pool = pool.id

    // iterate through all bucket lends and set lend.lpb to zero
    for (let i = 0; i < bucket.lends.length; i++) {
        const lendId = bucket.lends[i]
        const lend = Lend.load(lendId)!
        lend.lpb = ZERO_BD
        updateBucketLends(bucket, lend)
        updateAccountLends(loadOrCreateAccount(lend.lender), lend)
        // remove lend from store
        saveOrRemoveLend(lend)
    }

    // iterate through all bucket positionLends and set positionLend.lpb to zero
    for (let i = 0; i < bucket.positionLends.length; i++) {
        const positionLendId = bucket.positionLends[i]
        const positionLend = PositionLend.load(positionLendId)!
        positionLend.lpb = ZERO_BD
        saveOrRemovePositionLend(positionLend)
    }

    // save entities to store
    pool.save()
    bucket.save()
    bucketBankruptcy.save()
}

export function _handleInterestRateEvent(poolAddress: Address, event: ethereum.Event, newRate: BigInt): void {
  const updateInterestRate = new UpdateInterestRate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  const pool = Pool.load(poolAddress)!

  // record old rates
  updateInterestRate.pool = pool.id
  updateInterestRate.oldBorrowRate = pool.borrowRate
  updateInterestRate.oldLendRate = pool.lendRate

  // update pool.borrowRate such that updatePool may update related rates and fees
  pool.borrowRate = wadToDecimal(newRate)
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)

  // record new rates
  updateInterestRate.newBorrowRate = pool.borrowRate
  updateInterestRate.newLendRate = pool.lendRate
  updateInterestRate.borrowFeeRate = pool.borrowFeeRate
  updateInterestRate.depositFeeRate = pool.depositFeeRate

  updateInterestRate.blockNumber = event.block.number
  updateInterestRate.blockTimestamp = event.block.timestamp
  updateInterestRate.transactionHash = event.transaction.hash

  // save entities to the store
  pool.save()
  updateInterestRate.save()
}
