import { log } from "@graphprotocol/graph-ts"

import {
  AddCollateral as AddCollateralEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  ApproveLPTransferors as ApproveLPTransferorsEvent,
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
} from "../../generated/templates/ERC20Pool/ERC20Pool"
import {
  AddCollateral,
  AuctionSettle,
  BondWithdrawn,
  BucketTake,
  BucketTakeLPAwarded,
  DrawDebt,
  Kick,
  LiquidationAuction,
  Loan,
  Pool,
  RemoveCollateral,
  RepayDebt,
  Settle,
  Take
} from "../../generated/schema"

import { ZERO_BD, ONE_BI } from "../utils/constants"
import { addressToBytes, wadToDecimal } from "../utils/convert"
import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles } from "../utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket, updateBucketLends } from "../utils/pool/bucket"
import { getLendId, loadOrCreateLend, saveOrRemoveLend } from "../utils/pool/lend"
import { getBorrowerInfo, getLoanId, loadOrCreateLoan, saveOrRemoveLoan } from "../utils/pool/loan"
import { getLiquidationAuctionId, getAuctionInfoERC20Pool, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus, loadOrCreateBucketTake } from "../utils/pool/liquidation"
import { updatePool, addLiquidationToPool } from "../utils/pool/pool"
import { lpbValueInQuote } from "../utils/pool/lend"
import { incrementTokenTxCount } from "../utils/token-erc20"
import { _handleAddQuoteToken, _handleApproveLPTransferors, _handleBucketBankruptcy, _handleDecreaseLPAllowance, _handleFlashLoan, _handleIncreaseLPAllowance, _handleInterestRateEvent, _handleLoanStamped, _handleMoveQuoteToken, _handleRemoveQuoteToken, _handleReserveAuctionKick, _handleReserveAuctionTake, _handleRevokeLPAllowance, _handleRevokeLPTransferors, _handleTransferLP } from "./base/base-pool"

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
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, addCollateral.actor)
    lend.depositTime     = addCollateral.blockTimestamp
    lend.lpb             = lend.lpb.plus(addCollateral.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)
    updateBucketLends(bucket, lend)

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

    addCollateral.bucket = bucket.id
    addCollateral.pool = pool.id
  }

  addCollateral.save()
}

export function handleAddQuoteToken(event: AddQuoteTokenEvent): void {
  // TODO: get compiler to ignore this line's INFO output
  event = changetype<AddQuoteTokenEvent | null>(event)!
  _handleAddQuoteToken(event, null)
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
  loan.t0debt = ZERO_BD
  loan.collateralPledged = auctionSettle.collateral
  loan.inLiquidation = false

  // remove loan from store if necessary
  saveOrRemoveLoan(loan)

  // update auctionSettle pointers and save to store
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
  _handleBucketBankruptcy(event, event.params.index, event.params.lpForfeited)
}

