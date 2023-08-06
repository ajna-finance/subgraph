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
import { handleAddCollateralNFT } from "../src/erc-721-pool"
import { createAddCollateralNFTEvent } from "./utils/erc-721-pool-utils"

import { FIVE_PERCENT_BI, MAX_PRICE, MAX_PRICE_BI, MAX_PRICE_INDEX, ONE_BI, ONE_PERCENT_BI, ONE_WAD_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../src/utils/constants"
import { create721Pool, mockGetBucketInfo, mockGetLPBValueInQuote, mockPoolInfoUtilsPoolUpdateCalls, mockTokenBalance } from "./utils/common"
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
    const pool_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const expectedCollateralToken = Address.fromString("0x0000000000000000000000000000000000000010")
    const expectedQuoteToken      = Address.fromString("0x0000000000000000000000000000000000000012")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    create721Pool(pool_, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate)
    // logStore()
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

})
