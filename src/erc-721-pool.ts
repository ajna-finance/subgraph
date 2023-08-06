import {
  AddCollateralNFT as AddCollateralNFTEvent,
  DrawDebtNFT as DrawDebtNFTEvent,
  Flashloan as FlashloanEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  MergeOrRemoveCollateralNFT as MergeOrRemoveCollateralNFTEvent,
  ReserveAuction as ReserveAuctionEvent
} from "../generated/templates/ERC721Pool/ERC721Pool"
import {
  AddCollateralNFT,
  DrawDebtNFT,
  Flashloan,
  // KickReserveAuction,
  MergeOrRemoveCollateralNFT,
  ReserveAuction
} from "../generated/schema"

export function handleAddCollateralNFT(event: AddCollateralNFTEvent): void {
  let entity = new AddCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.actor = event.params.actor
  entity.index = event.params.index
  entity.tokenIds = event.params.tokenIds
  entity.lpAwarded = event.params.lpAwarded

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDrawDebtNFT(event: DrawDebtNFTEvent): void {
  let entity = new DrawDebtNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.amountBorrowed = event.params.amountBorrowed
  entity.tokenIdsPledged = event.params.tokenIdsPledged
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
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

export function handleMergeOrRemoveCollateralNFT(
  event: MergeOrRemoveCollateralNFTEvent
): void {
  let entity = new MergeOrRemoveCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.actor = event.params.actor
  entity.collateralMerged = event.params.collateralMerged
  entity.toIndexLps = event.params.toIndexLps

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

