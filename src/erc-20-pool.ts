import { Bytes, log } from "@graphprotocol/graph-ts"

import {
  AddCollateral as AddCollateralEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  AuctionNFTSettle as AuctionNFTSettleEvent,
  AuctionSettle as AuctionSettleEvent,
  BucketBankruptcy as BucketBankruptcyEvent,
  BucketTake as BucketTakeEvent,
  BucketTakeLPAwarded as BucketTakeLPAwardedEvent,
  DrawDebt as DrawDebtEvent,
  Kick as KickEvent,
  MoveQuoteToken as MoveQuoteTokenEvent,
  RemoveCollateral as RemoveCollateralEvent,
  RemoveQuoteToken as RemoveQuoteTokenEvent,
  RepayDebt as RepayDebtEvent,
  ReserveAuction as ReserveAuctionEvent,
  Settle as SettleEvent,
  Take as TakeEvent,
  TransferLPTokens as TransferLPTokensEvent,
  UpdateInterestRate as UpdateInterestRateEvent
} from "../generated/ERC20Pool/ERC20Pool"
import {
  AddCollateral,
  AddQuoteToken,
  AuctionNFTSettle,
  AuctionSettle,
  BucketBankruptcy,
  BucketTake,
  BucketTakeLPAwarded,
  DrawDebt,
  Kick,
  MoveQuoteToken,
  Pool,
  RemoveCollateral,
  RemoveQuoteToken,
  RepayDebt,
  ReserveAuction,
  Settle,
  Take,
  TransferLPTokens,
  UpdateInterestRate
} from "../generated/schema"

import { ONE_BI } from "./utils/constants"
import { addressToBytes, wadToDecimal, rayToDecimal } from "./utils/convert"
import { loadOrCreateAccount, updateAccountPools } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/bucket"
import { getLendId, loadOrCreateLend } from "./utils/lend"
import { getLoanId, loadOrCreateLoan } from "./utils/loan"
import { updatePool } from "./utils/pool"
import { collateralization, lpbValueInQuote } from "./utils/common"

export function handleAddCollateral(event: AddCollateralEvent): void {
  let addCollateral = new AddCollateral(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  addCollateral.actor = event.params.actor
  addCollateral.price = event.params.price
  addCollateral.amount = event.params.amount
  addCollateral.lpAwarded = event.params.lpAwarded

  addCollateral.blockNumber = event.block.number
  addCollateral.blockTimestamp = event.block.timestamp
  addCollateral.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.transaction.to!))
  if (pool != null) {
    // update pool state
    // updatePool(pool)

    // update account state
    const accountId = addressToBytes(event.params.actor)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)
    // update account's list of pools if necessary
    updateAccountPools(account, pool)

    // update bucket state
    const bucketId   = getBucketId(pool.id, event.params.price)
    const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.price)
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.quoteTokens  = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = rayToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = rayToDecimal(bucketInfo.exchangeRate)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id)
    lend.lpb             = lend.lpb.plus(rayToDecimal(event.params.lpAwarded))
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket, lend)

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()
  }

  addCollateral.save()
}

export function handleAddQuoteToken(event: AddQuoteTokenEvent): void {
  let addQuoteToken = new AddQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  addQuoteToken.lender = event.params.lender
  addQuoteToken.price = event.params.price
  addQuoteToken.amount = event.params.amount
  addQuoteToken.lpAwarded = event.params.lpAwarded
  addQuoteToken.lup = event.params.lup

  addQuoteToken.blockNumber = event.block.number
  addQuoteToken.blockTimestamp = event.block.timestamp
  addQuoteToken.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.transaction.to!))
  if (pool != null) {
    // update pool state
    updatePool(pool)

    // update bucket state
    const bucketId   = getBucketId(pool.id, event.params.price)
    const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.price)
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.quoteTokens  = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = rayToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = rayToDecimal(bucketInfo.exchangeRate)

    // update account state
    const accountId = addressToBytes(event.params.lender)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)
    // update account's list of pools if necessary
    updateAccountPools(account, pool)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id)
    lend.deposit         = lend.deposit.plus(wadToDecimal(event.params.amount))
    lend.lpb             = lend.lpb.plus(rayToDecimal(event.params.lpAwarded))
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket, lend)

    // save entities to store
    pool.save()
    bucket.save()
    account.save()
    lend.save()

    // TODO: verify this doesn't result in needing multiple queries to access nested entities
    addQuoteToken.bucket = bucket.id
    addQuoteToken.pool = pool.id
  }

  addQuoteToken.save()
}

