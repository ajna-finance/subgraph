import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterEach,
  dataSourceMock,
  logStore
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { handleApproval, handleBurn, handleMemorializePosition, handleMint, handleMoveLiquidity, handleRedeemPosition } from "../src/position-manager"
import { assertPosition, createApprovalEvent, createBurnEvent, createMemorializePositionEvent, createMintEvent, createMoveLiquidityEvent, createRedeemPositionEvent, mintPosition } from "./utils/position-manager-utils"
import { bigIntToBytes } from "../src/utils/convert"
import { mockGetPoolKey, mockGetTokenName, mockGetTokenSymbol } from "./utils/common"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    // set dataSource.network() return value to "goerli"
    dataSourceMock.setNetwork("goerli")
  })

  afterEach(() => {
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

  test("Burn", () => {
    assert.entityCount("Burn", 0)
    assert.entityCount("Mint", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    assert.entityCount("Burn", 0)
    assert.entityCount("Mint", 1)
    assert.entityCount("Position", 1)

    // burn token
    const newBurnEvent = createBurnEvent(lender, tokenId)
    handleBurn(newBurnEvent)

    // check burn attributes
    assert.fieldEquals(
      "Burn",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "lender",
      `${lender.toHexString()}`
    )
    assert.fieldEquals(
      "Burn",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "tokenId",
      `${tokenId}`
    )

    assert.entityCount("Burn", 1)
    assert.entityCount("Mint", 1)
    // assert.entityCount("Position", 1)
  })

  test("Mint", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    assert.entityCount("Mint", 1)
    assert.entityCount("Position", 1)
  })

  test("Memorialize", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("MemorializePosition", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
    const indexes:BigInt[] = []

    /*********************/
    /*** Mint Position ***/
    /*********************/

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    /****************************/
    /*** Memorialize Position ***/
    /****************************/

    mockGetPoolKey(tokenId, pool)
    // memorialize existing position
    const newMemorializeEvent = createMemorializePositionEvent(lender, tokenId, indexes)
    handleMemorializePosition(newMemorializeEvent)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)
    // TODO: check index attributes

    assert.entityCount("Mint", 1)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
  })

  test("Redeem", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("MemorializePosition", 0)
    assert.entityCount("Position", 0)
    assert.entityCount("RedeemPosition", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
    const indexes:BigInt[] = []

    /*********************/
    /*** Mint Position ***/
    /*********************/

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    /****************************/
    /*** Memorialize Position ***/
    /****************************/

    mockGetPoolKey(tokenId, pool)
    // memorialize existing position
    const newMemorializeEvent = createMemorializePositionEvent(lender, tokenId, indexes)
    handleMemorializePosition(newMemorializeEvent)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)
    // TODO: check index attributes

    assert.entityCount("Mint", 1)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("RedeemPosition", 0)

    /***********************/
    /*** Redeem Position ***/
    /***********************/

    const newRedeemEvent = createRedeemPositionEvent(lender, tokenId, indexes)
    handleRedeemPosition(newRedeemEvent)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)
    // TODO: check index attributes

    assert.entityCount("Mint", 1)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("RedeemPosition", 1)
  })

  test("MoveLiquidity", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("MemorializePosition", 0)
    assert.entityCount("Position", 0)
    assert.entityCount("MoveLiquidity", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000001")
    const pool = Address.fromString("0x0000000000000000000000000000000000000591")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
    const indexes:BigInt[] = []
    const fromIndex = BigInt.fromI32(5000)
    const toIndex = BigInt.fromI32(4000)

    /*********************/
    /*** Mint Position ***/
    /*********************/

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    /****************************/
    /*** Memorialize Position ***/
    /****************************/

    mockGetPoolKey(tokenId, pool)
    // memorialize existing position
    const newMemorializeEvent = createMemorializePositionEvent(lender, tokenId, indexes)
    handleMemorializePosition(newMemorializeEvent)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)
    // TODO: check index attributes

    assert.entityCount("Mint", 1)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("MoveLiquidity", 0)

    /**********************/
    /*** Move Liquidity ***/
    /**********************/

    const newMoveLiquidityEvent = createMoveLiquidityEvent(lender, tokenId, fromIndex, toIndex)
    handleMoveLiquidity(newMoveLiquidityEvent)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)
    // TODO: check index attributes

    assert.entityCount("Mint", 1)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("MoveLiquidity", 1)
  })

})
