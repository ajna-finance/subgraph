import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { ERC721PoolFactoryPoolCreated } from "../generated/ERC721PoolFactory/ERC721PoolFactory"

export function createERC721PoolFactoryPoolCreatedEvent(
  pool_: Address
): ERC721PoolFactoryPoolCreated {
  let erc721PoolFactoryPoolCreatedEvent = changetype<
    ERC721PoolFactoryPoolCreated
  >(newMockEvent())

  erc721PoolFactoryPoolCreatedEvent.parameters = new Array()

  erc721PoolFactoryPoolCreatedEvent.parameters.push(
    new ethereum.EventParam("pool_", ethereum.Value.fromAddress(pool_))
  )

  return erc721PoolFactoryPoolCreatedEvent
}