export function handleAuctionNFTSettle(event: AuctionNFTSettleEvent): void {
  let entity = new AuctionNFTSettle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.collateral = event.params.collateral
  entity.lps = event.params.lps
  entity.index = event.params.index

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAuctionSettle(event: AuctionSettleEvent): void {
  let entity = new AuctionSettle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.collateral = event.params.collateral

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBucketBankruptcy(event: BucketBankruptcyEvent): void {
  let entity = new BucketBankruptcy(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.index = event.params.index
  entity.lpForfeited = event.params.lpForfeited

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBucketTake(event: BucketTakeEvent): void {
  let entity = new BucketTake(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.index = event.params.index
  entity.amount = event.params.amount
  entity.collateral = event.params.collateral
  entity.bondChange = event.params.bondChange
  entity.isReward = event.params.isReward

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBucketTakeLPAwarded(
  event: BucketTakeLPAwardedEvent
): void {
  let entity = new BucketTakeLPAwarded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.taker = event.params.taker
  entity.kicker = event.params.kicker
  entity.lpAwardedTaker = event.params.lpAwardedTaker
  entity.lpAwardedKicker = event.params.lpAwardedKicker

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDrawDebt(event: DrawDebtEvent): void {
  const drawDebt = new DrawDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  drawDebt.borrower = event.params.borrower
  drawDebt.amountBorrowed = event.params.amountBorrowed
  drawDebt.collateralPledged = event.params.collateralPledged
  drawDebt.lup = event.params.lup

  drawDebt.blockNumber = event.block.number
  drawDebt.blockTimestamp = event.block.timestamp
  drawDebt.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.transaction.to!))
  if (pool != null) {
    // update pool state
    pool.lup               = wadToDecimal(event.params.lup)
    pool.currentDebt       = pool.currentDebt.plus(wadToDecimal(event.params.amountBorrowed))
    // pool.currentReserves   = getPoolReservesInfo(pool)
    pool.pledgedCollateral = pool.pledgedCollateral.plus(wadToDecimal(event.params.collateralPledged))
    pool.txCount           = pool.txCount.plus(ONE_BI)

    // TODO: update bucket state -> requires handling liquidations

    // update account state
    const accountId = addressToBytes(event.params.borrower)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)
    // update account's list of pools if necessary
    updateAccountPools(account, pool)

    // update loan state
    const loanId = getLoanId(pool.id, accountId)
    const loan = loadOrCreateLoan(loanId, pool.id)
    loan.collateralDeposited = loan.collateralDeposited.plus(wadToDecimal(event.params.collateralPledged))
    loan.debt                = loan.debt.plus(wadToDecimal(event.params.amountBorrowed))
    loan.collateralization   = collateralization(loan.debt, loan.collateralDeposited)

    // save entities to store
    pool.save()
    account.save()
    loan.save()

    drawDebt.pool = pool.id
  }

  drawDebt.save()
}

export function handleKick(event: KickEvent): void {
  let entity = new Kick(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.debt = event.params.debt
  entity.collateral = event.params.collateral
  entity.bond = event.params.bond

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMoveQuoteToken(event: MoveQuoteTokenEvent): void {
  let entity = new MoveQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.from = event.params.from
  entity.to = event.params.to
  entity.amount = event.params.amount
  entity.lpRedeemedFrom = event.params.lpRedeemedFrom
  entity.lpAwardedTo = event.params.lpAwardedTo
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRemoveCollateral(event: RemoveCollateralEvent): void {
  let entity = new RemoveCollateral(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.claimer = event.params.claimer
  entity.price = event.params.price
  entity.amount = event.params.amount
  entity.lpRedeemed = event.params.lpRedeemed

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRemoveQuoteToken(event: RemoveQuoteTokenEvent): void {
  let entity = new RemoveQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.price = event.params.price
  entity.amount = event.params.amount
  entity.lpRedeemed = event.params.lpRedeemed
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRepayDebt(event: RepayDebtEvent): void {
  const repayDebt = new RepayDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  repayDebt.borrower = event.params.borrower
  repayDebt.quoteRepaid = event.params.quoteRepaid
  repayDebt.collateralPulled = event.params.collateralPulled
  repayDebt.lup = event.params.lup

  repayDebt.blockNumber = event.block.number
  repayDebt.blockTimestamp = event.block.timestamp
  repayDebt.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.transaction.to!))
  if (pool != null) {
    // update pool state
    pool.lup               = wadToDecimal(event.params.lup)
    pool.currentDebt       = pool.currentDebt.minus(wadToDecimal(event.params.quoteRepaid))
    // pool.currentReserves   = getPoolReservesInfo(pool)
    pool.pledgedCollateral = pool.pledgedCollateral.minus(wadToDecimal(event.params.collateralPulled))
    pool.txCount           = pool.txCount.plus(ONE_BI)

    // update account state
    const accountId = addressToBytes(event.params.borrower)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update loan state
    const loanId = getLoanId(pool.id, accountId)
    const loan = loadOrCreateLoan(loanId, pool.id)
    loan.collateralDeposited = loan.collateralDeposited.minus(wadToDecimal(event.params.collateralPulled))
    loan.debt                = loan.debt.minus(wadToDecimal(event.params.quoteRepaid))
    loan.collateralization   = collateralization(loan.debt, loan.collateralDeposited)

    // save entities to store
    pool.save()
    account.save()
    loan.save()

    repayDebt.pool = pool.id
  }

  repayDebt.save()
}

export function handleReserveAuction(event: ReserveAuctionEvent): void {
  let entity = new ReserveAuction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.claimableReservesRemaining = event.params.claimableReservesRemaining
  entity.auctionPrice = event.params.auctionPrice

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSettle(event: SettleEvent): void {
  let entity = new Settle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.settledDebt = event.params.settledDebt

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTake(event: TakeEvent): void {
  let entity = new Take(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.amount = event.params.amount
  entity.collateral = event.params.collateral
  entity.bondChange = event.params.bondChange
  entity.isReward = event.params.isReward

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransferLPTokens(event: TransferLPTokensEvent): void {
  let entity = new TransferLPTokens(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.newOwner = event.params.newOwner
  entity.indexes = event.params.indexes
  entity.lpTokens = event.params.lpTokens

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

// TODO: update pool EMAs, inflator, and utilization rates in this event
export function handleUpdateInterestRate(event: UpdateInterestRateEvent): void {
  let entity = new UpdateInterestRate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldRate = event.params.oldRate
  entity.newRate = event.params.newRate

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
