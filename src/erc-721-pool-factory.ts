import { ERC721PoolFactoryPoolCreated as ERC721PoolFactoryPoolCreatedEvent } from "../generated/ERC721PoolFactory/ERC721PoolFactory"
import { ERC721PoolFactoryPoolCreated } from "../generated/schema"

export function handleERC721PoolFactoryPoolCreated(
  event: ERC721PoolFactoryPoolCreatedEvent
): void {
  const poolCreated = new ERC721PoolFactoryPoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool_ = event.params.pool_

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  poolCreated.save()
}
