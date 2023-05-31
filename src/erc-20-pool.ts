import { BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import {
  AddCollateral as AddCollateralEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  ApproveLPTransferors as ApproveLPTransferorsEvent,
  AuctionNFTSettle as AuctionNFTSettleEvent,
  AuctionSettle as AuctionSettleEvent,
  BondWithdrawn as BondWithdrawnEvent,
  BucketBankruptcy as BucketBankruptcyEvent,
  BucketTake as BucketTakeEvent,
  BucketTakeLPAwarded as BucketTakeLPAwardedEvent,
  DecreaseLPAllowance as DecreaseLPAllowanceEvent,
  DrawDebt as DrawDebtEvent,
  Flashloan as FlashloanEvent,
  IncreaseLPAllowance as IncreaseLPAllowanceEvent,
  Kick as KickEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  LoanStamped as LoanStampedEvent,
  MoveQuoteToken as MoveQuoteTokenEvent,
  RemoveCollateral as RemoveCollateralEvent,
  RemoveQuoteToken as RemoveQuoteTokenEvent,
  RepayDebt as RepayDebtEvent,
  ReserveAuction as ReserveAuctionEvent,
  ResetInterestRate as ResetInterestRateEvent,
  RevokeLPAllowance as RevokeLPAllowanceEvent,
  RevokeLPTransferors as RevokeLPTransferorsEvent,
  Settle as SettleEvent,
  Take as TakeEvent,
  TransferLP as TransferLPEvent,
  UpdateInterestRate as UpdateInterestRateEvent
} from "../generated/templates/ERC20Pool/ERC20Pool"
import {
  Account,
  AddCollateral,
  AddQuoteToken,
  AuctionNFTSettle,
  AuctionSettle,
  BondWithdrawn,
  Bucket,
  BucketBankruptcy,
  BucketTake,
  BucketTakeLPAwarded,
  DrawDebt,
  Flashloan,
  Kick,
  Lend,
  LiquidationAuction,
  Loan,
  LoanStamped,
  MoveQuoteToken,
  Pool,
  RemoveCollateral,
  RemoveQuoteToken,
  RepayDebt,
  ReserveAuction,
  ReserveAuctionKick,
  ReserveAuctionTake,
  Settle,
  Take,
  Token,
  TransferLP,
  UpdateInterestRate
} from "../generated/schema"

import { ZERO_BD, ONE_BI, TEN_BI, positionManagerNetworkLookUpTable } from "./utils/constants"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles, updateAccountReserveAuctions } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/bucket"
import { getLendId, loadOrCreateLend } from "./utils/lend"
import { getBorrowerInfo, getLoanId, loadOrCreateLoan } from "./utils/loan"
import { getBucketTakeLPAwardedId, getLiquidationAuctionId, getAuctionInfoERC20Pool, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus } from "./utils/liquidation"
import { getBurnInfo, getCurrentBurnEpoch, updatePool, addLiquidationToPool, addReserveAuctionToPool, getLenderInfo, getLenderInterestMargin } from "./utils/pool"
import { collateralizationAtLup, lpbValueInQuote, thresholdPrice } from "./utils/common"
import { getReserveAuctionId, loadOrCreateReserveAuction, reserveAuctionKickerReward } from "./utils/reserve-auction"
import { incrementTokenTxCount } from "./utils/token-erc20"
import { approveTransferors, loadOrCreateTransferors, revokeTransferors } from "./utils/lp-transferors"
import { loadOrCreateAllowances, increaseAllowances, decreaseAllowances, revokeAllowances } from "./utils/lp-allowances"
import { wmul } from "./utils/math"

export function handleAddCollateral(event: AddCollateralEvent): void {
  const addCollateral = new AddCollateral(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  addCollateral.actor = event.params.actor
  addCollateral.index = event.params.index.toU32()
  addCollateral.amount = wadToDecimal(event.params.amount)
  addCollateral.lpAwarded = wadToDecimal(event.params.lpAwarded)

  addCollateral.blockNumber = event.block.number
  addCollateral.blockTimestamp = event.block.timestamp
  addCollateral.transactionHash = event.transaction.hash

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
    const accountId = addressToBytes(event.params.actor)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, addCollateral.actor)
    lend.lpb             = lend.lpb.plus(addCollateral.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    // update account's list of pools and lends if necessary
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()

    addCollateral.bucket = bucket.id
    addCollateral.pool = pool.id
  }

  addCollateral.save()
}

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

  // update entities
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

