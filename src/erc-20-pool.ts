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
  RemoveCollateral,
  RemoveQuoteToken,
  RepayDebt,
  ReserveAuction,
  Settle,
  Take,
  TransferLPTokens,
  UpdateInterestRate
} from "../generated/schema"

export function handleAddCollateral(event: AddCollateralEvent): void {
  let entity = new AddCollateral(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.actor = event.params.actor
  entity.price = event.params.price
  entity.amount = event.params.amount
  entity.lpAwarded = event.params.lpAwarded

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAddQuoteToken(event: AddQuoteTokenEvent): void {
  let entity = new AddQuoteToken(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.price = event.params.price
  entity.amount = event.params.amount
  entity.lpAwarded = event.params.lpAwarded
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
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
  let entity = new DrawDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.amountBorrowed = event.params.amountBorrowed
  entity.collateralPledged = event.params.collateralPledged
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
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
  let entity = new RepayDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.quoteRepaid = event.params.quoteRepaid
  entity.collateralPulled = event.params.collateralPulled
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
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
