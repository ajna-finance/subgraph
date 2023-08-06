import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  AddCollateralNFT,
  DrawDebtNFT,
  Flashloan,
  KickReserveAuction,
  MergeOrRemoveCollateralNFT,
  ReserveAuction
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

export function createDrawDebtNFTEvent(
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
  actor: Address,
  collateralMerged: BigInt,
  toIndexLps: BigInt
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

  return mergeOrRemoveCollateralNftEvent
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
