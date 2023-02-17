import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
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
} from "../../generated/ERC20Pool/ERC20Pool"

export function createAddCollateralEvent(
  pool: Address,
  actor: Address,
  price: BigInt,
  amount: BigInt,
  lpAwarded: BigInt
): AddCollateral {
  let addCollateralEvent = changetype<AddCollateral>(newMockEvent())

  addCollateralEvent.parameters = new Array()

  addCollateralEvent.parameters.push(
    new ethereum.EventParam("actor", ethereum.Value.fromAddress(actor))
  )
  addCollateralEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price))
  )
  addCollateralEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  addCollateralEvent.parameters.push(
    new ethereum.EventParam(
      "lpAwarded",
      ethereum.Value.fromUnsignedBigInt(lpAwarded)
    )
  )

  // update transaction target to the expected pool address
  addCollateralEvent.transaction.to = pool

  return addCollateralEvent
}

export function createAddQuoteTokenEvent(
  pool: Address,
  lender: Address,
  price: BigInt,
  amount: BigInt,
  lpAwarded: BigInt,
  lup: BigInt
): AddQuoteToken {
  let addQuoteTokenEvent = changetype<AddQuoteToken>(newMockEvent())

  addQuoteTokenEvent.parameters = new Array()

  addQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  addQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price))
  )
  addQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  addQuoteTokenEvent.parameters.push(
    new ethereum.EventParam(
      "lpAwarded",
      ethereum.Value.fromUnsignedBigInt(lpAwarded)
    )
  )
  addQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("lup", ethereum.Value.fromUnsignedBigInt(lup))
  )

  // update transaction target to the expected pool address
  addQuoteTokenEvent.transaction.to = pool

  return addQuoteTokenEvent
}

export function createAuctionNFTSettleEvent(
  borrower: Address,
  collateral: BigInt,
  lps: BigInt,
  index: BigInt
): AuctionNFTSettle {
  let auctionNftSettleEvent = changetype<AuctionNFTSettle>(newMockEvent())

  auctionNftSettleEvent.parameters = new Array()

  auctionNftSettleEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  auctionNftSettleEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )
  auctionNftSettleEvent.parameters.push(
    new ethereum.EventParam("lps", ethereum.Value.fromUnsignedBigInt(lps))
  )
  auctionNftSettleEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )

  return auctionNftSettleEvent
}

export function createAuctionSettleEvent(
  borrower: Address,
  collateral: BigInt
): AuctionSettle {
  let auctionSettleEvent = changetype<AuctionSettle>(newMockEvent())

  auctionSettleEvent.parameters = new Array()

  auctionSettleEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  auctionSettleEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )

  return auctionSettleEvent
}

export function createBucketBankruptcyEvent(
  index: BigInt,
  lpForfeited: BigInt
): BucketBankruptcy {
  let bucketBankruptcyEvent = changetype<BucketBankruptcy>(newMockEvent())

  bucketBankruptcyEvent.parameters = new Array()

  bucketBankruptcyEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )
  bucketBankruptcyEvent.parameters.push(
    new ethereum.EventParam(
      "lpForfeited",
      ethereum.Value.fromUnsignedBigInt(lpForfeited)
    )
  )

  return bucketBankruptcyEvent
}

export function createBucketTakeEvent(
  pool: Address,
  taker: Address,
  borrower: Address,
  index: BigInt,
  amount: BigInt,
  collateral: BigInt,
  bondChange: BigInt,
  isReward: boolean
): BucketTake {
  let bucketTakeEvent = changetype<BucketTake>(newMockEvent())

  bucketTakeEvent.parameters = new Array()

  bucketTakeEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  bucketTakeEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )
  bucketTakeEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  bucketTakeEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )
  bucketTakeEvent.parameters.push(
    new ethereum.EventParam(
      "bondChange",
      ethereum.Value.fromUnsignedBigInt(bondChange)
    )
  )
  bucketTakeEvent.parameters.push(
    new ethereum.EventParam("isReward", ethereum.Value.fromBoolean(isReward))
  )

  // update transaction targets to the expected pool address and taker
  bucketTakeEvent.transaction.from = taker
  bucketTakeEvent.transaction.to = pool

  return bucketTakeEvent
}

