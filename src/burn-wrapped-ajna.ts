import {
  Transfer as TransferEvent
} from "../generated/BurnWrappedAjna/BurnWrappedAjna"
import { BurnWrap } from "../generated/schema"
import { ZERO_ADDRESS } from "./utils/constants"
import { addressToBytes, wadToDecimal } from "./utils/convert"

export function handleTransfer(
  event: TransferEvent
): void {
  if (event.params.from == ZERO_ADDRESS) {
    let entity = new BurnWrap(
      event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.wrapper = event.params.to
    entity.account = addressToBytes(event.params.from)
    entity.amount =  wadToDecimal(event.params.value)

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
}
