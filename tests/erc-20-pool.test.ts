import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  createMockedFunction,
  logStore
} from "matchstick-as/assembly/index"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { handleAddCollateral, handleAddQuoteToken } from "../src/erc-20-pool"
import { createAddCollateralEvent, createAddQuoteTokenEvent } from "./utils/erc-20-pool-utils"
import { createPool } from "./utils/common"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    // deploy pool contract
    const pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const collateralToken = Address.fromString("0x0000000000000000000000000000000000000010")
    const quoteToken = Address.fromString("0x0000000000000000000000000000000000000012")

    createPool(pool_, collateralToken, quoteToken)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AddCollateral created and stored", () => {
    let actor = Address.fromString("0x0000000000000000000000000000000000000001")
    let price = BigInt.fromI32(234)
    let amount = BigInt.fromI32(234)
    let lpAwarded = BigInt.fromI32(234)
    let newAddCollateralEvent = createAddCollateralEvent(
      actor,
      price,
      amount,
      lpAwarded
    )
    handleAddCollateral(newAddCollateralEvent)

    assert.entityCount("AddCollateral", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "actor",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "price",
      "234"
    )
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      "234"
    )
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwarded",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })

  test("AddQuoteToken created and stored", () => {
    // check entity is unavailable prior to storage
    assert.entityCount("AddQuoteToken", 0)

    let lender = Address.fromString("0x0000000000000000000000000000000000000002")
    let price = BigInt.fromI32(234)
    let amount = BigInt.fromI32(567)
    let lpAwarded = BigInt.fromI32(567)
    let lup = BigInt.fromI32(234)

    const newAddQuoteTokenEvent = createAddQuoteTokenEvent(
      Address.fromString("0x0000000000000000000000000000000000000001"),
      lender,
      price,
      amount,
      lpAwarded,
      lup
    )
    handleAddQuoteToken(newAddQuoteTokenEvent)

    assert.entityCount("AddQuoteToken", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lender",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "price",
      "234"
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      "567"
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwarded",
      "567"
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      "234"
    )
  })

})