export function createBucketTakeLPAwardedEvent(
  pool: Address,
  taker: Address,
  kicker: Address,
  lpAwardedTaker: BigInt,
  lpAwardedKicker: BigInt
): BucketTakeLPAwarded {
  let bucketTakeLpAwardedEvent = changetype<BucketTakeLPAwarded>(newMockEvent())

  bucketTakeLpAwardedEvent.parameters = new Array()

  bucketTakeLpAwardedEvent.parameters.push(
    new ethereum.EventParam("taker", ethereum.Value.fromAddress(taker))
  )
  bucketTakeLpAwardedEvent.parameters.push(
    new ethereum.EventParam("kicker", ethereum.Value.fromAddress(kicker))
  )
  bucketTakeLpAwardedEvent.parameters.push(
    new ethereum.EventParam(
      "lpAwardedTaker",
      ethereum.Value.fromUnsignedBigInt(lpAwardedTaker)
    )
  )
  bucketTakeLpAwardedEvent.parameters.push(
    new ethereum.EventParam(
      "lpAwardedKicker",
      ethereum.Value.fromUnsignedBigInt(lpAwardedKicker)
    )
  )

  // update transaction targets to the expected pool address
  bucketTakeLpAwardedEvent.transaction.to = pool

  return bucketTakeLpAwardedEvent
}

export function createDrawDebtEvent(
  pool: Address,
  borrower: Address,
  amountBorrowed: BigInt,
  collateralPledged: BigInt,
  lup: BigInt
): DrawDebt {
  let drawDebtEvent = changetype<DrawDebt>(newMockEvent())

  drawDebtEvent.parameters = new Array()

  drawDebtEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  drawDebtEvent.parameters.push(
    new ethereum.EventParam(
      "amountBorrowed",
      ethereum.Value.fromUnsignedBigInt(amountBorrowed)
    )
  )
  drawDebtEvent.parameters.push(
    new ethereum.EventParam(
      "collateralPledged",
      ethereum.Value.fromUnsignedBigInt(collateralPledged)
    )
  )
  drawDebtEvent.parameters.push(
    new ethereum.EventParam("lup", ethereum.Value.fromUnsignedBigInt(lup))
  )

  // update transaction target to the expected pool address
  drawDebtEvent.transaction.to = pool

  return drawDebtEvent
}

export function createKickEvent(
  pool: Address,
  kicker: Address,
  borrower: Address,
  debt: BigInt,
  collateral: BigInt,
  bond: BigInt
): Kick {
  let kickEvent = changetype<Kick>(newMockEvent())

  kickEvent.parameters = new Array()

  kickEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  kickEvent.parameters.push(
    new ethereum.EventParam("debt", ethereum.Value.fromUnsignedBigInt(debt))
  )
  kickEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )
  kickEvent.parameters.push(
    new ethereum.EventParam("bond", ethereum.Value.fromUnsignedBigInt(bond))
  )

  // update transaction target to the expected pool address and kicker
  kickEvent.transaction.from = kicker
  kickEvent.transaction.to = pool

  return kickEvent
}

export function createMoveQuoteTokenEvent(
  pool: Address,
  lender: Address,
  from: BigInt,
  to: BigInt,
  amount: BigInt,
  lpRedeemedFrom: BigInt,
  lpAwardedTo: BigInt,
  lup: BigInt
): MoveQuoteToken {
  let moveQuoteTokenEvent = changetype<MoveQuoteToken>(newMockEvent())

  moveQuoteTokenEvent.parameters = new Array()

  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromUnsignedBigInt(from))
  )
  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromUnsignedBigInt(to))
  )
  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam(
      "lpRedeemedFrom",
      ethereum.Value.fromUnsignedBigInt(lpRedeemedFrom)
    )
  )
  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam(
      "lpAwardedTo",
      ethereum.Value.fromUnsignedBigInt(lpAwardedTo)
    )
  )
  moveQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("lup", ethereum.Value.fromUnsignedBigInt(lup))
  )

  // update transaction target to the expected pool address
  moveQuoteTokenEvent.transaction.to = pool

  return moveQuoteTokenEvent
}

export function createRemoveCollateralEvent(
  claimer: Address,
  price: BigInt,
  amount: BigInt,
  lpRedeemed: BigInt
): RemoveCollateral {
  let removeCollateralEvent = changetype<RemoveCollateral>(newMockEvent())

  removeCollateralEvent.parameters = new Array()

  removeCollateralEvent.parameters.push(
    new ethereum.EventParam("claimer", ethereum.Value.fromAddress(claimer))
  )
  removeCollateralEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price))
  )
  removeCollateralEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  removeCollateralEvent.parameters.push(
    new ethereum.EventParam(
      "lpRedeemed",
      ethereum.Value.fromUnsignedBigInt(lpRedeemed)
    )
  )

  return removeCollateralEvent
}

export function createRemoveQuoteTokenEvent(
  lender: Address,
  price: BigInt,
  amount: BigInt,
  lpRedeemed: BigInt,
  lup: BigInt
): RemoveQuoteToken {
  let removeQuoteTokenEvent = changetype<RemoveQuoteToken>(newMockEvent())

  removeQuoteTokenEvent.parameters = new Array()

  removeQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  removeQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price))
  )
  removeQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  removeQuoteTokenEvent.parameters.push(
    new ethereum.EventParam(
      "lpRedeemed",
      ethereum.Value.fromUnsignedBigInt(lpRedeemed)
    )
  )
  removeQuoteTokenEvent.parameters.push(
    new ethereum.EventParam("lup", ethereum.Value.fromUnsignedBigInt(lup))
  )

  return removeQuoteTokenEvent
}

