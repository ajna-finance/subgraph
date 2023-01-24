import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../../generated/ERC20PoolFactory/ERC20PoolFactory"
import { Pool } from "../../generated/schema"

export function createPoolCreatedEvent(pool_: Address): PoolCreated {
  let poolCreatedEvent = changetype<PoolCreated>(newMockEvent())

  poolCreatedEvent.parameters = new Array()

  poolCreatedEvent.parameters.push(
    new ethereum.EventParam("pool_", ethereum.Value.fromAddress(pool_))
  )

  return poolCreatedEvent
}
