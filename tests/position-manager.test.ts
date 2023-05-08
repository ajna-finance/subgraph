import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  dataSourceMock
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { handleApproval, handleMint } from "../src/position-manager"
import { createApprovalEvent, createMemorializePositionEvent, createMintEvent } from "./utils/position-manager-utils"
import { bigIntToBytes } from "../src/utils/convert"
import { mockGetPoolKey } from "./utils/common"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    // set dataSource.network() return value to "goerli"
    dataSourceMock.setNetwork("goerli")
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("Approval created and stored", () => {
    const owner = Address.fromString("0x0000000000000000000000000000000000000001")
    const approved = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    const tokenId = BigInt.fromI32(234)
    const newApprovalEvent = createApprovalEvent(owner, approved, tokenId)
    handleApproval(newApprovalEvent)

    assert.entityCount("Approval", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "Approval",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "owner",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "Approval",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "approved",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "Approval",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "tokenId",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })

  test("Mint", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const newMintEvent = createMintEvent(lender, pool, tokenId)
    handleMint(newMintEvent)

    const expectedTokenId = bigIntToBytes(tokenId).toHexString()

    assert.entityCount("Mint", 1)
    assert.entityCount("Position", 1)

    // check position attributes
    assert.fieldEquals(
      "Position",
      `${expectedTokenId}`,
      "owner",
      `${lender.toHexString()}`
    )
    assert.fieldEquals(
      "Position",
      `${expectedTokenId}`,
      "pool",
      `${pool.toHexString()}`
    )
    assert.fieldEquals(
      "Position",
      `${expectedTokenId}`,
      "token",
      `${expectedTokenId}`
    )
  })

  test("Memorialize", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("Memorialize", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const indexes:BigInt[] = []

    mockGetPoolKey(tokenId, pool)
    const newMemorializeEvent = createMemorializePositionEvent(lender, tokenId, indexes)

    // mint position

    // memorialize add quote token in position?

  })

})