export function createRepayDebtEvent(
  pool: Address,
  borrower: Address,
  quoteRepaid: BigInt,
  collateralPulled: BigInt,
  lup: BigInt
): RepayDebt {
  let repayDebtEvent = changetype<RepayDebt>(newMockEvent())

  repayDebtEvent.parameters = new Array()

  repayDebtEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  repayDebtEvent.parameters.push(
    new ethereum.EventParam(
      "quoteRepaid",
      ethereum.Value.fromUnsignedBigInt(quoteRepaid)
    )
  )
  repayDebtEvent.parameters.push(
    new ethereum.EventParam(
      "collateralPulled",
      ethereum.Value.fromUnsignedBigInt(collateralPulled)
    )
  )
  repayDebtEvent.parameters.push(
    new ethereum.EventParam("lup", ethereum.Value.fromUnsignedBigInt(lup))
  )

  // update transaction target to the expected pool address
  repayDebtEvent.transaction.to = pool

  return repayDebtEvent
}

export function createReserveAuctionEvent(
  claimableReservesRemaining: BigInt,
  auctionPrice: BigInt
): ReserveAuction {
  let reserveAuctionEvent = changetype<ReserveAuction>(newMockEvent())

  reserveAuctionEvent.parameters = new Array()

  reserveAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "claimableReservesRemaining",
      ethereum.Value.fromUnsignedBigInt(claimableReservesRemaining)
    )
  )
  reserveAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "auctionPrice",
      ethereum.Value.fromUnsignedBigInt(auctionPrice)
    )
  )

  return reserveAuctionEvent
}

export function createSettleEvent(
  pool: Address,
  settler: Address,
  borrower: Address,
  settledDebt: BigInt
): Settle {
  let settleEvent = changetype<Settle>(newMockEvent())

  settleEvent.parameters = new Array()

  settleEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  settleEvent.parameters.push(
    new ethereum.EventParam(
      "settledDebt",
      ethereum.Value.fromUnsignedBigInt(settledDebt)
    )
  )

  // update transaction targets to the expected pool address and taker
  settleEvent.transaction.from = settler
  settleEvent.transaction.to = pool

  return settleEvent
}

export function createTakeEvent(
  pool: Address,
  taker: Address,
  borrower: Address,
  amount: BigInt,
  collateral: BigInt,
  bondChange: BigInt,
  isReward: boolean
): Take {
  let takeEvent = changetype<Take>(newMockEvent())

  takeEvent.parameters = new Array()

  takeEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  takeEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  takeEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )
  takeEvent.parameters.push(
    new ethereum.EventParam(
      "bondChange",
      ethereum.Value.fromUnsignedBigInt(bondChange)
    )
  )
  takeEvent.parameters.push(
    new ethereum.EventParam("isReward", ethereum.Value.fromBoolean(isReward))
  )

  // update transaction targets to the expected pool address and taker
  takeEvent.transaction.from = taker
  takeEvent.transaction.to = pool

  return takeEvent
}

export function createTransferLPTokensEvent(
  owner: Address,
  newOwner: Address,
  indexes: Array<BigInt>,
  lpTokens: BigInt
): TransferLPTokens {
  let transferLpTokensEvent = changetype<TransferLPTokens>(newMockEvent())

  transferLpTokensEvent.parameters = new Array()

  transferLpTokensEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  transferLpTokensEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )
  transferLpTokensEvent.parameters.push(
    new ethereum.EventParam(
      "indexes",
      ethereum.Value.fromUnsignedBigIntArray(indexes)
    )
  )
  transferLpTokensEvent.parameters.push(
    new ethereum.EventParam(
      "lpTokens",
      ethereum.Value.fromUnsignedBigInt(lpTokens)
    )
  )

  return transferLpTokensEvent
}

export function createUpdateInterestRateEvent(
  oldRate: BigInt,
  newRate: BigInt
): UpdateInterestRate {
  let updateInterestRateEvent = changetype<UpdateInterestRate>(newMockEvent())

  updateInterestRateEvent.parameters = new Array()

  updateInterestRateEvent.parameters.push(
    new ethereum.EventParam(
      "oldRate",
      ethereum.Value.fromUnsignedBigInt(oldRate)
    )
  )
  updateInterestRateEvent.parameters.push(
    new ethereum.EventParam(
      "newRate",
      ethereum.Value.fromUnsignedBigInt(newRate)
    )
  )

  return updateInterestRateEvent
}
