import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach,
  beforeAll,
  dataSourceMock,
  logStore,
} from "matchstick-as/assembly/index"
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import { AddCollateralNFT } from "../generated/schema"
import { AddCollateralNFT as AddCollateralNFTEvent } from "../generated/templates/ERC721Pool/ERC721Pool"
import { handleAddCollateralNFT, handleAddQuoteToken } from "../src/erc-721-pool"
import { createAddCollateralNFTEvent, createAddQuoteTokenEvent } from "./utils/erc-721-pool-utils"

import { FIVE_PERCENT_BI, MAX_PRICE, MAX_PRICE_BI, MAX_PRICE_INDEX, ONE_BI, ONE_PERCENT_BI, ONE_WAD_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../src/utils/constants"
import { create721Pool, createPool, mockGetBucketInfo, mockGetLPBValueInQuote, mockGetRatesAndFees, mockPoolInfoUtilsPoolUpdateCalls, mockTokenBalance } from "./utils/common"
import { BucketInfo } from "../src/utils/pool/bucket"
import { wadToDecimal } from "../src/utils/convert"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {

  beforeAll(() => {
    // set dataSource.network() return value to "goerli" so constant mapping for poolInfoUtils can be accessed
    dataSourceMock.setNetwork("goerli")
  })

  beforeEach(() => {
    // deploy pool contract
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
    const erc20Pool = Address.fromString("0x0000000000000000000000000000000000000100")
    const expectedCollateralToken = Address.fromString("0x0000000000000000000000000000000000000010")
    const expectedQuoteToken      = Address.fromString("0x0000000000000000000000000000000000000012")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    create721Pool(pool, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate)
    // DEPLOY ERC20 pool as well and ensure the templates don't collide
    mockGetRatesAndFees(erc20Pool, BigInt.fromString("970000000000000000"), BigInt.fromString("55000000000000000"))
    createPool(erc20Pool, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate)
  })

  afterEach(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AddCollateralNFT created and stored", () => {
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const actor = Address.fromString("0x0000000000000000000000000000000000000003")
    const index = BigInt.fromI32(234)
    const price = BigDecimal.fromString("312819781990957000000000000") // 312819781.990957 * 1e18
    const tokenIds = [BigInt.fromI32(234)]
    const lpAwarded = BigInt.fromString("3036884000000")               // 0.00000303688 * 1e18

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      index.toU32(),
      price,
      ZERO_BI,
      ONE_WAD_BI, // one tokenId used is tracked as one WAD
      lpAwarded,
      ZERO_BI,
      ONE_WAD_BI
    )
    mockGetBucketInfo(poolAddress, index, expectedBucketInfo)

    mockGetLPBValueInQuote(poolAddress, lpAwarded, index, lpAwarded)

    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: ZERO_BI,
      debt: ZERO_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      inflator: ONE_WAD_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: index,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: BigInt.fromU32(MAX_PRICE_INDEX),
      momp: BigInt.fromU32(623804),
      reserves: ZERO_BI,
      claimableReserves: ZERO_BI,
      claimableReservesRemaining: ZERO_BI,
      reserveAuctionPrice: ZERO_BI,
      currentBurnEpoch: BigInt.fromI32(9998102),
      reserveAuctionTimeRemaining: ZERO_BI,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    mockTokenBalance(Address.fromString("0x0000000000000000000000000000000000000012"), poolAddress, ZERO_BI)
    mockTokenBalance(Address.fromString("0x0000000000000000000000000000000000000010"), poolAddress, ZERO_BI)

    const newAddCollateralNFTEvent = createAddCollateralNFTEvent(
      poolAddress,
      actor,
      index,
      tokenIds,
      lpAwarded
    )
    handleAddCollateralNFT(newAddCollateralNFTEvent)

    assert.entityCount("AddCollateralNFT", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AddCollateralNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "actor",
      "0x0000000000000000000000000000000000000003"
    )
    assert.fieldEquals(
      "AddCollateralNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "index",
      "234"
    )
    assert.fieldEquals(
      "AddCollateralNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "tokenIds",
      "[234]"
    )
    assert.fieldEquals(
      "AddCollateralNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwarded",
      `${wadToDecimal(lpAwarded)}`
    )
  })

  test("AddQuoteToken", () => {
    // check entity is unavailable prior to storage
    assert.entityCount("AddQuoteToken", 0)

    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const lender = Address.fromString("0x0000000000000000000000000000000000000002")
    const index = BigInt.fromI32(234)
    const price = BigDecimal.fromString("312819781990957000000000000")
    const amount = BigInt.fromString("567529276179422528643")    // 567.529276179422528643 * 1e18
    const lpAwarded = BigInt.fromString("533477519608657176924") // 533.477519608657176924 * 1e18
    const lup = BigInt.fromString("9529276179422528643")         //   9.529276179422528643 * 1e18

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      index.toU32(),
      price,
      amount,
      ZERO_BI,
      lpAwarded,
      ZERO_BI,
      ONE_WAD_BI
    )
    mockGetBucketInfo(poolAddress, index, expectedBucketInfo)

    const expectedLPBValueInQuote = lpAwarded
    mockGetLPBValueInQuote(poolAddress, lpAwarded, index, expectedLPBValueInQuote)

    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: amount,
      debt: ZERO_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      inflator: ONE_WAD_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: index,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: lup,
      lupIndex: BigInt.fromU32(MAX_PRICE_INDEX), //TODO: indexToPrice(lup)
      momp: BigInt.fromI32(623803),
      reserves: ZERO_BI,
      claimableReserves: ZERO_BI,
      claimableReservesRemaining: ZERO_BI,
      reserveAuctionPrice: ZERO_BI,
      currentBurnEpoch: BigInt.fromI32(9998103),
      reserveAuctionTimeRemaining: ZERO_BI,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    // mock add quote token event
    const newAddQuoteTokenEvent = createAddQuoteTokenEvent(
      poolAddress,
      lender,
      index,
      amount,
      lpAwarded,
      lup
    )
    handleAddQuoteToken(newAddQuoteTokenEvent)

    // check AddQuoteTokenEvent attributes
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
      "index",
      "234"
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      `${wadToDecimal(amount)}`
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwarded",
      `${wadToDecimal(lpAwarded)}`
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${wadToDecimal(lup)}`
    )
  })

})
