import { BigDecimal, BigInt, ByteArray, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import {
  AddCollateralNFT as AddCollateralNFTEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  AuctionNFTSettle as AuctionNFTSettleEvent,
  AuctionSettle as AuctionSettleEvent,
  DrawDebtNFT as DrawDebtNFTEvent,
  Flashloan as FlashloanEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  MergeOrRemoveCollateralNFT as MergeOrRemoveCollateralNFTEvent,
  RemoveCollateral as RemoveCollateralEvent,
  RemoveQuoteToken as RemoveQuoteTokenEvent,
  RepayDebt as RepayDebtEvent,
  ReserveAuction as ReserveAuctionEvent,
  Settle as SettleEvent
} from "../generated/templates/ERC721Pool/ERC721Pool"
import {
  AddCollateralNFT,
  AddQuoteToken,
  AuctionNFTSettle,
  DrawDebtNFT,
  Flashloan,
  LiquidationAuction,
  Loan,
  ReserveAuctionKick,
  MergeOrRemoveCollateralNFT,
  Pool,
  RemoveCollateral,
  RemoveQuoteToken,
  RepayDebt,
  ReserveAuction,
  Settle
} from "../generated/schema"

import { findAndRemoveTokenIds, incrementTokenTxCount } from "./utils/token-erc721"
import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles, updateAccountReserveAuctions } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/pool/bucket"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { ZERO_BD, ONE_BI, TEN_BI, ONE_BD, ONE_WAD_BI } from "./utils/constants"
import { getLendId, loadOrCreateLend } from "./utils/pool/lend"
import { getBorrowerInfoERC721Pool, getLoanId, loadOrCreateLoan } from "./utils/pool/loan"
import { getLiquidationAuctionId, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus, loadOrCreateBucketTake, getAuctionInfoERC721Pool } from "./utils/pool/liquidation"
import { getBurnInfo, updatePool, addLiquidationToPool, addReserveAuctionToPool, getLenderInfo, getRatesAndFees, calculateLendRate, isERC20Pool } from "./utils/pool/pool"
import { lpbValueInQuote } from "./utils/pool/lend"
import { loadOrCreateReserveAuction, reserveAuctionKickerReward } from "./utils/pool/reserve-auction"
import { _handleAddQuoteToken } from "./mappings/base/base-pool"

// TODO:
// - Finish liquidations and implement rebalance logic for moving tokenIds from tokenIdsPledged to bucketTokenIds
// - Create base functions to reduce code duplication common handlers

/*******************************/
/*** Borrower Event Handlers ***/
/*******************************/

export function handleDrawDebtNFT(event: DrawDebtNFTEvent): void {
  const drawDebtNFT = new DrawDebtNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  drawDebtNFT.borrower = event.params.borrower
  drawDebtNFT.amountBorrowed = wadToDecimal(event.params.amountBorrowed)
  drawDebtNFT.lup = wadToDecimal(event.params.lup)
  drawDebtNFT.tokenIdsPledged = event.params.tokenIdsPledged

  drawDebtNFT.blockNumber = event.block.number
  drawDebtNFT.blockTimestamp = event.block.timestamp
  drawDebtNFT.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  // record the tokenIds added to the pool
  pool.tokenIdsPledged = pool.tokenIdsPledged.concat(event.params.tokenIdsPledged)
  incrementTokenTxCount(pool)

  // update account state
  const accountId = addressToBytes(event.params.borrower)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  // update loan state
  const loanId = getLoanId(pool.id, accountId)
  const loan = loadOrCreateLoan(loanId, pool.id, drawDebtNFT.borrower)
  const borrowerInfo     = getBorrowerInfoERC721Pool(addressToBytes(event.params.borrower), pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)
  loan.tokenIdsPledged   = loan.tokenIdsPledged.concat(event.params.tokenIdsPledged)

  // update account's list of pools and loans if necessary
  updateAccountPools(account, pool)
  updateAccountLoans(account, loan)

  drawDebtNFT.pool = pool.id

  // save entities to store
  pool.save()
  account.save()
  loan.save()
  drawDebtNFT.save()
}

