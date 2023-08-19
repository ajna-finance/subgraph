import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  logStore,
  dataSourceMock
} from "matchstick-as/assembly/index"
import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts"
import { createPool } from "./utils/common"
import { mockGetRatesAndFees } from "./utils/mock-contract-calls"

import { FIVE_PERCENT_BI, MAX_PRICE, ONE_BI, ZERO_BI } from "../src/utils/constants"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("ERC20PoolFactory assertions", () => {

  beforeAll(() => {
    // set dataSource.network() return value to "goerli" so constant mapping for poolInfoUtils can be accessed
    dataSourceMock.setNetwork("goerli")

    const pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const expectedCollateralToken = Address.fromString("0x0000000000000000000000000000000000000002")
    const expectedQuoteToken      = Address.fromString("0x0000000000000000000000000000000000000003")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    mockGetRatesAndFees(pool_, BigInt.fromString("980000000000000000"), BigInt.fromString("60000000000000000"))

    createPool(pool_, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate)
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
      "pool",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })

  test("Factory entity attributes", () => {
    assert.entityCount("PoolFactory", 1)
  
    const erc20factoryAddress = Address.fromString("0x0000000000000000000000000000000000002020")
    assert.fieldEquals(
      "PoolFactory",
      erc20factoryAddress.toHexString(),
      "poolType",
      "ERC20"
    )
    assert.fieldEquals(
      "PoolFactory",
      erc20factoryAddress.toHexString(),
      "poolCount",
      `${ONE_BI}`
    )
    assert.fieldEquals(
      "PoolFactory",
      erc20factoryAddress.toHexString(),
      "txCount",
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
    const expectedCollateralToken = Address.fromString("0x0000000000000000000000000000000000000002")
    const expectedQuoteToken      = Address.fromString("0x0000000000000000000000000000000000000003")

    assert.entityCount("Token", 2)

    assert.fieldEquals(
      "Token",
      `${expectedQuoteToken.toHexString()}`,
      "name",
      "quote"
    )
    assert.fieldEquals(
      "Token",
      `${expectedCollateralToken.toHexString()}`,
      "name",
      "collateral"
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
      "symbol",
      "C"
    )
  })

})
