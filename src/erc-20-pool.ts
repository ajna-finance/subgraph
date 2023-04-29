import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"

import {
  AddCollateral as AddCollateralEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  ApproveLpTransferors as ApproveLpTransferorsEvent,
  AuctionNFTSettle as AuctionNFTSettleEvent,
  AuctionSettle as AuctionSettleEvent,
  BondWithdrawn as BondWithdrawnEvent,
  BucketBankruptcy as BucketBankruptcyEvent,
  BucketTake as BucketTakeEvent,
  BucketTakeLPAwarded as BucketTakeLPAwardedEvent,
  DrawDebt as DrawDebtEvent,
  Kick as KickEvent,
  LoanStamped as LoanStampedEvent,
  MoveQuoteToken as MoveQuoteTokenEvent,
  RemoveCollateral as RemoveCollateralEvent,
  RemoveQuoteToken as RemoveQuoteTokenEvent,
  RepayDebt as RepayDebtEvent,
  ReserveAuction as ReserveAuctionEvent,
  RevokeLpAllowance as RevokeLpAllowanceEvent,
  RevokeLpTransferors as RevokeLpTransferorsEvent,
  SetLpAllowance as SetLpAllowanceEvent,
  Settle as SettleEvent,
  Take as TakeEvent,
  TransferLPs as TransferLPsEvent,
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
  ERC20PoolFactory,
  Kick,
  Lend,
  LiquidationAuction,
  LoanStamped,
  MoveQuoteToken,
  Pool,
  RemoveCollateral,
  RemoveQuoteToken,
  RepayDebt,
  ReserveAuctionKickOrTake,
  Settle,
  Take,
  Token,
  TransferLPs,
  UpdateInterestRate
} from "../generated/schema"

import { ZERO_BD, ONE_BI, ERC20_FACTORY_ADDRESS } from "./utils/constants"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles, updateAccountReserveAuctions } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/bucket"
import { getLendId, loadOrCreateLend } from "./utils/lend"
import { getLoanId, loadOrCreateLoan } from "./utils/loan"
import { getBucketTakeLPAwardedId, getLiquidationAuctionId, getAuctionInfoERC20Pool, loadOrCreateLiquidationAuction, updateLiquidationAuction } from "./utils/liquidation"
import { getBurnInfo, getCurrentBurnEpoch, updatePool, addLiquidationToPool, addReserveAuctionToPool, getLenderInfo, getDebtInfo } from "./utils/pool"
import { collateralizationAtLup, lpbValueInQuote, thresholdPrice } from "./utils/common"
import { getReserveAuctionId, loadOrCreateReserveAuction, reserveAuctionKickerReward } from "./utils/reserve-auction"
import { incrementTokenTxCount } from "./utils/token-erc20"
import { approveTransferors, loadOrCreateTransferors, revokeTransferors } from "./utils/lp-transferors"
import { loadOrCreateAllowances, revokeAllowances, setAllowances } from "./utils/lp-allowances"

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
    lend.lpb             = lend.lpb.plus(wadToDecimal(event.params.lpAwarded))
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
    const accountId = addressToBytes(event.params.lender)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, addQuoteToken.lender)
    lend.lpb             = lend.lpb.plus(wadToDecimal(event.params.lpAwarded))
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
  }

  addQuoteToken.save()
}

export function handleApproveLpTransferors(
  event: ApproveLpTransferorsEvent
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
  entity.lps = wadToDecimal(event.params.lps)
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
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // pool doesn't need to be updated here as it was already updated in the concurrent Settle event

    // update auction state
    const loanId       = getLoanId(pool.id, addressToBytes(event.params.borrower))
    const auctionId    = getLiquidationAuctionId(pool.id, loanId, event.block.number)
    const auction      = LiquidationAuction.load(auctionId)!
    auction.settle     = auctionSettle.id
    auction.settleTime = auctionSettle.blockTimestamp
    auction.settled    = true

    // update loan state
    const loan = loadOrCreateLoan(loanId, pool.id, addressToBytes(event.params.borrower))
    loan.debt = ZERO_BD
    loan.collateralPledged = auctionSettle.collateral
    loan.inLiquidation = false
    loan.collateralization = ZERO_BD
    loan.tp = ZERO_BD

    // save entities to the store
    loan.save()

    // update auctionSettle pointer
    auctionSettle.loan = loan.id
  }

  auctionSettle.save()
}

