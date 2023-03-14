import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../../generated/ERC721PoolFactory/ERC721PoolFactory"

export function createERC721PoolFactoryPoolCreatedEvent(
  pool_: Address
): PoolCreated {
  let poolCreatedEvent = changetype<PoolCreated>(newMockEvent())

  poolCreatedEvent.parameters = new Array()

  poolCreatedEvent.parameters.push(
    new ethereum.EventParam("pool_", ethereum.Value.fromAddress(pool_))
  )

  return poolCreatedEvent
}
