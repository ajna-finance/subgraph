import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { FIVE_PERCENT_BI, MAX_PRICE, ONE_BI, ZERO_BI } from "../src/utils/constants"
import { create721Pool } from "./utils/common"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("ERC721PoolFactory assertions", () => {
  beforeAll(() => {
    const pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const expectedCollateralToken = Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81")
    const expectedQuoteToken      = Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    // TODO: deploy subset pool as well, this calldata is just for a collection pool
    const calldata = Bytes.fromHexString("0xb038d2e1000000000000000000000000c9bceeea5288b2be0b777f4f388f125f55ab5a8100000000000000000000000010aa0cf12aab305bd77ad8f76c037e048b12513b000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000b1a2bc2ec500000000000000000000000000000000000000000000000000000000000000000000")
    create721Pool(pool_, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate, calldata)
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

  test("Factory entity attributes", () => {
    assert.entityCount("PoolFactory", 1)

    const erc721factoryAddress = Address.fromString("0x0000000000000000000000000000000000002020")
    assert.fieldEquals(
      "PoolFactory",
      erc721factoryAddress.toHexString(),
      "poolType",
      "ERC721"
    )
    assert.fieldEquals(
      "PoolFactory",
      erc721factoryAddress.toHexString(),
      "poolCount",
      `${ONE_BI}`
    )
    assert.fieldEquals(
      "PoolFactory",
      erc721factoryAddress.toHexString(),
      "txCount",
      `${ONE_BI}`
    )
  })

  test("Pool entity attributes", () => {
    const expectedCollateralToken = Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81")
    const expectedQuoteToken      = Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B")

    assert.entityCount("Pool", 1)

    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "collateralToken",
      `${expectedCollateralToken.toHexString()}`
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "quoteToken",
      `${expectedQuoteToken.toHexString()}`
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
      "t0debt",
      `${ZERO_BI}`
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "reserves",
      `${ZERO_BI}`
    )
    assert.fieldEquals(
      "Pool",
      "0x0000000000000000000000000000000000000001",
      "txCount",
      `${ZERO_BI}`
    )
  })

  test("Token entity attributes", () => {
    const expectedCollateralToken = Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81")
    const expectedQuoteToken      = Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B")

    assert.entityCount("Token", 2)

    assert.fieldEquals(
      "Token",
      `${expectedQuoteToken.toHexString()}`,
      "name",
      "quote"
    )
    assert.fieldEquals(
      "Token",
      `${expectedQuoteToken.toHexString()}`,
      "symbol",
      "Q"
    )
    assert.fieldEquals(
      "Token",
      `${expectedCollateralToken.toHexString()}`,
      "name",
      "collateral"
    )
    assert.fieldEquals(
      "Token",
      `${expectedCollateralToken.toHexString()}`,
      "symbol",
      "C"
    )
  })

})