export function handleRepayDebt(event: RepayDebtEvent): void {
  const repayDebt = new RepayDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  repayDebt.borrower         = event.params.borrower
  repayDebt.quoteRepaid      = wadToDecimal(event.params.quoteRepaid)
  repayDebt.collateralPulled = wadToDecimal(event.params.collateralPulled)
  repayDebt.lup              = wadToDecimal(event.params.lup)

  repayDebt.blockNumber = event.block.number
  repayDebt.blockTimestamp = event.block.timestamp
  repayDebt.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  // update tx count for a pools tokens
  incrementTokenTxCount(pool)

  // update account state
  const accountId = addressToBytes(event.params.borrower)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  const loanId = getLoanId(pool.id, accountId)
  const loan = loadOrCreateLoan(loanId, pool.id, repayDebt.borrower)
  const borrowerInfo = getBorrowerInfoERC721Pool(accountId, pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

  // retrieve the tokenIdsPledged that were pulled in this event
  const numberOfTokensPulled = event.params.collateralPulled.div(ONE_WAD_BI).toI32()
  const tokenIdsPulled = loan.tokenIdsPledged.slice(loan.tokenIdsPledged.length - numberOfTokensPulled, loan.tokenIdsPledged.length)
  // remove tokenIdsPulled from the loan and pool tokenIdsPledged
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsPulled, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsPulled, pool.tokenIdsPledged)

  // update account loans if necessary
  updateAccountLoans(account, loan)

  // associate pool with repayDebt event
  repayDebt.pool = pool.id

  // save entities to store
  account.save()
  pool.save()
  loan.save()
  repayDebt.save()
}

/*****************************/
/*** Lender Event Handlers ***/
/*****************************/

// lender adds collateral to a bucket in exchange for LPB
export function handleAddCollateralNFT(event: AddCollateralNFTEvent): void {
  const addCollateralNFT = new AddCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  addCollateralNFT.actor = event.params.actor
  addCollateralNFT.index = event.params.index
  addCollateralNFT.tokenIds = event.params.tokenIds
  addCollateralNFT.lpAwarded = wadToDecimal(event.params.lpAwarded)

  addCollateralNFT.blockNumber = event.block.number
  addCollateralNFT.blockTimestamp = event.block.timestamp
  addCollateralNFT.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)
    pool.bucketTokenIds = pool.bucketTokenIds.concat(event.params.tokenIds)

    // update bucket state
    const bucketId   = getBucketId(pool.id, event.params.index.toU32())
    const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update account state
    const accountId = addressToBytes(event.params.actor)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, addCollateralNFT.actor)
    lend.lpb             = lend.lpb.plus(addCollateralNFT.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    // update account's list of pools and lends if necessary
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    addCollateralNFT.bucket = bucket.id
    addCollateralNFT.pool = pool.id
  }

  addCollateralNFT.save()
}

export function handleAddQuoteToken(event: AddQuoteTokenEvent): void {
  // TODO: get compiler to ignore this line's INFO output
  event = changetype<AddQuoteTokenEvent | null>(event)!
  _handleAddQuoteToken(null, event)
}

export function handleRemoveCollateral(event: RemoveCollateralEvent): void {
  const removeCollateral = new RemoveCollateral(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  removeCollateral.claimer    = event.params.claimer
  removeCollateral.index      = event.params.index.toU32()
  removeCollateral.amount     = wadToDecimal(event.params.amount)
  removeCollateral.lpRedeemed = wadToDecimal(event.params.lpRedeemed)

  removeCollateral.blockNumber = event.block.number
  removeCollateral.blockTimestamp = event.block.timestamp
  removeCollateral.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  // update tx count for a pools tokens
  incrementTokenTxCount(pool)

  // update bucket state
  const bucketId   = getBucketId(pool.id, event.params.index.toU32())
  const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
  const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
  bucket.collateral   = wadToDecimal(bucketInfo.collateral)
  bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
  bucket.lpb          = wadToDecimal(bucketInfo.lpb)
  bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

  // update account state
  const accountId = removeCollateral.claimer
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  const lendId = getLendId(bucketId, accountId)
  const lend = loadOrCreateLend(bucketId, lendId, pool.id, removeCollateral.claimer)
  if (removeCollateral.lpRedeemed.le(lend.lpb)){
    lend.lpb = lend.lpb.minus(removeCollateral.lpRedeemed)
  } else {
    lend.lpb = ZERO_BD
  }
  lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

  // update pool tokenIds
  // slice the tokenIds that will be removed from the end of the array
  const numberOfTokensToRemove = event.params.amount.div(ONE_WAD_BI).toI32()
  const tokenIdsToRemove = pool.bucketTokenIds.slice(pool.bucketTokenIds.length - numberOfTokensToRemove, pool.bucketTokenIds.length)
  // splice the identified tokenIds out of pool.bucketTokenIds
  pool.bucketTokenIds = findAndRemoveTokenIds(tokenIdsToRemove, pool.bucketTokenIds)

  // update account's list of pools and lends if necessary
  updateAccountPools(account, pool)
  updateAccountLends(account, lend)

  // save entities to store
  account.save()
  bucket.save()
  lend.save()
  pool.save()

  // associate bucket and pool with removeCollateral entity
  removeCollateral.bucket = bucket.id
  removeCollateral.pool = pool.id

  removeCollateral.save()
}

export function handleRemoreQuoteToken(event: RemoveQuoteTokenEvent): void {
  const removeQuote = new RemoveQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  removeQuote.lender     = event.params.lender
  removeQuote.index      = event.params.index.toU32()
  removeQuote.amount     = wadToDecimal(event.params.amount)
  removeQuote.lpRedeemed = wadToDecimal(event.params.lpRedeemed)
  removeQuote.lup        = wadToDecimal(event.params.lup)

  removeQuote.blockNumber = event.block.number
  removeQuote.blockTimestamp = event.block.timestamp
  removeQuote.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update bucket state
    const bucketId   = getBucketId(pool.id, event.params.index.toU32())
    const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
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
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, removeQuote.lender)
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

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()

    removeQuote.bucket = bucket.id
    removeQuote.pool = pool.id
  }

  removeQuote.save()
}

