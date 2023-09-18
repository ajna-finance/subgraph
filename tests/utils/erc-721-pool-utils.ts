import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  AddCollateralNFT,
  AddQuoteToken,
  ApproveLPTransferors,
  AuctionNFTSettle,
  BucketBankruptcy,
  BucketTake,
  BucketTakeLPAwarded,
  DecreaseLPAllowance,
  DrawDebtNFT,
  Flashloan,
  IncreaseLPAllowance,
  Kick,
  KickReserveAuction,
  MergeOrRemoveCollateralNFT,
  RemoveCollateral,
  RepayDebt,
  RevokeLPAllowance,
  RevokeLPTransferors,
  ReserveAuction,
  Settle,
  Take,
  TransferLP
} from "../../generated/templates/ERC721Pool/ERC721Pool"

export function createAddCollateralNFTEvent(
  poolAddress: Address,
  actor: Address,
  index: BigInt,
  tokenIds: Array<BigInt>,
  lpAwarded: BigInt
): AddCollateralNFT {
  let addCollateralNftEvent = changetype<AddCollateralNFT>(newMockEvent())

  addCollateralNftEvent.parameters = new Array()

  addCollateralNftEvent.parameters.push(
    new ethereum.EventParam("actor", ethereum.Value.fromAddress(actor))
  )
  addCollateralNftEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )
  addCollateralNftEvent.parameters.push(
    new ethereum.EventParam(
      "tokenIds",
      ethereum.Value.fromUnsignedBigIntArray(tokenIds)
    )
  )
  addCollateralNftEvent.parameters.push(
    new ethereum.EventParam(
      "lpAwarded",
      ethereum.Value.fromUnsignedBigInt(lpAwarded)
    )
  )

  // update transaction target to the expected pool address
  addCollateralNftEvent.address = poolAddress

  return addCollateralNftEvent
}

export function createAddQuoteTokenEvent(
  pool: Address,
  logIndex: BigInt,
  lender: Address,
  index: BigInt,
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
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
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
  addQuoteTokenEvent.address = pool
  addQuoteTokenEvent.logIndex = logIndex

  return addQuoteTokenEvent
}

export function createAuctionNFTSettleEvent(
  pool: Address,
  borrower: Address,
  collateral: BigInt,
  lp: BigInt,
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
    new ethereum.EventParam("lp", ethereum.Value.fromUnsignedBigInt(lp))
  )
  auctionNftSettleEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )

  // update transaction target to the expected pool address
  auctionNftSettleEvent.address = pool

  return auctionNftSettleEvent
}

export function createApproveLPTransferorsEvent(
  pool: Address,
  lender: Address,
  transferors: Array<Address>
): ApproveLPTransferors {
  let approveLPTransferorsEvent = changetype<ApproveLPTransferors>(newMockEvent())

  approveLPTransferorsEvent.parameters = new Array()

  approveLPTransferorsEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  approveLPTransferorsEvent.parameters.push(
    new ethereum.EventParam(
      "transferors",
      ethereum.Value.fromAddressArray(transferors)
    )
  )

  // update transaction target to the expected pool address
  approveLPTransferorsEvent.address = pool

  return approveLPTransferorsEvent
}

export function createDecreaseLPAllowanceEvent(
  pool: Address,
  owner: Address,
  spender: Address,
  indexes: Array<BigInt>,
  amounts: Array<BigInt>
): DecreaseLPAllowance {
  let decreaseLPAllowanceEvent = changetype<DecreaseLPAllowance>(newMockEvent())

  decreaseLPAllowanceEvent.parameters = new Array()

  decreaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  decreaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  decreaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam(
      "indexes",
      ethereum.Value.fromUnsignedBigIntArray(indexes)
    )
  )
  decreaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam(
      "amounts",
      ethereum.Value.fromUnsignedBigIntArray(amounts)
    )
  )

  // update transaction to expected addresses
  decreaseLPAllowanceEvent.address = pool

  return decreaseLPAllowanceEvent
}