export function handleApproveLPTransferors(
  event: ApproveLPTransferorsEvent
): void {
  const poolId = addressToBytes(event.address)
  const entity = loadOrCreateTransferors(poolId, event.params.lender)
  approveTransferors(entity, event.params.transferors)

  entity.save()
}

// TODO: ERC721Pool only (doesn't belong here)
export function handleAuctionNFTSettle(event: AuctionNFTSettleEvent): void {
  const entity = new AuctionNFTSettle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.collateral = wadToDecimal(event.params.collateral)
  entity.lp = wadToDecimal(event.params.lp)
  entity.index = event.params.index.toU32()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

// ERC20Pool only
// emitted in conjunction with Settle
export function handleAuctionSettle(event: AuctionSettleEvent): void {
  const auctionSettle = new AuctionSettle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  auctionSettle.borrower = event.params.borrower
  auctionSettle.collateral = wadToDecimal(event.params.collateral)

  auctionSettle.blockNumber = event.block.number
  auctionSettle.blockTimestamp = event.block.timestamp
  auctionSettle.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!
  // pool doesn't need to be updated here as it was already updated in the concurrent Settle event

  // update auction state
  const loanId       = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan         = Loan.load(loanId)!
  const auctionId    = loan.liquidationAuction!
  const auction      = LiquidationAuction.load(auctionId)!
  auction.settle     = auctionSettle.id
  auction.settleTime = auctionSettle.blockTimestamp
  auction.settled    = true
  auction.save()

  // update loan state
  loan.debt = ZERO_BD
  loan.collateralPledged = auctionSettle.collateral
  loan.inLiquidation = false
  loan.collateralization = ZERO_BD
  loan.tp = ZERO_BD
  loan.save()

  // update auctionSettle pointers
  auctionSettle.pool = pool.id
  auctionSettle.loan = loan.id
  auctionSettle.save()
}

export function handleBondWithdrawn(event: BondWithdrawnEvent): void {
  const entity = new BondWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.kicker = event.params.kicker
  entity.reciever = event.params.reciever
  entity.amount = wadToDecimal(event.params.amount)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBucketBankruptcy(event: BucketBankruptcyEvent): void {
  const bucketBankruptcy = new BucketBankruptcy(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  bucketBankruptcy.index = event.params.index.toU32()
  bucketBankruptcy.lpForfeited = wadToDecimal(event.params.lpForfeited)

  bucketBankruptcy.blockNumber = event.block.number
  bucketBankruptcy.blockTimestamp = event.block.timestamp
  bucketBankruptcy.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)

    // update bucket state to zero out bucket contents
    const bucketId      = getBucketId(pool.id, event.params.index.toU32())
    const bucket        = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
    bucket.collateral   = ZERO_BD
    bucket.deposit      = ZERO_BD
    bucket.lpb          = ZERO_BD
    bucket.exchangeRate = ZERO_BD

    bucketBankruptcy.bucket = bucketId
    bucketBankruptcy.pool = pool.id

    // TODO: update Lends

    // save entities to store
    pool.save()
    bucket.save()
  }

  bucketBankruptcy.save()
}

export function handleBucketTake(event: BucketTakeEvent): void {
  const bucketTake = new BucketTake(
    event.transaction.hash.concatI32(event.block.number.toI32())
  )
  bucketTake.borrower   = event.params.borrower
  bucketTake.taker      = event.transaction.from
  bucketTake.index      = event.params.index.toU32()
  bucketTake.amount     = wadToDecimal(event.params.amount)
  bucketTake.collateral = wadToDecimal(event.params.collateral)
  bucketTake.bondChange = wadToDecimal(event.params.bondChange)
  bucketTake.isReward   = event.params.isReward

  bucketTake.blockNumber     = event.block.number
  bucketTake.blockTimestamp  = event.block.timestamp
  bucketTake.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!

  // update pool state
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update taker account state
  const account   = loadOrCreateAccount(bucketTake.taker)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountTakes(account, bucketTake.id)
  updateAccountPools(account, pool)

  // update loan state
  const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan = loadOrCreateLoan(loanId, pool.id, addressToBytes(event.params.borrower))
  loan.debt = loan.debt.minus(wadToDecimal(event.params.amount))
  loan.collateralPledged = loan.collateralPledged.minus(wadToDecimal(event.params.collateral))
  if (loan.debt.notEqual(ZERO_BD) && loan.collateralPledged.notEqual(ZERO_BD)) {
    loan.collateralization = collateralizationAtLup(loan.debt, loan.collateralPledged, pool.lup)
    loan.tp                = thresholdPrice(loan.debt, loan.collateralPledged)
  } else {
    // set collateralization and tp to zero if loan is fully repaid
    loan.collateralization = ZERO_BD
    loan.tp = ZERO_BD
  }

  // retrieve auction information on the take's auction
  const auctionInfo   = getAuctionInfoERC20Pool(bucketTake.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)

  // update liquidation auction state
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  updateLiquidationAuction(auction, auctionInfo, auctionStatus)
  auction.debtRemaining = auction.debtRemaining.minus(wadToDecimal(event.params.amount))
  auction.collateralRemaining = auction.collateralRemaining.minus(wadToDecimal(event.params.collateral))
  auction.bucketTakes = auction.bucketTakes.concat([bucketTake.id])

  bucketTake.auctionPrice = wadToDecimal(auctionStatus.price)

  // update kick and pool for the change in bond as a result of the take
  const kick = Kick.load(auction.kick)!
  if (bucketTake.isReward) {
    // reward kicker if take is below neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.plus(wadToDecimal(event.params.bondChange))
  } else {
    // penalize kicker if take is above neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.minus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.minus(wadToDecimal(event.params.bondChange))
  }

  // update bucketTake pointers
  bucketTake.liquidationAuction = auction.id
  bucketTake.loan = loanId
  bucketTake.pool = pool.id

  // save entities to the store
  account.save()
  auction.save()
  loan.save()
  pool.save()
  bucketTake.save()
}

export function handleBucketTakeLPAwarded(
  event: BucketTakeLPAwardedEvent
): void {
  const bucketTakeLpAwarded = new BucketTakeLPAwarded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  bucketTakeLpAwarded.taker = event.params.taker
  bucketTakeLpAwarded.kicker = event.params.kicker
  bucketTakeLpAwarded.lpAwardedTaker = wadToDecimal(event.params.lpAwardedTaker)
  bucketTakeLpAwarded.lpAwardedKicker = wadToDecimal(event.params.lpAwardedKicker)

  bucketTakeLpAwarded.blockNumber = event.block.number
  bucketTakeLpAwarded.blockTimestamp = event.block.timestamp
  bucketTakeLpAwarded.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // pool doesn't need to be updated as it was already updated in the concurrent BucketTake event

    // load BucketTake entity to access the index used for bucketTake
    const bucketTakeId = getBucketTakeLPAwardedId(event.transaction.hash, event.logIndex)
    const bucketTake = BucketTake.load(bucketTakeId)!

    // update bucket state
    const bucketId   = getBucketId(pool.id, bucketTake.index)
    const bucket     = loadOrCreateBucket(pool.id, bucketId, bucketTake.index)
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update lend state for kicker
    const kickerLendId = getLendId(bucketId, bucketTakeLpAwarded.kicker)
    const kickerLend = loadOrCreateLend(bucketId, kickerLendId, pool.id, bucketTakeLpAwarded.kicker)
    kickerLend.lpb             = kickerLend.lpb.plus(bucketTakeLpAwarded.lpAwardedTaker)
    kickerLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, kickerLend.lpb)

    // update kicker account state if they weren't a lender already
    const kickerAccountId = bucketTakeLpAwarded.kicker
    const kickerAccount   = loadOrCreateAccount(kickerAccountId)
    updateAccountLends(kickerAccount, kickerLend)

    // update lend state for taker
    const takerLendId = getLendId(bucketId, bucketTakeLpAwarded.taker)
    const takerLend = loadOrCreateLend(bucketId, takerLendId, pool.id, bucketTakeLpAwarded.taker)
    takerLend.lpb             = takerLend.lpb.plus(bucketTakeLpAwarded.lpAwardedTaker)
    takerLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, takerLend.lpb)

    // save entities to store
    bucket.save()
    kickerAccount.save()
    kickerLend.save()
    takerLend.save()
    pool.save()

    bucketTakeLpAwarded.pool = pool.id
  }

  bucketTakeLpAwarded.save()
}