export function handleBlock(block: ethereum.Block): void {
  // HACK: ignore old blocks (DateTime.now is unavailable)
  if (block.timestamp.toI64() < 1682739611) return;

  const factory = ERC20PoolFactory.load(ERC20_FACTORY_ADDRESS);
  if (factory == null) return;

  for (var i = 0; i < factory.pools.length; ++i) {
    const pool = Pool.load(factory.pools[i]);
    if (pool == null) continue;
    const debtInfo = getDebtInfo(pool);
    pool.currentDebt = wadToDecimal(debtInfo.pendingDebt);
    pool.save();
  }
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
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
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
    }
    else {
      // set collateralization and tp to zero if loan is fully repaid
      loan.collateralization = ZERO_BD
      loan.tp = ZERO_BD
    }

    // retrieve auction information on the take's auction
    const auctionInfo = getAuctionInfoERC20Pool(bucketTake.borrower, pool)

    // update liquidation auction state
    const auctionId = getLiquidationAuctionId(pool.id, loan.id, bucketTake.blockNumber)
    const auction = LiquidationAuction.load(auctionId)!
    updateLiquidationAuction(auction, auctionInfo, pool.id)
    auction.debtRemaining = auction.debtRemaining.minus(wadToDecimal(event.params.amount))
    auction.collateralRemaining = auction.collateralRemaining.minus(wadToDecimal(event.params.collateral))
    auction.bucketTakes.push(bucketTake.id)

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
  }

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
    pool.currentDebt       = pool.currentDebt.plus(wadToDecimal(event.params.amountBorrowed))
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
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bond))
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
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

    // update liquidation auction state
    const auctionId = getLiquidationAuctionId(pool.id, loan.id, kick.blockNumber)
    const auction = loadOrCreateLiquidationAuction(pool.id, auctionId, kick, loan)
    updateLiquidationAuction(auction, auctionInfo, pool.id)

    kick.kickMomp = wadToDecimal(auctionInfo.kickMomp)
    kick.pool = pool.id
    kick.loan = loan.id
    kick.liquidationAuction = auctionId

    // track new liquidation auction at the pool level
    addLiquidationToPool(pool, auction)

    // save entities to store
    account.save()
    auction.save()
    loan.save()
    pool.save()
  }

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
    fromBucketLend.lpb = fromBucketLend.lpb.minus(wadToDecimal(event.params.lpRedeemedFrom))
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
    lend.lpb             = lend.lpb.minus(removeCollateral.lpRedeemed)
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

    // FIXME: seems this sometimes underflows
    // if (removeQuote.lpRedeemed >= lend.lpb) {
    //   lend.lpb = lend.lpb.minus(removeQuote.lpRedeemed)
    //   lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)
    // }

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
    pool.currentDebt       = pool.currentDebt.minus(wadToDecimal(event.params.quoteRepaid))
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
    const loanId = getLoanId(pool.id, accountId)
    const loan = loadOrCreateLoan(loanId, pool.id, repayDebt.borrower)
    loan.collateralPledged = loan.collateralPledged.minus(wadToDecimal(event.params.collateralPulled))
    loan.debt              = loan.debt.minus(wadToDecimal(event.params.quoteRepaid))
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
export function handleReserveAuction(event: ReserveAuctionEvent): void {
  const reserveAuctionEvent = new ReserveAuctionKickOrTake(
    event.transaction.hash.concat(event.transaction.from)
  )
  reserveAuctionEvent.claimableReservesRemaining = wadToDecimal(event.params.claimableReservesRemaining)
  reserveAuctionEvent.auctionPrice               = wadToDecimal(event.params.auctionPrice)
  reserveAuctionEvent.currentBurnEpoch           = event.params.currentBurnEpoch

  reserveAuctionEvent.blockNumber = event.block.number
  reserveAuctionEvent.blockTimestamp = event.block.timestamp
  reserveAuctionEvent.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update account state
    const accountId = addressToBytes(event.transaction.from)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)
    updateAccountReserveAuctions(account, reserveAuctionEvent.id)

    // retrieve ajna burn information from the pool
    const currentBurnEpoch = getCurrentBurnEpoch(pool)
    const burnInfo = getBurnInfo(pool, currentBurnEpoch)

    // update reserve auction process state
    const reserveAuctionId = getReserveAuctionId(pool.id, currentBurnEpoch)
    const reserveAuction = loadOrCreateReserveAuction(pool.id, reserveAuctionId)

    // if kicker is null, then assume this is the start of the auction,
    // and set kicker to the caller of startReserveAuction and calculate kickerAward
    if (reserveAuction.kicker == Bytes.empty()) {
      reserveAuction.burnEpoch = currentBurnEpoch
      reserveAuction.kicker = event.transaction.from
      reserveAuction.kickerAward = reserveAuctionKickerReward(pool)
      reserveAuction.kickTime = event.block.timestamp
      reserveAuction.pool = pool.id

      // set the total ajna burned at the start of the auction
      pool.totalAjnaBurned = wadToDecimal(burnInfo.totalBurned)
    }
    else {
      // if kicker is not null, then assume this is the takeReserveAuction call
      // and set taker to the caller of takeReserveAuction
      reserveAuctionEvent.taker = event.transaction.from
      // concat the additional event into the reserveAuction list
      reserveAuction.reserveAuctionTakes = reserveAuction.reserveAuctionTakes.concat([reserveAuctionEvent.id])
    }

    // update ReserveAuction with latest auction state
    reserveAuction.auctionPrice = wadToDecimal(event.params.auctionPrice)
    reserveAuction.claimableReservesRemaining = wadToDecimal(event.params.claimableReservesRemaining)

    // update burn information of the reserve auction take
    // since only one reserve auction can occur at a time, look at the difference since the last reserve auction
    reserveAuctionEvent.incrementalAjnaBurned = wadToDecimal(burnInfo.totalBurned).minus(pool.totalAjnaBurned)
    reserveAuction.ajnaBurnedAcrossAllTakes = reserveAuction.ajnaBurnedAcrossAllTakes.plus(reserveAuctionEvent.incrementalAjnaBurned)

    // update pool burn and interest earned information
    pool.burnEpoch = currentBurnEpoch
    pool.totalAjnaBurned = wadToDecimal(burnInfo.totalBurned)
    pool.totalInterestEarned = wadToDecimal(burnInfo.totalInterest)
    addReserveAuctionToPool(pool, reserveAuction)

    reserveAuctionEvent.pool = pool.id
    reserveAuctionEvent.reserveAuction = reserveAuctionId

    // save entities to store
    account.save()
    pool.save()
    reserveAuction.save()
  }

  reserveAuctionEvent.save()
}