export function createIncreaseLPAllowanceEvent(
  pool: Address,
  owner: Address,
  spender: Address,
  indexes: Array<BigInt>,
  amounts: Array<BigInt>
): IncreaseLPAllowance {
  let increaseLPAllowanceEvent = changetype<IncreaseLPAllowance>(newMockEvent())

  increaseLPAllowanceEvent.parameters = new Array()

  increaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  increaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  increaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam(
      "indexes",
      ethereum.Value.fromUnsignedBigIntArray(indexes)
    )
  )
  increaseLPAllowanceEvent.parameters.push(
    new ethereum.EventParam(
      "amounts",
      ethereum.Value.fromUnsignedBigIntArray(amounts)
    )
  )
  // update transaction to expected addresses
  increaseLPAllowanceEvent.address = pool

  return increaseLPAllowanceEvent
}

export function createRevokeLPAllowanceEvent(
  pool: Address,
  spender: Address,
  indexes: Array<BigInt>
): RevokeLPAllowance {
  let revokeLPAllowanceEvent = changetype<RevokeLPAllowance>(newMockEvent())

  revokeLPAllowanceEvent.parameters = new Array()

  revokeLPAllowanceEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  revokeLPAllowanceEvent.parameters.push(
    new ethereum.EventParam(
      "indexes",
      ethereum.Value.fromUnsignedBigIntArray(indexes)
    )
  )
  // update transaction target to the expected pool address
  revokeLPAllowanceEvent.address = pool

  return revokeLPAllowanceEvent
}

export function createRevokeLPTransferorsEvent(
  pool: Address,
  lender: Address,
  transferors: Array<Address>
): RevokeLPTransferors {
  let revokeLPTransferorsEvent = changetype<RevokeLPTransferors>(newMockEvent())

  revokeLPTransferorsEvent.parameters = new Array()

  revokeLPTransferorsEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  revokeLPTransferorsEvent.parameters.push(
    new ethereum.EventParam(
      "transferors",
      ethereum.Value.fromAddressArray(transferors)
    )
  )

  // update transaction target to the expected pool address
  revokeLPTransferorsEvent.address = pool

  return revokeLPTransferorsEvent
}

export function createBucketBankruptcyEvent(
  pool: Address,
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

  // update transaction target to the expected pool address
  bucketBankruptcyEvent.address = pool

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
  bucketTakeEvent.address = pool

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
  bucketTakeLpAwardedEvent.address = pool

  return bucketTakeLpAwardedEvent
}

export function createDrawDebtNFTEvent(
  pool: Address,
  borrower: Address,
  amountBorrowed: BigInt,
  tokenIdsPledged: Array<BigInt>,
  lup: BigInt
): DrawDebtNFT {
  let drawDebtNftEvent = changetype<DrawDebtNFT>(newMockEvent())

  drawDebtNftEvent.parameters = new Array()

  drawDebtNftEvent.parameters.push(
    new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower))
  )
  drawDebtNftEvent.parameters.push(
    new ethereum.EventParam(
      "amountBorrowed",
      ethereum.Value.fromUnsignedBigInt(amountBorrowed)
    )
  )
  drawDebtNftEvent.parameters.push(
    new ethereum.EventParam(
      "tokenIdsPledged",
      ethereum.Value.fromUnsignedBigIntArray(tokenIdsPledged)
    )
  )
  drawDebtNftEvent.parameters.push(
    new ethereum.EventParam("lup", ethereum.Value.fromUnsignedBigInt(lup))
  )

  // update transaction target to the expected pool address
  drawDebtNftEvent.address = pool

  return drawDebtNftEvent
}