export function handleDecreaseLPAllowance(event: DecreaseLPAllowanceEvent): void {
  const poolId = addressToBytes(event.address)
  const lender = event.transaction.from
  const entity = loadOrCreateAllowances(poolId, lender, event.params.spender)
  decreaseAllowances(entity, event.params.indexes, event.params.amounts)

  const pool = Pool.load(poolId)
  if (pool != null) {
    pool.txCount = pool.txCount.plus(ONE_BI)
    pool.save()
  }

  entity.save()
}

export function handleDrawDebt(event: DrawDebtEvent): void {
  const drawDebt = new DrawDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  drawDebt.borrower          = event.params.borrower
  drawDebt.amountBorrowed    = wadToDecimal(event.params.amountBorrowed)
  drawDebt.collateralPledged = wadToDecimal(event.params.collateralPledged)
  drawDebt.lup               = wadToDecimal(event.params.lup)

  drawDebt.blockNumber = event.block.number
  drawDebt.blockTimestamp = event.block.timestamp
  drawDebt.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    pool.debt       = pool.debt.plus(wadToDecimal(event.params.amountBorrowed))
    pool.pledgedCollateral = pool.pledgedCollateral.plus(wadToDecimal(event.params.collateralPledged))
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update account state
    const accountId = addressToBytes(event.params.borrower)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update loan state
    const loanId = getLoanId(pool.id, accountId)
    const loan = loadOrCreateLoan(loanId, pool.id, drawDebt.borrower)
    loan.collateralPledged = loan.collateralPledged.plus(wadToDecimal(event.params.collateralPledged))
    loan.debt              = loan.debt.plus(wadToDecimal(event.params.amountBorrowed))
    loan.collateralization = collateralizationAtLup(loan.debt, loan.collateralPledged, pool.lup)
    loan.tp                = thresholdPrice(loan.debt, loan.collateralPledged)

    // update account's list of pools and loans if necessary
    updateAccountPools(account, pool)
    updateAccountLoans(account, loan)

    // save entities to store
    pool.save()
    account.save()
    loan.save()

    drawDebt.pool = pool.id
  }

  drawDebt.save()
}

