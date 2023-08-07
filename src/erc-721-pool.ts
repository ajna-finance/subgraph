import {
  AddCollateralNFT as AddCollateralNFTEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  AuctionNFTSettle as AuctionNFTSettleEvent,
  AuctionSettle as AuctionSettleEvent,
  DrawDebtNFT as DrawDebtNFTEvent,
  Flashloan as FlashloanEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  MergeOrRemoveCollateralNFT as MergeOrRemoveCollateralNFTEvent,
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
  ReserveAuction,
  Settle
} from "../generated/schema"
import { incrementTokenTxCount } from "./utils/token-erc721"
import { Bytes } from "@graphprotocol/graph-ts"

import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles, updateAccountReserveAuctions } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/pool/bucket"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { ZERO_BD, ONE_BI, TEN_BI } from "./utils/constants"

import { getLendId, loadOrCreateLend } from "./utils/pool/lend"
import { getBorrowerInfoERC721Pool, getLoanId, loadOrCreateLoan } from "./utils/pool/loan"
import { getLiquidationAuctionId, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus, loadOrCreateBucketTake, getAuctionInfoERC721Pool } from "./utils/pool/liquidation"
import { getBurnInfo, updatePool, addLiquidationToPool, addReserveAuctionToPool, getLenderInfo, getRatesAndFees, calculateLendRate, isERC20Pool } from "./utils/pool/pool"
import { lpbValueInQuote } from "./utils/pool/lend"
import { loadOrCreateReserveAuction, reserveAuctionKickerReward } from "./utils/pool/reserve-auction"
import { _handleAddQuoteToken } from "./mappings/base/base-pool"

// TODO:
// - Figure out solution for accurate tracking of tokenIdsPledged
// - Update getInfo functions to appropriate pool type
// - Create base functions to reduce code duplication

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

    // update bucket state
    const bucketId   = getBucketId(pool.id, event.params.index.toU32())
    const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)
    bucket.tokenIds     = bucket.tokenIds.concat(event.params.tokenIds)
    // TODO: should these tokenIds be added to the pool entity here as well?

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

// TODO: ensure that the common events don't result in double counting state incrementation
// TODO: potentially get around this by create or load and exiting the function if it's already been created
export function handleAddQuoteToken(event: AddQuoteTokenEvent): void {
  // TODO: get compiler to ignore this line's INFO output
  event = changetype<AddQuoteTokenEvent | null>(event)!
  _handleAddQuoteToken(null, event)
}

// called by Account's with Lend(s) in a pool
export function handleMergeOrRemoveCollateralNFT(
  event: MergeOrRemoveCollateralNFTEvent
): void {
  const mergeOrRemove = new MergeOrRemoveCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  mergeOrRemove.actor = event.params.actor
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

  // TODO: iterate through the actors lends in this pool and update their lpb and lpbValueInQuote
  // use multicall to get the lend lpb in the actors lends

  // TODO: NEED TO FIND AND REMOVE TOKENIDS FROM THE ARRAYS OF LOANS AND POOL

  mergeOrRemove.save()
}

/**********************************/
/*** Liquidation Event Handlers ***/
/**********************************/

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

  reserveKick.save()
}
