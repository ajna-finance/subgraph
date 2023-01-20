import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { ERC721PoolFactoryPoolCreated } from "../generated/schema"
import { ERC721PoolFactoryPoolCreated as ERC721PoolFactoryPoolCreatedEvent } from "../generated/ERC721PoolFactory/ERC721PoolFactory"
import { handleERC721PoolFactoryPoolCreated } from "../src/erc-721-pool-factory"
import { createERC721PoolFactoryPoolCreatedEvent } from "./erc-721-pool-factory-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    let newERC721PoolFactoryPoolCreatedEvent = createERC721PoolFactoryPoolCreatedEvent(
      pool_
    )
    handleERC721PoolFactoryPoolCreated(newERC721PoolFactoryPoolCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ERC721PoolFactoryPoolCreated created and stored", () => {
    assert.entityCount("ERC721PoolFactoryPoolCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ERC721PoolFactoryPoolCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "pool_",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
