import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../../generated/ERC721PoolFactory/ERC721PoolFactory"

export function createERC721PoolFactoryPoolCreatedEvent(
  factoryAddress: Address,
  pool_: Address,
  input: Bytes
): PoolCreated {
  let poolCreatedEvent = changetype<PoolCreated>(newMockEvent())

  // set factory address as the source of the event
  poolCreatedEvent.address = factoryAddress

  poolCreatedEvent.parameters = new Array()

  poolCreatedEvent.parameters.push(
    new ethereum.EventParam("pool_", ethereum.Value.fromAddress(pool_))
  )

  // add mock calldata to transaction input
  poolCreatedEvent.transaction.input = input

  return poolCreatedEvent
}