// called by Account's with Lend(s) in a pool
export function handleMergeOrRemoveCollateralNFT(
  event: MergeOrRemoveCollateralNFTEvent
): void {
  const mergeOrRemove = new MergeOrRemoveCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  mergeOrRemove.actor = addressToBytes(event.params.actor)
  mergeOrRemove.collateralMerged = wadToDecimal(event.params.collateralMerged)
  mergeOrRemove.toIndexLps = wadToDecimal(event.params.toIndexLps)

  mergeOrRemove.blockNumber = event.block.number
  mergeOrRemove.blockTimestamp = event.block.timestamp
  mergeOrRemove.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update account state
  const accountId = addressToBytes(event.params.actor)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  // use transaction metadata to access the list of removalIndexes
  const dataWithoutSelector = event.transaction.input.subarray(4)
  //prepend a "tuple" prefix (function params are arrays, not tuples)
  const tuplePrefix = ByteArray.fromHexString(
    '0x0000000000000000000000000000000000000000000000000000000000000020'
  );
  const dataWithoutSelectorAsTuple = new Uint8Array(tuplePrefix.length + dataWithoutSelector.length);
  dataWithoutSelectorAsTuple.set(tuplePrefix, 0);
  dataWithoutSelectorAsTuple.set(dataWithoutSelector, tuplePrefix.length);
  const decoded = ethereum.decode('(uint256[],uint256,uint256)', Bytes.fromUint8Array(dataWithoutSelectorAsTuple))!

  const removalIndexes = decoded.toTuple()[0].toBigIntArray()
  const noNFTsToRemove = decoded.toTuple()[1].toBigInt()
  const toIndex        = decoded.toTuple()[2].toBigInt()

  // iterate through removalIndexes and update state
  for (let i = 0; i < removalIndexes.length; i++) {
    const index = removalIndexes[i]

    // update bucket state
    const bucketId   = getBucketId(pool.id, index.toU32())
    const bucket     = loadOrCreateBucket(pool.id, bucketId, index.toU32())
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, event.params.actor)
    lend.lpb = wadToDecimal(getLenderInfo(pool.id, index, event.params.actor).lpBalance)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    updateAccountLends(account, lend)

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
  }

  // update pool bucketTokenIds
  if (mergeOrRemove.collateralMerged.equals(wadToDecimal(noNFTsToRemove))) {
    // slice the tokenIds that will be removed from the end of the array
    const tokenIdsToRemove = pool.bucketTokenIds.slice(pool.bucketTokenIds.length - noNFTsToRemove.toI32(), pool.bucketTokenIds.length)
    // splice the identified tokenIds out of pool.bucketTokenIds
    pool.bucketTokenIds = findAndRemoveTokenIds(tokenIdsToRemove, pool.bucketTokenIds)
  }

  updateAccountPools(account, pool)

  // save entities to store
  account.save()
  pool.save()
  mergeOrRemove.save()
}

/**********************************/
/*** Liquidation Event Handlers ***/
/**********************************/

