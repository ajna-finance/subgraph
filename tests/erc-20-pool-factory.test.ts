import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  createMockedFunction
} from "matchstick-as/assembly/index"
import { Address, ethereum } from "@graphprotocol/graph-ts"
import { PoolCreated } from "../generated/schema"
import { PoolCreated as PoolCreatedEvent } from "../generated/ERC20PoolFactory/ERC20PoolFactory"
import { handlePoolCreated } from "../src/erc-20-pool-factory"
import { createPoolCreatedEvent } from "./utils/erc-20-pool-factory-utils"
import { createPool } from "./utils/common"

import { MAX_PRICE, ONE_BI, ZERO_BI } from "../src/utils/constants"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {

  beforeAll(() => {
    const pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const expectedCollateralToken = Address.fromString("0x0000000000000000000000000000000000000002")
    const expectedQuoteToken      = Address.fromString("0x0000000000000000000000000000000000000003")

    createPool(pool_, expectedCollateralToken, expectedQuoteToken)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("PoolCreated event created and stored", () => {
    assert.entityCount("PoolCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "PoolCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "pool_",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })

  test("Factory entity attributes", () => {
    assert.entityCount("ERC20PoolFactory", 1)
  
    assert.fieldEquals(
      "ERC20PoolFactory",
      "0xbf332da94b818ac7972484997100c8cbb400b991",
      "poolCount",
      `${ONE_BI}`
    )
  })

  test("Pool entity attributes", () => {
    assert.entityCount("Pool", 1)

    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "collateralToken",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "quoteToken",
      "0x0000000000000000000000000000000000000003"
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "lup",
      `${MAX_PRICE}`
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "totalDeposits",
      `${ZERO_BI}`
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "totalLPB",
      `${ZERO_BI}`
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "txCount",
      `${ZERO_BI}`
    )
  })

})
