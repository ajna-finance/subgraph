import { ERC721PoolFactoryPoolCreated as ERC721PoolFactoryPoolCreatedEvent } from "../generated/ERC721PoolFactory/ERC721PoolFactory"
import { ERC721PoolFactoryPoolCreated } from "../generated/schema"

export function handleERC721PoolFactoryPoolCreated(
  event: ERC721PoolFactoryPoolCreatedEvent
): void {
  let entity = new ERC721PoolFactoryPoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pool_ = event.params.pool_

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