// TODO: need to rebalance tokenIds from tokenIdsPledged to bucketTokenIds
// TODO: update lends on AuctionNFTSettle in case of lpb reward in any of the buckets?
// TODO: retrieve bucket depth value from calldata to know how many lends to create?
// emitted concurrently with `Settle`
export function handleAuctionNFTSettle(event: AuctionNFTSettleEvent): void {
  const auctionNFTSettle = new AuctionNFTSettle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  auctionNFTSettle.borrower = event.params.borrower
  auctionNFTSettle.collateral = wadToDecimal(event.params.collateral)
  auctionNFTSettle.lp = wadToDecimal(event.params.lp)
  auctionNFTSettle.index = event.params.index.toU32()

  auctionNFTSettle.blockNumber = event.block.number
  auctionNFTSettle.blockTimestamp = event.block.timestamp
  auctionNFTSettle.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!
  // pool doesn't need to be updated here as it was already updated in the concurrent Settle event

  // update auction state
  const loanId       = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan         = Loan.load(loanId)!
  const auctionId    = loan.liquidationAuction!
  const auction      = LiquidationAuction.load(auctionId)!
  auction.settle     = auctionNFTSettle.id
  auction.settleTime = auctionNFTSettle.blockTimestamp
  auction.settled    = true
  auction.save()

  // update loan state
  loan.t0debt = ZERO_BD
  loan.collateralPledged = auctionNFTSettle.collateral
  // TODO: UPDATE LOAN TOKENIDS

  loan.inLiquidation = false
  loan.save()

  // update auctionNFTSettle pointers
  auctionNFTSettle.pool = pool.id
  auctionNFTSettle.loan = loan.id

  auctionNFTSettle.save()
}

// This is in the code path for ERC721Pools, but will never be emitted
export function handleAuctionSettle(event: AuctionSettleEvent): void {}

export function handleSettle(event: SettleEvent): void {
  const settle = new Settle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  settle.borrower = event.params.borrower
  settle.settledDebt = wadToDecimal(event.params.settledDebt)

  settle.blockNumber = event.block.number
  settle.blockTimestamp = event.block.timestamp
  settle.transactionHash = event.transaction.hash

  // update pool state
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.loansCount = pool.loansCount.minus(ONE_BI)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update settler account state
  const account   = loadOrCreateAccount(event.transaction.from)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountPools(account, pool)
  updateAccountSettles(account, settle)

  // update liquidation auction state
  const loanId = getLoanId(pool.id, settle.borrower)
  const loan = Loan.load(loanId)!
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  const auctionInfo = getAuctionInfoERC721Pool(settle.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus, false, true)
  auction.settles = auction.settles.concat([settle.id])

  // update settle pointers
  settle.pool = pool.id
  settle.liquidationAuction = auctionId
  settle.loan = loanId

  // save entities to the store
  account.save()
  auction.save()
  pool.save()

  settle.save()
}

/*******************************/
/*** Reserves Event Handlers ***/
/*******************************/

// TODO: ABSTRACT THIS - THIS FUNCTION IS COPY PASTA FROM ERC20Pool
export function handleReserveAuctionKick(event: KickReserveAuctionEvent): void {
  // create the ReserveAuctionKick entity (immutable) and ReserveAuction entity (mutable)
  const reserveKick = new ReserveAuctionKick(
    event.transaction.hash.concat(event.transaction.from)
  )

  const pool           = Pool.load(addressToBytes(event.address))!
  const reserveAuction = loadOrCreateReserveAuction(pool.id, event.params.currentBurnEpoch)

  reserveKick.kicker            = event.transaction.from
  reserveKick.reserveAuction    = reserveAuction.id
  reserveKick.pool              = pool.id
  reserveKick.claimableReserves = wadToDecimal(event.params.claimableReservesRemaining)
  reserveKick.startingPrice     = wadToDecimal(event.params.auctionPrice)

  reserveKick.blockNumber = event.block.number
  reserveKick.blockTimestamp = event.block.timestamp
  reserveKick.transactionHash = event.transaction.hash

  reserveAuction.claimableReservesRemaining = reserveKick.claimableReserves
  reserveAuction.kick = reserveKick.id

  // update pool state
  pool.burnEpoch = event.params.currentBurnEpoch
  updatePool(pool)
  addReserveAuctionToPool(pool, reserveAuction)
  pool.txCount = pool.txCount.plus(ONE_BI)
  reserveKick.kickerAward = reserveAuctionKickerReward(pool)

  // update account state
  const account   = loadOrCreateAccount(addressToBytes(event.transaction.from))
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountReserveAuctions(account, reserveAuction.id)

  account.save()
  pool.save()
  reserveAuction.save()
  reserveKick.save()
}
