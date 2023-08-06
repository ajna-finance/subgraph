import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts"

import { FIVE_PERCENT_BI, MAX_PRICE, ONE_BI, ZERO_BI } from "../src/utils/constants"
import { create721Pool } from "./utils/common"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("ERC721PoolFactory assertions", () => {
  beforeAll(() => {
    const pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const expectedCollateralToken = Address.fromString("0x0000000000000000000000000000000000000002")
    const expectedQuoteToken      = Address.fromString("0x0000000000000000000000000000000000000003")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    create721Pool(pool_, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("PoolCreated created and stored", () => {
    assert.entityCount("PoolCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "PoolCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "pool",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
