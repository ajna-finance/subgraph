import { PoolCreated as PoolCreatedEvent } from "../generated/ERC721PoolFactory/ERC721PoolFactory"
import { PoolCreated } from "../generated/schema"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool_ = event.params.pool_

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // TODO: 
  // - record factory information
  // - increment pool count
  // - instantiate pool contract
  // - get pool initial interest rate
  // - create Token entites associated with the pool
  // - record token information
  // - record subset if applicable

  poolCreated.save()
}