export function handleBucketTake(event: BucketTakeEvent): void {
  const bucketTakeId      = event.transaction.hash.concatI32(event.logIndex.toI32());
  const bucketTake        = BucketTake.load(bucketTakeId)!
  bucketTake.borrower     = event.params.borrower
  bucketTake.taker        = event.transaction.from
  bucketTake.index        = event.params.index.toU32()
  bucketTake.amount       = wadToDecimal(event.params.amount)
  bucketTake.collateral   = wadToDecimal(event.params.collateral)
  bucketTake.auctionPrice = bucketTake.amount.div(bucketTake.collateral)
  bucketTake.bondChange   = wadToDecimal(event.params.bondChange)
  bucketTake.isReward     = event.params.isReward

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
  const borrowerInfo     = getBorrowerInfo(addressToBytes(event.params.borrower), pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

  // retrieve auction information on the take's auction
  const auctionInfo   = getAuctionInfoERC20Pool(bucketTake.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)

  // update liquidation auction state
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  updateLiquidationAuction(auction, auctionInfo, auctionStatus, bucketTake.auctionPrice)
  auction.bucketTakes = auction.bucketTakes.concat([bucketTake.id])

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

  // update bucket state
  const bucketId      = getBucketId(pool.id, bucketTake.index)
  const bucket        = loadOrCreateBucket(pool.id, bucketId, bucketTake.index)
  const bucketInfo    = getBucketInfo(pool.id, bucket.bucketIndex)
  bucket.collateral   = wadToDecimal(bucketInfo.collateral)
  bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
  bucket.lpb          = wadToDecimal(bucketInfo.lpb)
  bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

  // update lend state for kicker
  const lpAwardedId          = event.transaction.hash.concatI32(event.logIndex.toI32() - 1);
  const bucketTakeLpAwarded  = BucketTakeLPAwarded.load(lpAwardedId)!
  const kickerLendId         = getLendId(bucketId, bucketTakeLpAwarded.kicker)
  const kickerLend           = loadOrCreateLend(bucketId, kickerLendId, pool.id, bucket.bucketIndex, bucketTakeLpAwarded.kicker)
  kickerLend.depositTime     = bucketTake.blockTimestamp
  kickerLend.lpb             = kickerLend.lpb.plus(bucketTakeLpAwarded.lpAwardedKicker)
  kickerLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, kickerLend.lpb)
  updateBucketLends(bucket, kickerLend)

  // update kicker account state if they weren't a lender already
  const kickerAccountId = bucketTakeLpAwarded.kicker
  const kickerAccount   = loadOrCreateAccount(kickerAccountId)
  updateAccountLends(kickerAccount, kickerLend)

  // update lend state for taker
  const takerLendId         = getLendId(bucketId, bucketTakeLpAwarded.taker)
  const takerLend           = loadOrCreateLend(bucketId, takerLendId, pool.id, bucket.bucketIndex, bucketTakeLpAwarded.taker)
  takerLend.depositTime     = bucketTake.blockTimestamp
  takerLend.lpb             = takerLend.lpb.plus(bucketTakeLpAwarded.lpAwardedTaker)
  takerLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, takerLend.lpb)
  updateBucketLends(bucket, takerLend)

  // update bucketTake pointers
  bucketTake.liquidationAuction = auction.id
  bucketTake.loan = loanId
  bucketTake.pool = pool.id

  // save entities to the store
  account.save()
  auction.save()
  bucket.save()
  bucketTake.save()
  loan.save()
  pool.save()
  kick.save()
  kickerAccount.save()
  kickerLend.save()
  takerLend.save()
}

export function handleBucketTakeLPAwarded(
  event: BucketTakeLPAwardedEvent
): void {
  const lpAwardedId                   = event.transaction.hash.concatI32(event.logIndex.toI32());
  const bucketTakeLpAwarded           = new BucketTakeLPAwarded(lpAwardedId)
  bucketTakeLpAwarded.taker           = event.params.taker
  bucketTakeLpAwarded.pool            = addressToBytes(event.address)
  bucketTakeLpAwarded.kicker          = event.params.kicker
  bucketTakeLpAwarded.lpAwardedTaker  = wadToDecimal(event.params.lpAwardedTaker)
  bucketTakeLpAwarded.lpAwardedKicker = wadToDecimal(event.params.lpAwardedKicker)

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
    const borrowerInfo     = getBorrowerInfo(addressToBytes(event.params.borrower), pool.id)
    loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
    loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

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
  _handleFlashLoan(event, event.params.token, event.params.receiver, event.params.amount)
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
  loan.t0debt            = kick.debt.div(pool.inflator) // update loan debt to account for kick penalty

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
  _handleLoanStamped(event, event.params.borrower)
}

export function handleMoveQuoteToken(event: MoveQuoteTokenEvent): void {
  // TODO: get compiler to ignore this line's INFO output
  event = changetype<MoveQuoteTokenEvent | null>(event)!
  _handleMoveQuoteToken(event, null)
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
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, removeCollateral.claimer)
    if (removeCollateral.lpRedeemed.le(lend.lpb)) {
      lend.lpb = lend.lpb.minus(removeCollateral.lpRedeemed)
    } else {
      log.warning('handleRemoveCollateral: claimer {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0', 
                  [removeCollateral.claimer.toHexString(), removeCollateral.lpRedeemed.toString(), lend.lpb.toString()])
      lend.lpb = ZERO_BD
    }
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    // update bucket and account's list of pools and lends if necessary
    updateBucketLends(bucket, lend)
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)

    // remove lend from store if necessary
    saveOrRemoveLend(lend)

    // save entities to store
    account.save()
    bucket.save()
    pool.save()

    removeCollateral.bucket = bucket.id
    removeCollateral.pool = pool.id
  }

  removeCollateral.save()
}