export function handleFlashloan(event: FlashloanEvent): void {
  const flashloan = new Flashloan(event.transaction.hash.concatI32(event.logIndex.toI32()))
  const pool = Pool.load(addressToBytes(event.address))!
  const token = Token.load(addressToBytes(event.params.token))!
  const scaleFactor = TEN_BI.pow(18 - token.decimals as u8)

  flashloan.pool = pool.id
  flashloan.borrower = event.params.receiver

  const normalizedAmount = wadToDecimal(event.params.amount.times(scaleFactor))
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

export function handleIncreaseLPAllowance(event: IncreaseLPAllowanceEvent): void {
  const poolId = addressToBytes(event.address)
  const lender = event.transaction.from
  const entity = loadOrCreateAllowances(poolId, lender, event.params.spender)
  increaseAllowances(entity, event.params.indexes, event.params.amounts)

  const pool = Pool.load(poolId)
  if (pool != null) {
    pool.txCount = pool.txCount.plus(ONE_BI)
    pool.save()
  }

  entity.save()
}

export function handleKick(event: KickEvent): void {
  const kick = new Kick(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  kick.borrower   = event.params.borrower
  kick.debt       = wadToDecimal(event.params.debt)
  kick.collateral = wadToDecimal(event.params.collateral)
  kick.bond       = wadToDecimal(event.params.bond)
  kick.locked     = kick.bond
  kick.claimable  = ZERO_BD

  kick.blockNumber = event.block.number
  kick.blockTimestamp = event.block.timestamp
  kick.transactionHash = event.transaction.hash

  kick.kicker = event.transaction.from

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!

  // update pool state
  updatePool(pool)
  pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bond))
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update kicker account state
  const account   = loadOrCreateAccount(kick.kicker)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountKicks(account, kick)
  updateAccountPools(account, pool)

  // update loan state
  const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan = loadOrCreateLoan(loanId, pool.id, kick.borrower)
  loan.inLiquidation     = true
  loan.collateralPledged = kick.collateral
  loan.debt              = kick.debt // update loan debt to account for kick penalty
  loan.collateralization = collateralizationAtLup(loan.debt, loan.collateralPledged, pool.lup)
  loan.tp                = thresholdPrice(loan.debt, loan.collateralPledged)

  // retrieve auction information on the kicked loan
  const auctionInfo = getAuctionInfoERC20Pool(kick.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)

  // update liquidation auction state
  const auctionId = getLiquidationAuctionId(pool.id, loan.id, kick.blockNumber)
  const auction = loadOrCreateLiquidationAuction(pool.id, auctionId, kick, loan)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus)

  kick.kickMomp = wadToDecimal(auctionInfo.kickMomp)
  kick.startingPrice = wadToDecimal(auctionStatus.price)
  kick.pool = pool.id
  kick.loan = loan.id
  kick.liquidationAuction = auctionId
  loan.liquidationAuction = auctionId

  // track new liquidation auction at the pool level
  addLiquidationToPool(pool, auction)

  // save entities to store
  account.save()
  auction.save()
  loan.save()
  pool.save()
  kick.save()
}