export function handleRevokeLpAllowance(event: RevokeLpAllowanceEvent): void {
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

export function handleRevokeLpTransferors(
  event: RevokeLpTransferorsEvent
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

export function handleSetLpAllowance(event: SetLpAllowanceEvent): void {
  const poolId = addressToBytes(event.address)
  const lender = event.transaction.from
  const entity = loadOrCreateAllowances(poolId, lender, event.params.spender)
  setAllowances(entity, event.params.indexes, event.params.amounts)

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

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update taker account state
    const account   = loadOrCreateAccount(take.taker)
    account.txCount = account.txCount.plus(ONE_BI)
    updateAccountTakes(account, take.id)
    updateAccountPools(account, pool)

    // update loan state
    const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
    const loan = loadOrCreateLoan(loanId, pool.id, take.borrower)
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
    const auctionInfo = getAuctionInfoERC20Pool(take.borrower, pool)

    // update liquidation auction state
    const auctionId = getLiquidationAuctionId(pool.id, loan.id, take.blockNumber)
    const auction   = LiquidationAuction.load(auctionId)!
    updateLiquidationAuction(auction, auctionInfo, pool.id)
    auction.takes.push(take.id)
    const debtCovered           = wadToDecimal(event.params.amount)
    auction.debtRemaining       = auction.debtRemaining.minus(debtCovered)
    const collateralPurchased   = wadToDecimal(event.params.collateral)
    auction.collateralRemaining = auction.collateralRemaining.minus(collateralPurchased)
    pool.pledgedCollateral      = pool.pledgedCollateral.minus(collateralPurchased)

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
    take.loan = loan.id
    take.pool = pool.id

    // save entities to the store
    account.save()
    auction.save()
    loan.save()
    pool.save()
  }

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

  // update entities
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.loansCount = pool.loansCount.minus(ONE_BI)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    // update settler account state
    const account   = loadOrCreateAccount(event.transaction.from)
    account.txCount = account.txCount.plus(ONE_BI)
    updateAccountPools(account, pool)
    updateAccountSettles(account, settle)

    const loanId = getLoanId(pool.id, settle.borrower)

    // retrieve auction information on the auction after settle
    const auctionInfo = getAuctionInfoERC20Pool(settle.borrower, pool)

    // update liquidation auction state
    const liquidationAuctionId = getLiquidationAuctionId(pool.id, loanId, settle.blockNumber)
    const liquidationAuction = LiquidationAuction.load(liquidationAuctionId)!
    updateLiquidationAuction(liquidationAuction, auctionInfo, pool.id)

    // update settle pointers
    settle.pool = pool.id
    settle.liquidationAuction = liquidationAuctionId
    settle.loan = loanId

    // save entities to the store
    account.save()
    liquidationAuction.save()
    pool.save()
  }

  settle.save()
}

export function handleTransferLPs(event: TransferLPsEvent): void {
  const entity = new TransferLPs(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner    = event.params.owner
  entity.newOwner = event.params.newOwner
  entity.indexes  = bigIntArrayToIntArray(event.params.indexes)
  entity.lps      = wadToDecimal(event.params.lps)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  // update Lends for old and new owners, creating entities where necessary
  const poolId = addressToBytes(event.address)
  const pool = Pool.load(poolId)!
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
    const oldLend = loadOrCreateLend(bucketId, oldLendId, poolId, entity.owner)
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
  updateInterestRate.oldRate = wadToDecimal(event.params.oldRate)
  updateInterestRate.newRate = wadToDecimal(event.params.newRate)

  updateInterestRate.blockNumber = event.block.number
  updateInterestRate.blockTimestamp = event.block.timestamp
  updateInterestRate.transactionHash = event.transaction.hash

  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.interestRate = wadToDecimal(event.params.newRate)
    pool.txCount = pool.txCount.plus(ONE_BI)

    updateInterestRate.pool = pool.id

    // save entities to the store
    pool.save()
  }

  updateInterestRate.save()
}