export function handleRemoveQuoteToken(event: RemoveQuoteTokenEvent): void {
  // TODO: get compiler to ignore this line's INFO output
  event = changetype<RemoveQuoteTokenEvent | null>(event)!
  _handleRemoveQuoteToken(event, null)
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
    repayDebt.pool = pool.id

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
    loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

    // update account loans if necessary
    updateAccountLoans(account, loan)
    // remove loan from store if necessary
    saveOrRemoveLoan(loan)

    // save entities to store
    account.save()
    pool.save()
  }

  repayDebt.save()
}

export function handleTake(event: TakeEvent): void {
  const take = new Take(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  take.borrower     = event.params.borrower
  take.taker        = event.transaction.from
  take.amount       = wadToDecimal(event.params.amount)
  take.collateral   = wadToDecimal(event.params.collateral)
  take.auctionPrice = take.amount.div(take.collateral)
  take.bondChange   = wadToDecimal(event.params.bondChange)
  take.isReward     = event.params.isReward

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
  const loan   = Loan.load(loanId)!
  const borrowerInfo     = getBorrowerInfo(addressToBytes(event.params.borrower), pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

  // update liquidation auction state
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  auction.takes = auction.takes.concat([take.id])
  const auctionInfo = getAuctionInfoERC20Pool(take.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus, take.auctionPrice)

  const collateralPurchased = wadToDecimal(event.params.collateral)
  pool.pledgedCollateral    = pool.pledgedCollateral.minus(collateralPurchased)

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
  kick.save()
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
  updateLiquidationAuction(auction, auctionInfo, auctionStatus)
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

/*************************************/
/*** LPB Management Event Handlers ***/
/*************************************/

export function handleApproveLPTransferors(
  event: ApproveLPTransferorsEvent
): void {
  _handleApproveLPTransferors(event, event.params.lender, event.params.transferors)
}

export function handleDecreaseLPAllowance(event: DecreaseLPAllowanceEvent): void {
  _handleDecreaseLPAllowance(event, event.params.spender, event.params.indexes, event.params.amounts)
}

export function handleIncreaseLPAllowance(event: IncreaseLPAllowanceEvent): void {
  _handleIncreaseLPAllowance(event, event.params.spender, event.params.indexes, event.params.amounts)
}

export function handleRevokeLPAllowance(event: RevokeLPAllowanceEvent): void {
  _handleRevokeLPAllowance(event, event.params.spender, event.params.indexes)
}

export function handleRevokeLPTransferors(
  event: RevokeLPTransferorsEvent
): void {
  _handleRevokeLPTransferors(event, event.params.lender, event.params.transferors)
}

export function handleTransferLP(event: TransferLPEvent): void {
  event = changetype<TransferLPEvent | null>(event)!
  _handleTransferLP(event, null)
}

/***************************/
/*** Pool Event Handlers ***/
/***************************/

export function handleResetInterestRate(event: ResetInterestRateEvent): void {
  _handleInterestRateEvent(event.address, event, event.params.newRate);
}

export function handleUpdateInterestRate(event: UpdateInterestRateEvent): void {
  _handleInterestRateEvent(event.address, event, event.params.newRate);
}

/*******************************/
/*** Reserves Event Handlers ***/
/*******************************/

export function handleReserveAuctionKick(event: KickReserveAuctionEvent): void {
  _handleReserveAuctionKick(event, event.params.currentBurnEpoch, event.params.claimableReservesRemaining, event.params.auctionPrice)
}

export function handleReserveAuctionTake(event: ReserveAuctionEvent): void {
  _handleReserveAuctionTake(event, event.params.currentBurnEpoch, event.params.claimableReservesRemaining, event.params.auctionPrice)
}