export function handleLoanStamped(event: LoanStampedEvent): void {
  const entity = new LoanStamped(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.pool = addressToBytes(event.address)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
}

export function handleMoveQuoteToken(event: MoveQuoteTokenEvent): void {
  const moveQuoteToken = new MoveQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  moveQuoteToken.lender         = event.params.lender
  moveQuoteToken.amount         = wadToDecimal(event.params.amount)
  moveQuoteToken.lpRedeemedFrom = wadToDecimal(event.params.lpRedeemedFrom)
  moveQuoteToken.lpAwardedTo    = wadToDecimal(event.params.lpAwardedTo)
  moveQuoteToken.lup            = wadToDecimal(event.params.lup)

  moveQuoteToken.blockNumber = event.block.number
  moveQuoteToken.blockTimestamp = event.block.timestamp
  moveQuoteToken.transactionHash = event.transaction.hash

  // update entities
  const fromIndex = event.params.from.toU32()
  const toIndex = event.params.to.toU32()
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update from bucket state
    const fromBucketId = getBucketId(pool.id, event.params.from.toU32())
    const fromBucket = loadOrCreateBucket(pool.id, fromBucketId, fromIndex)
    const fromBucketInfo = getBucketInfo(pool.id, fromIndex)
    fromBucket.collateral   = wadToDecimal(fromBucketInfo.collateral)
    fromBucket.deposit      = wadToDecimal(fromBucketInfo.quoteTokens)
    fromBucket.lpb          = wadToDecimal(fromBucketInfo.lpb)
    fromBucket.exchangeRate = wadToDecimal(fromBucketInfo.exchangeRate)

    // update to bucket state
    const toBucketId = getBucketId(pool.id, event.params.to.toU32())
    const toBucket = loadOrCreateBucket(pool.id, toBucketId, toIndex)
    const toBucketInfo = getBucketInfo(pool.id, toIndex)
    toBucket.collateral   = wadToDecimal(toBucketInfo.collateral)
    toBucket.deposit      = wadToDecimal(toBucketInfo.quoteTokens)
    toBucket.lpb          = wadToDecimal(toBucketInfo.lpb)
    toBucket.exchangeRate = wadToDecimal(toBucketInfo.exchangeRate)

    // update from bucket lend state
    const fromBucketLendId = getLendId(fromBucketId, event.params.lender)
    const fromBucketLend = loadOrCreateLend(fromBucketId, fromBucketLendId, pool.id, moveQuoteToken.lender)
    const lpRedeemedFrom = wadToDecimal(event.params.lpRedeemedFrom)
    if (lpRedeemedFrom.le(fromBucketLend.lpb)) {
      fromBucketLend.lpb = fromBucketLend.lpb.minus(lpRedeemedFrom)
    } else {
      log.warning('handleMoveQuoteToken: lender {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0', 
                  [moveQuoteToken.lender.toHexString(), lpRedeemedFrom.toString(), fromBucketLend.lpb.toString()])
      fromBucketLend.lpb = ZERO_BD
    }
    fromBucketLend.lpbValueInQuote = lpbValueInQuote(pool.id, fromBucket.bucketIndex, fromBucketLend.lpb)

    // update to bucket lend state
    const toBucketLendId = getLendId(toBucketId, event.params.lender)
    const toBucketLend = loadOrCreateLend(toBucketId, toBucketLendId, pool.id, moveQuoteToken.lender)
    toBucketLend.lpb = toBucketLend.lpb.plus(wadToDecimal(event.params.lpAwardedTo))
    toBucketLend.lpbValueInQuote = lpbValueInQuote(pool.id, toBucket.bucketIndex, toBucketLend.lpb)

    // update account state
    const accountId = addressToBytes(event.params.lender)
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

    moveQuoteToken.from = fromBucketId
    moveQuoteToken.to = toBucketId
    moveQuoteToken.pool = pool.id
  }

  moveQuoteToken.save()
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
    const accountId = removeCollateral.claimer
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, removeCollateral.claimer)
    if (removeCollateral.lpRedeemed.le(lend.lpb)) {
      lend.lpb = lend.lpb.minus(removeCollateral.lpRedeemed)
    } else {
      log.warning('handleRemoveCollateral: claimer {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0', 
                  [removeCollateral.claimer.toHexString(), removeCollateral.lpRedeemed.toString(), lend.lpb.toString()])
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

    removeCollateral.bucket = bucket.id
    removeCollateral.pool = pool.id
  }

  removeCollateral.save()
}

