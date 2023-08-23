import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterEach,
  dataSourceMock,
  logStore,
  beforeEach
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { handleApproval, handleBurn, handleMemorializePosition, handleMint, handleMoveLiquidity, handleRedeemPosition } from "../src/mappings/position-manager"
import { assertPosition, assertPositionLend, createApprovalEvent, createBurnEvent, createMemorializePositionEvent, createMintEvent, createMoveLiquidityEvent, createRedeemPositionEvent, mintPosition } from "./utils/position-manager-utils"
import { bigIntToBytes, wadToDecimal } from "../src/utils/convert"
import { create721Pool, createAndHandleAddQuoteTokenEvent } from "./utils/common"
import { mockGetLPBValueInQuote, mockGetLenderInfo, mockGetPoolKey, mockGetPositionInfo } from "./utils/mock-contract-calls"
import { Lend } from "../generated/schema"
import { getLendId } from "../src/utils/pool/lend"
import { getBucketId } from "../src/utils/pool/bucket"
import { FIVE_PERCENT_BI, TWO_BI, ZERO_BI, positionManagerAddressTable } from "../src/utils/constants"
import { getPositionLendId } from "../src/utils/position"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    // set dataSource.network() return value to "goerli"
    dataSourceMock.setNetwork("goerli")
  })

  beforeEach(() => {
    // deploy pool contract
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
    const expectedCollateralToken = Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81")
    const expectedQuoteToken      = Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    const calldata = Bytes.fromHexString("0xb038d2e1000000000000000000000000c9bceeea5288b2be0b777f4f388f125f55ab5a8100000000000000000000000010aa0cf12aab305bd77ad8f76c037e048b12513b000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000b1a2bc2ec500000000000000000000000000000000000000000000000000000000000000000000")
    create721Pool(pool, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate, calldata)
  })

  afterEach(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("Approval created and stored", () => {
    const owner = Address.fromString("0x0000000000000000000000000000000000000020")
    const approved = Address.fromString(
      "0x0000000000000000000000000000000000000030"
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
      "0x0000000000000000000000000000000000000020"
    )
    assert.fieldEquals(
      "Approval",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "approved",
      "0x0000000000000000000000000000000000000030"
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

    const lender = Address.fromString("0x0000000000000000000000000000000000000020")
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    // check entity count after mint and before burn
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

    // check entity count after burn
    assert.entityCount("Burn", 1)
    assert.entityCount("Mint", 1)
    assert.entityCount("Position", 0)
    assert.entityCount("Token", 3)
  })

  test("Mint", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000020")
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    // check mint attributes
    assert.fieldEquals(
      "Mint",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "lender",
      `${lender.toHexString()}`
    )
    assert.fieldEquals(
      "Mint",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "tokenId",
      `${tokenId}`
    )

    // check entity count
    assert.entityCount("Mint", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("Token", 3)
  })

  test("Memorialize", () => {
    assert.entityCount("Mint", 0)
    assert.entityCount("MemorializePosition", 0)
    assert.entityCount("Position", 0)

    const lender = Address.fromString("0x0000000000000000000000000000000000000020")
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
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

    const lender = Address.fromString("0x0000000000000000000000000000000000000020")
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
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

    const lender = Address.fromString("0x0000000000000000000000000000000000000020")
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
    const tokenId = BigInt.fromI32(234)
    const tokenContractAddress = positionManagerAddressTable.get(dataSource.network())!
    const indexes:BigInt[] = [BigInt.fromI32(5000), BigInt.fromI32(5500)]
    const fromIndex = BigInt.fromI32(5000)
    const toIndex = BigInt.fromI32(4000)
    const lpRedeemedFrom = BigInt.fromString("63380000000000000000") // 63.38
    const lpRedeemedTo = BigInt.fromString("62740000000000000000") // 62.74
    const lpValueInQuote = BigInt.fromString("64380000000000000000")
    const expectedDepositTime = BigInt.fromI32(1000)
    const lup = BigInt.fromString("9529276179422528643")         //   9.529276179422528643 * 1e18
    const lpb = BigInt.fromString("630380000000000000000") // 630.38

    /***********************/
    /*** Add Quote Token ***/
    /***********************/

    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i]
      const amount = index.times(index)
      const price = indexes[i].times(TWO_BI).toBigDecimal()
      const logIndex = BigInt.fromI32(i)

      // create AddQuoteToken and Lend entities for each index
      createAndHandleAddQuoteTokenEvent(pool, lender, index, price, amount, lpb, lup, logIndex)
    }

    /*********************/
    /*** Mint Position ***/
    /*********************/

    // create mint position event
    mintPosition(lender, pool, tokenId, tokenContractAddress)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)
    assert.entityCount("Account", 1)

    /****************************/
    /*** Memorialize Position ***/
    /****************************/

    // mock contract calls
    mockGetPoolKey(tokenId, pool)
    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i]
      mockGetPositionInfo(tokenId, index, expectedDepositTime, lpb)
      mockGetLPBValueInQuote(pool, lpb, index, lpValueInQuote)
    }

    // memorialize existing position
    const newMemorializeEvent = createMemorializePositionEvent(lender, tokenId, indexes)
    handleMemorializePosition(newMemorializeEvent)

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    assert.entityCount("Account", 1)
    assert.entityCount("Mint", 1)
    assert.entityCount("Lend", 2)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("PositionLend", 2)
    assert.entityCount("MoveLiquidity", 0)

    /**********************/
    /*** Move Liquidity ***/
    /**********************/

    // mock contract calls
    mockGetPositionInfo(tokenId, toIndex, expectedDepositTime, lpRedeemedTo)
    mockGetLenderInfo(pool, toIndex, lender, lpRedeemedTo, expectedDepositTime)
    mockGetLPBValueInQuote(pool, lpRedeemedTo, toIndex, lpValueInQuote)
    mockGetLPBValueInQuote(pool, lpRedeemedTo, toIndex, lpValueInQuote)
    mockGetLPBValueInQuote(pool, lpb.minus(lpRedeemedFrom), fromIndex, lpValueInQuote)
    mockGetLPBValueInQuote(pool, lpb.minus(lpRedeemedFrom), fromIndex, lpValueInQuote)

    const newMoveLiquidityEvent = createMoveLiquidityEvent(lender, tokenId, fromIndex, toIndex, lpRedeemedFrom, lpRedeemedTo)
    handleMoveLiquidity(newMoveLiquidityEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // check position attributes
    assertPosition(lender, pool, tokenId, tokenContractAddress)

    // check index attributes
    assertPositionLend(getPositionLendId(tokenId, indexes[1]).toHexString(), getBucketId(pool, indexes[1].toU32()).toHexString(), expectedDepositTime, lpb)
    assertPositionLend(getPositionLendId(tokenId, fromIndex).toHexString(), getBucketId(pool, fromIndex.toU32()).toHexString(), expectedDepositTime, lpb.minus(lpRedeemedFrom))
    assertPositionLend(getPositionLendId(tokenId, toIndex).toHexString(), getBucketId(pool, toIndex.toU32()).toHexString(), expectedDepositTime, lpRedeemedTo)

    assert.entityCount("Account", 1)
    assert.entityCount("Mint", 1)
    assert.entityCount("MemorializePosition", 1)
    assert.entityCount("Position", 1)
    assert.entityCount("PositionLend", 3)
    assert.entityCount("Lend", 3)
    assert.entityCount("MoveLiquidity", 1)
  })

})
