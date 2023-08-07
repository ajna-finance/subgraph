import {
  AddCollateralNFT as AddCollateralNFTEvent,
  DrawDebtNFT as DrawDebtNFTEvent,
  Flashloan as FlashloanEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  MergeOrRemoveCollateralNFT as MergeOrRemoveCollateralNFTEvent,
  ReserveAuction as ReserveAuctionEvent,
  AddQuoteToken as AddQuoteTokenEvent
} from "../generated/templates/ERC721Pool/ERC721Pool"
import {
  AddCollateralNFT,
  AddQuoteToken,
  DrawDebtNFT,
  Flashloan,
  // KickReserveAuction,
  MergeOrRemoveCollateralNFT,
  Pool,
  ReserveAuction
} from "../generated/schema"
import { incrementTokenTxCount } from "./utils/token-erc721"
import { Bytes } from "@graphprotocol/graph-ts"

import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles, updateAccountReserveAuctions } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/pool/bucket"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { ZERO_BD, ONE_BI, TEN_BI } from "./utils/constants"

import { getLendId, loadOrCreateLend } from "./utils/pool/lend"
import { getBorrowerInfo, getLoanId, loadOrCreateLoan } from "./utils/pool/loan"
import { getLiquidationAuctionId, getAuctionInfoERC20Pool, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus, loadOrCreateBucketTake } from "./utils/pool/liquidation"
import { getBurnInfo, updatePool, addLiquidationToPool, addReserveAuctionToPool, getLenderInfo, getRatesAndFees, calculateLendRate } from "./utils/pool/pool"
import { lpbValueInQuote } from "./utils/common"

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
  const addQuoteToken = new AddQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  addQuoteToken.lender    = event.params.lender
  addQuoteToken.index     = event.params.index.toU32()
  addQuoteToken.amount    = wadToDecimal(event.params.amount)
  addQuoteToken.lpAwarded = wadToDecimal(event.params.lpAwarded)
  addQuoteToken.lup       = wadToDecimal(event.params.lup)

  addQuoteToken.blockNumber = event.block.number
  addQuoteToken.blockTimestamp = event.block.timestamp
  addQuoteToken.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update bucket state
  const bucketId      = getBucketId(pool.id, event.params.index.toU32())
  const bucket        = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
  const bucketInfo    = getBucketInfo(pool.id, bucket.bucketIndex)
  bucket.collateral   = wadToDecimal(bucketInfo.collateral)
  bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
  bucket.lpb          = wadToDecimal(bucketInfo.lpb)
  bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

  // update account state
  const accountId = addressToBytes(event.params.lender)
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

  // save entities to store
  account.save()
  bucket.save()
  lend.save()
  pool.save()

  addQuoteToken.bucket = bucket.id
  addQuoteToken.pool = pool.id
  addQuoteToken.save()
}

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
  pool.tokenIdsPledged = pool.tokenIdsPledged.concat(event.params.tokenIdsPledged)
  incrementTokenTxCount(pool)

  // update account state
  const accountId = addressToBytes(event.params.borrower)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  // update loan state
  const loanId = getLoanId(pool.id, accountId)
  const loan = loadOrCreateLoan(loanId, pool.id, drawDebtNFT.borrower)
  const borrowerInfo     = getBorrowerInfo(addressToBytes(event.params.borrower), pool.id)
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

// export function handleKickReserveAuction(event: KickReserveAuctionEvent): void {
//   let entity = new KickReserveAuction(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.claimableReservesRemaining = event.params.claimableReservesRemaining
//   entity.auctionPrice = event.params.auctionPrice
//   entity.currentBurnEpoch = event.params.currentBurnEpoch

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// TODO: NEED TO FIND AND REMOVE TOKENIDS FROM THE ARRAYS OF LOANS AND POOL
export function handleMergeOrRemoveCollateralNFT(
  event: MergeOrRemoveCollateralNFTEvent
): void {
  const mergeOrRemove = new MergeOrRemoveCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  mergeOrRemove.actor = event.params.actor
  mergeOrRemove.collateralMerged = event.params.collateralMerged
  mergeOrRemove.toIndexLps = event.params.toIndexLps

  mergeOrRemove.blockNumber = event.block.number
  mergeOrRemove.blockTimestamp = event.block.timestamp
  mergeOrRemove.transactionHash = event.transaction.hash

  mergeOrRemove.save()
}

// export function handleAuctionNFTSettle(event: AuctionNFTSettleEvent): void {
//   const entity = new AuctionNFTSettle(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.borrower = event.params.borrower
//   entity.collateral = wadToDecimal(event.params.collateral)
//   entity.lp = wadToDecimal(event.params.lp)
//   entity.index = event.params.index.toU32()

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }
