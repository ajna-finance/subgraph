import {
  BurnWrappedAjnaApproval as BurnWrappedAjnaApprovalEvent,
  BurnWrappedAjnaTransfer as BurnWrappedAjnaTransferEvent
} from "../generated/BurnWrappedAjna/BurnWrappedAjna"
import { BurnWrap } from "../generated/schema"
import { addressToBytes, wadToDecimal } from "./utils/convert"

export function handleBurnWrappedAjnaTransfer(
  event: BurnWrappedAjnaTransferEvent
): void {
  let entity = new BurnWrap(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.account = addressToBytes(event.params.from)
  entity.amount =  wadToDecimal(event.params.value)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
