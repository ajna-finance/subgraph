import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  logStore
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { handleAddCollateral, handleAddQuoteToken } from "../src/erc-20-pool"
import { createAddCollateralEvent, createAddQuoteTokenEvent } from "./utils/erc-20-pool-utils"
import { createPool } from "./utils/common"
import { getBucketId } from "../src/utils/bucket"
import { addressToBytes } from "../src/utils/convert"
import { ONE_BI, ZERO_BI } from "../src/utils/constants"
import { Lender } from "../generated/schema"

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

  test("AddQuoteToken", () => {
    // check entity is unavailable prior to storage
    assert.entityCount("AddQuoteToken", 0)

    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const lender = Address.fromString("0x0000000000000000000000000000000000000002")
    const price = BigInt.fromI32(234)
    const amount = BigInt.fromI32(567)
    const lpAwarded = BigInt.fromI32(567)
    const lup = BigInt.fromI32(234)

    const newAddQuoteTokenEvent = createAddQuoteTokenEvent(
      poolAddress,
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

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), price)
    assert.fieldEquals(
      "Bucket",
      `${bucketId.toHexString()}`,
      "collateral",
      `${ZERO_BI}`
    )
    assert.fieldEquals(
      "Bucket",
      `${bucketId.toHexString()}`,
      "deposit",
      `${amount}`
    )
    assert.fieldEquals(
      "Bucket",
      `${bucketId.toHexString()}`,
      "lpb",
      `${lpAwarded}`
    )

    // check pool attributes updated
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "totalDeposits",
      `${amount}`
    )
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "totalLPB",
      `${lpAwarded}`
    )

    // check lender attributes updated
    const loadedLender = Lender.load(addressToBytes(lender))!
    assert.bytesEquals(bucketId, loadedLender.bucketIndexes[0])
    assert.fieldEquals(
      "Lender",
      `${addressToBytes(lender).toHexString()}`,
      "totalDeposits",
      `${amount}`
    )
    assert.fieldEquals(
      "Lender",
      `${addressToBytes(lender).toHexString()}`,
      "totalLPB",
      `${lpAwarded}`
    )
    assert.fieldEquals(
      "Lender",
      `${addressToBytes(lender).toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )
  })

})
