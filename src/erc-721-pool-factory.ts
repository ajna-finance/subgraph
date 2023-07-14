import { PoolCreated as PoolCreatedEvent } from "../generated/ERC721PoolFactory/ERC721PoolFactory"
import { Pool, PoolCreated, Token } from "../generated/schema"
import { ONE_BI } from "./utils/constants"
import { loadOrCreateFactory } from "./utils/pool-factory"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool = event.params.pool_
  poolCreated.poolType = "ERC721"
  poolCreated.factory = event.address;

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // record factory information
  let factory = loadOrCreateFactory(event.address, "ERC20")
  factory.poolCount = factory.poolCount.plus(ONE_BI)
  factory.txCount   = factory.txCount.plus(ONE_BI)

  // TODO: 
  // - instantiate pool contract
  // - get pool initial interest rate
  // - create Token entites associated with the pool
  // - record token information
  // - record subset if applicable

  poolCreated.save()
}