export function createFlashloanEvent(
  receiver: Address,
  token: Address,
  amount: BigInt
): Flashloan {
  let flashloanEvent = changetype<Flashloan>(newMockEvent())

  flashloanEvent.parameters = new Array()

  flashloanEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  flashloanEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  flashloanEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return flashloanEvent
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
  kickEvent.address = pool

  return kickEvent
}

export function createKickReserveAuctionEvent(
  claimableReservesRemaining: BigInt,
  auctionPrice: BigInt,
  currentBurnEpoch: BigInt
): KickReserveAuction {
  let kickReserveAuctionEvent = changetype<KickReserveAuction>(newMockEvent())

  kickReserveAuctionEvent.parameters = new Array()

  kickReserveAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "claimableReservesRemaining",
      ethereum.Value.fromUnsignedBigInt(claimableReservesRemaining)
    )
  )
  kickReserveAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "auctionPrice",
      ethereum.Value.fromUnsignedBigInt(auctionPrice)
    )
  )
  kickReserveAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "currentBurnEpoch",
      ethereum.Value.fromUnsignedBigInt(currentBurnEpoch)
    )
  )

  return kickReserveAuctionEvent
}

export function createMergeOrRemoveCollateralNFTEvent(
  poolAddress: Address,
  actor: Address,
  collateralMerged: BigInt,
  toIndexLps: BigInt,
  calldata: Bytes
): MergeOrRemoveCollateralNFT {
  let mergeOrRemoveCollateralNftEvent = changetype<MergeOrRemoveCollateralNFT>(
    newMockEvent()
  )

  mergeOrRemoveCollateralNftEvent.parameters = new Array()

  mergeOrRemoveCollateralNftEvent.parameters.push(
    new ethereum.EventParam("actor", ethereum.Value.fromAddress(actor))
  )
  mergeOrRemoveCollateralNftEvent.parameters.push(
    new ethereum.EventParam(
      "collateralMerged",
      ethereum.Value.fromUnsignedBigInt(collateralMerged)
    )
  )
  mergeOrRemoveCollateralNftEvent.parameters.push(
    new ethereum.EventParam(
      "toIndexLps",
      ethereum.Value.fromUnsignedBigInt(toIndexLps)
    )
  )

  // update event source address to the expected pool address
  mergeOrRemoveCollateralNftEvent.address = poolAddress

  // set calldata as input
  mergeOrRemoveCollateralNftEvent.transaction.input = calldata

  return mergeOrRemoveCollateralNftEvent
}

export function createRemoveCollateralEvent(
  pool: Address,
  claimer: Address,
  index: BigInt,
  amount: BigInt,
  lpRedeemed: BigInt
): RemoveCollateral {
  let removeCollateralEvent = changetype<RemoveCollateral>(newMockEvent())

  removeCollateralEvent.parameters = new Array()

  removeCollateralEvent.parameters.push(
    new ethereum.EventParam("claimer", ethereum.Value.fromAddress(claimer))
  )
  removeCollateralEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
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

  // update transaction target to the expected pool address
  removeCollateralEvent.address = pool

  return removeCollateralEvent
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
  repayDebtEvent.address = pool

  return repayDebtEvent
}

export function createReserveAuctionEvent(
  claimableReservesRemaining: BigInt,
  auctionPrice: BigInt,
  currentBurnEpoch: BigInt
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
  reserveAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "currentBurnEpoch",
      ethereum.Value.fromUnsignedBigInt(currentBurnEpoch)
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
  settleEvent.address = pool

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
  takeEvent.address = pool

  return takeEvent
}

export function createTransferLPEvent(
  pool: Address,
  owner: Address,
  newOwner: Address,
  indexes: Array<BigInt>,
  lp: BigInt
): TransferLP {
  let transferLpTokensEvent = changetype<TransferLP>(newMockEvent())

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
      "lp",
      ethereum.Value.fromUnsignedBigInt(lp)
    )
  )

  // update transaction target to the expected pool address
  transferLpTokensEvent.address = pool

  return transferLpTokensEvent
}