export function handleRemoveQuoteToken(event: RemoveQuoteTokenEvent): void {
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

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    pool.pledgedCollateral = pool.pledgedCollateral.minus(wadToDecimal(event.params.collateralPulled))
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update account state
    const accountId = addressToBytes(event.params.borrower)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update loan state
    const loanId           = getLoanId(pool.id, accountId)
    const loan             = loadOrCreateLoan(loanId, pool.id, repayDebt.borrower)
    const borrowerInfo     = getBorrowerInfo(accountId, pool.id)
    loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
    loan.debt              = wadToDecimal(borrowerInfo.debt)
    loan.collateralization = collateralizationAtLup(loan.debt, loan.collateralPledged, pool.lup)
    loan.tp                = thresholdPrice(loan.debt, loan.collateralPledged)

    // update account loans if necessary
    updateAccountLoans(account, loan)

    // save entities to store
    account.save()
    pool.save()
    loan.save()

    repayDebt.pool = pool.id
  }

  repayDebt.save()
}


// called on both start and take reserves
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
  reserveAuction.auctionPrice = reserveKick.startingPrice
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

// called on both start and take reserves
export function handleReserveAuctionTake(event: ReserveAuctionEvent): void {
  const reserveTake = new ReserveAuctionTake(
    event.transaction.hash.concat(event.transaction.from)
  )
  const pool           = Pool.load(addressToBytes(event.address))!
  const reserveAuction = loadOrCreateReserveAuction(pool.id, event.params.currentBurnEpoch)

  reserveTake.taker                      = event.transaction.from
  reserveTake.reserveAuction             = reserveAuction.id
  reserveTake.pool                       = pool.id
  reserveTake.claimableReservesRemaining = wadToDecimal(event.params.claimableReservesRemaining)
  reserveTake.auctionPrice               = wadToDecimal(event.params.auctionPrice)

  // retrieve ajna burn information from the pool
  const burnInfo = getBurnInfo(pool, event.params.currentBurnEpoch)
  // update burn information of the reserve auction take
  // since only one reserve auction can occur at a time, look at the difference since the last reserve auction
  reserveTake.ajnaBurned = wadToDecimal(burnInfo.totalBurned).minus(pool.totalAjnaBurned)
  reserveAuction.claimableReservesRemaining = reserveTake.claimableReservesRemaining
  reserveAuction.auctionPrice               = reserveTake.auctionPrice
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
  incrementTokenTxCount(pool)

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

export function handleResetInterestRate(event: ResetInterestRateEvent): void {
  const resetInterestRate = new UpdateInterestRate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  const poolAddress = addressToBytes(event.address)
  const pool = Pool.load(poolAddress)!
  const lenderInterestMargin = getLenderInterestMargin(poolAddress)

  resetInterestRate.pool = pool.id
  resetInterestRate.oldBorrowRate = pool.borrowRate
  resetInterestRate.oldLendRate = pool.lendRate
  resetInterestRate.newBorrowRate = wadToDecimal(event.params.newRate)
  resetInterestRate.newLendRate = wadToDecimal(wmul(event.params.newRate, lenderInterestMargin))

  resetInterestRate.blockNumber = event.block.number
  resetInterestRate.blockTimestamp = event.block.timestamp
  resetInterestRate.transactionHash = event.transaction.hash

  // update pool state
  updatePool(pool)
  pool.borrowRate = resetInterestRate.newBorrowRate
  pool.lendRate = resetInterestRate.newLendRate
  pool.txCount = pool.txCount.plus(ONE_BI)

  // save entities to the store
  pool.save()
  resetInterestRate.save()
}

export function handleRevokeLPAllowance(event: RevokeLPAllowanceEvent): void {
  const poolId = addressToBytes(event.address)
  const lender = event.transaction.from
  const entity = loadOrCreateAllowances(poolId, lender, event.params.spender)
  revokeAllowances(entity, event.params.indexes)

  const pool = Pool.load(poolId)
  if (pool != null) {
    pool.txCount = pool.txCount.plus(ONE_BI)
    pool.save()
  }

  entity.save()
}

export function handleRevokeLPTransferors(
  event: RevokeLPTransferorsEvent
): void {
  const poolId = addressToBytes(event.address)
  const entity = loadOrCreateTransferors(poolId, event.params.lender)
  revokeTransferors(entity, event.params.transferors)

  const pool = Pool.load(poolId)
  if (pool != null) {
    pool.txCount = pool.txCount.plus(ONE_BI)
    pool.save()
  }

  entity.save()
}

export function handleTake(event: TakeEvent): void {
  const take = new Take(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  take.borrower   = event.params.borrower
  take.taker      = event.transaction.from
  take.amount     = wadToDecimal(event.params.amount)
  take.collateral = wadToDecimal(event.params.collateral)
  take.bondChange = wadToDecimal(event.params.bondChange)
  take.isReward   = event.params.isReward

  take.blockNumber = event.block.number
  take.blockTimestamp = event.block.timestamp
  take.transactionHash = event.transaction.hash

  // update pool state
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update taker account state
  const account   = loadOrCreateAccount(take.taker)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountTakes(account, take.id)
  updateAccountPools(account, pool)

  // update loan state
  const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan = Loan.load(loanId)!
  loan.debt = loan.debt.minus(wadToDecimal(event.params.amount))
  loan.collateralPledged = loan.collateralPledged.minus(wadToDecimal(event.params.collateral))
  if (loan.debt.notEqual(ZERO_BD) && loan.collateralPledged.notEqual(ZERO_BD)) {
    loan.collateralization = collateralizationAtLup(loan.debt, loan.collateralPledged, pool.lup)
    loan.tp                = thresholdPrice(loan.debt, loan.collateralPledged)
  } else {
    // set collateralization and tp to zero if loan is fully repaid
    loan.collateralization = ZERO_BD
    loan.tp = ZERO_BD
  }

  // update liquidation auction state
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  auction.takes = auction.takes.concat([take.id])
  const auctionInfo = getAuctionInfoERC20Pool(take.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus)

  const debtCovered           = wadToDecimal(event.params.amount)
  auction.debtRemaining       = auction.debtRemaining.minus(debtCovered)
  const collateralPurchased   = wadToDecimal(event.params.collateral)
  auction.collateralRemaining = auction.collateralRemaining.minus(collateralPurchased)
  pool.pledgedCollateral      = pool.pledgedCollateral.minus(collateralPurchased)
  take.auctionPrice           = wadToDecimal(auctionStatus.price)

  // update kick and pool for the change in bond as a result of the take
  const kick = Kick.load(auction.kick)!
  if (take.isReward) {
    // reward kicker if take is below neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.plus(wadToDecimal(event.params.bondChange))
  } else {
    // penalize kicker if take is above neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.minus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.minus(wadToDecimal(event.params.bondChange))
  }

  // update take pointers
  take.liquidationAuction = auction.id
  take.loan = loanId
  take.pool = pool.id

  // save entities to the store
  account.save()
  auction.save()
  loan.save()
  pool.save()
  take.save()
}

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
  const auctionInfo = getAuctionInfoERC20Pool(settle.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus, true)
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

export function handleTransferLP(event: TransferLPEvent): void {
  const entity = new TransferLP(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner    = addressToBytes(event.params.owner)
  entity.newOwner = addressToBytes(event.params.newOwner)
  entity.indexes  = bigIntArrayToIntArray(event.params.indexes)
  entity.lp       = wadToDecimal(event.params.lp)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  const poolId = addressToBytes(event.address)
  const pool = Pool.load(poolId)!

  // do not meddle with Lends if transfer is due to memorializing/dememorializing a position
  const positionManagerAddress = addressToBytes(positionManagerNetworkLookUpTable.get(dataSource.network())!)
  log.info("handleTransferLP from {} to {}" , [entity.owner.toHexString(), entity.newOwner.toHexString()])
  if (entity.newOwner !== positionManagerAddress && entity.owner !== positionManagerAddress) {
    log.info("handleTransferLP owner/newOwner does not match PositionManager address {}", [positionManagerAddress.toHexString()])
    // update Lends for old and new owners, creating entities where necessary
    const oldOwnerAccount = Account.load(entity.owner)!
    const newOwnerAccount = loadOrCreateAccount(entity.newOwner)
    for (var i=0; i<event.params.indexes.length; ++i) {
      const bucketIndex = event.params.indexes[i]
      const bucketId = getBucketId(poolId, bucketIndex.toU32())
      const bucket = Bucket.load(bucketId)!
      const oldLendId = getLendId(bucketId, entity.owner)
      const newLendId = getLendId(bucketId, entity.newOwner)

      // event does not reveal LP amounts transferred for each bucket, so query the pool and update
      // remove old lend
      const oldLend = Lend.load(oldLendId)!
      oldLend.lpb = wadToDecimal(getLenderInfo(pool.id, bucketIndex, event.params.owner).lpBalance)
      oldLend.lpbValueInQuote = lpbValueInQuote(poolId, bucket.bucketIndex, oldLend.lpb)
      updateAccountLends(oldOwnerAccount, Lend.load(oldLendId)!)
      oldLend.save()

      // add new lend
      const newLend = loadOrCreateLend(bucketId, newLendId, poolId, entity.newOwner)
      newLend.lpb = wadToDecimal(getLenderInfo(pool.id, bucketIndex, event.params.newOwner).lpBalance)
      newLend.lpbValueInQuote = lpbValueInQuote(poolId, bucket.bucketIndex, newLend.lpb)
      updateAccountLends(newOwnerAccount, newLend)
      newLend.save()
    }
    oldOwnerAccount.save()
    newOwnerAccount.save()
  } else {
    log.info("handleTransferLP skipping Lend updates for memorializing/dememorializing a position", [])
  }
  
  // increment pool and token tx counts
  pool.txCount = pool.txCount.plus(ONE_BI)
  const quoteToken = Token.load(pool.quoteToken)!
  quoteToken.txCount = quoteToken.txCount.plus(ONE_BI)
  quoteToken.save()
  pool.save()

  entity.save()
}

export function handleUpdateInterestRate(event: UpdateInterestRateEvent): void {
  const updateInterestRate = new UpdateInterestRate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  const poolAddress = addressToBytes(event.address)
  const pool = Pool.load(poolAddress)!
  const lenderInterestMargin = getLenderInterestMargin(poolAddress)

  updateInterestRate.pool = pool.id
  updateInterestRate.oldBorrowRate = pool.borrowRate
  updateInterestRate.oldLendRate = pool.lendRate
  updateInterestRate.newBorrowRate = wadToDecimal(event.params.newRate)
  updateInterestRate.newLendRate = wadToDecimal(wmul(event.params.newRate, lenderInterestMargin))

  updateInterestRate.blockNumber = event.block.number
  updateInterestRate.blockTimestamp = event.block.timestamp
  updateInterestRate.transactionHash = event.transaction.hash

  // update pool state
  updatePool(pool)
  pool.borrowRate = updateInterestRate.newBorrowRate
  pool.lendRate = updateInterestRate.newLendRate
  pool.txCount = pool.txCount.plus(ONE_BI)

  // save entities to the store
  pool.save()
  updateInterestRate.save()
}
