import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach,
  logStore,
  beforeAll,
  dataSourceMock
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { handleAddCollateral, handleAddQuoteToken, handleBucketTake, handleBucketTakeLPAwarded, handleDrawDebt, handleKick, handleMoveQuoteToken, handleRepayDebt, handleReserveAuction, handleTake } from "../src/erc-20-pool"
import { createAddCollateralEvent, createAddQuoteTokenEvent, createBucketTakeEvent, createBucketTakeLPAwardedEvent, createDrawDebtEvent, createKickEvent, createMoveQuoteTokenEvent, createRepayDebtEvent, createReserveAuctionEvent, createTakeEvent } from "./utils/erc-20-pool-utils"
import {
  assertBucketUpdate,
  assertLendUpdate,
  assertPoolUpdate,
  createPool,
  mockGetAuctionInfoERC20Pool,
  mockGetBucketInfo,
  mockGetBurnInfo,
  mockGetCurrentBurnEpoch,
  mockGetLPBValueInQuote,
  mockPoolInfoUtilsPoolUpdateCalls
} from "./utils/common"
import { BucketInfo, getBucketId } from "../src/utils/bucket"
import { addressToBytes, bigDecimalExp18, rayToDecimal, wadToDecimal } from "../src/utils/convert"
import { MAX_PRICE, MAX_PRICE_BI, MAX_PRICE_INDEX, ONE_BI, ONE_RAY_BI, ONE_WAD_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../src/utils/constants"
import { Account, Lend, Loan, ReserveAuction } from "../generated/schema"
import { getLendId } from "../src/utils/lend"
import { getLoanId } from "../src/utils/loan"
import { AuctionInfo, getLiquidationAuctionId } from "../src/utils/liquidation"
import { BurnInfo } from "../src/utils/pool"
import { getReserveAuctionId } from "../src/utils/reserve-auction"

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
    const collateralToken = Address.fromString("0x0000000000000000000000000000000000000010")
    const quoteToken = Address.fromString("0x0000000000000000000000000000000000000012")

    createPool(pool_, collateralToken, quoteToken)
  })

  afterEach(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AddCollateral created and stored", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const actor = Address.fromString("0x0000000000000000000000000000000000000001")
    const price = BigInt.fromI32(234)
    const collateralAmount = BigInt.fromI32(234)
    const lpAwarded = BigInt.fromI32(234)
    
    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      price,
      ZERO_BI,
      collateralAmount,
      lpAwarded,
      ZERO_BI,
      ONE_RAY_BI
    )
    mockGetBucketInfo(poolAddress, price, expectedBucketInfo)

    mockGetLPBValueInQuote(poolAddress, lpAwarded, price, lpAwarded)

    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: ZERO_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      pendingInflator: ONE_WAD_BI,
      pendingInterestFactor: ZERO_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: price,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: MAX_PRICE_INDEX,
      reserves: ZERO_BI,
      claimableReserves: ZERO_BI,
      claimableReservesRemaining: ZERO_BI,
      reserveAuctionPrice: ZERO_BI,
      reserveAuctionTimeRemaining: ZERO_BI,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    // mock addCollateralEvent
    const newAddCollateralEvent = createAddCollateralEvent(
      poolAddress,
      actor,
      price,
      collateralAmount,
      lpAwarded
    )
    handleAddCollateral(newAddCollateralEvent)

    assert.entityCount("AddCollateral", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "actor",
      `${actor.toHexString()}`
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

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), price)
    assert.fieldEquals(
      "Bucket",
      `${bucketId.toHexString()}`,
      "collateral",
      `${wadToDecimal(collateralAmount)}`
    )

    // TODO: check pool attributes updated

  })

  test("AddQuoteToken", () => {
    // check entity is unavailable prior to storage
    assert.entityCount("AddQuoteToken", 0)

    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const lender = Address.fromString("0x0000000000000000000000000000000000000002")
    const price = BigInt.fromI32(234)
    const amount = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const lpAwarded = BigInt.fromI32(567)
    const lup = BigInt.fromString("9529276179422528643") // 9.529276179422528643 * 1e18

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      price,
      amount,
      ZERO_BI,
      lpAwarded,
      ZERO_BI,
      ONE_RAY_BI
    )
    mockGetBucketInfo(poolAddress, price, expectedBucketInfo)
    
    const expectedLPBValueInQuote = lpAwarded
    mockGetLPBValueInQuote(poolAddress, lpAwarded, price, expectedLPBValueInQuote)

    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: amount,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      pendingInflator: ONE_WAD_BI,
      pendingInterestFactor: ZERO_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: price,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: lup,
      lupIndex: MAX_PRICE_INDEX, //TODO: indexToPrice(lup)
      reserves: ZERO_BI,
      claimableReserves: ZERO_BI,
      claimableReservesRemaining: ZERO_BI,
      reserveAuctionPrice: ZERO_BI,
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
      price,
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
      "price",
      "234"
    )
    assert.fieldEquals(
      "AddQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      "567529276179422528643"
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
      "9529276179422528643"
    )

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), price)
    assertBucketUpdate({
      id: bucketId,
      collateral: ZERO_BI,
      quoteTokens: amount,
      exchangeRate: ONE_RAY_BI,
      bucketIndex: price,
      lpb: lpAwarded
    })

    // check pool attributes updated
    assertPoolUpdate({
      poolAddress: addressToBytes(poolAddress).toHexString(),
      poolSize: amount,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS.toHexString(),
      inflator: ONE_WAD_BI,
      pendingInflator: ONE_WAD_BI,
      pendingInterestFactor: ZERO_BI,
      currentDebt: ZERO_BI,
      pledgedCollateral: ZERO_BI,
      hpb: ZERO_BI,
      hpbIndex: price,
      htp: ZERO_BI,
      htpIndex: ZERO_BI,
      lup: lup,
      lupIndex: MAX_PRICE_INDEX,
      reserves: ZERO_BI,
      claimableReserves: ZERO_BI,
      claimableReservesRemaining: ZERO_BI,
      reserveAuctionPrice: ZERO_BI,
      reserveAuctionTimeRemaining: ZERO_BI,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI,
      totalBondEscrowed: ZERO_BI,
      // liquidationAuctions: Bytes.fromHexString("0x"),
      txCount: ONE_BI
    })

    // check account attributes updated
    const accountId = addressToBytes(lender)
    const loadedAccount = Account.load(accountId)!
    assert.bytesEquals(addressToBytes(poolAddress), loadedAccount.pools[0])
    assert.fieldEquals(
      "Account",
      `${accountId.toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )

    // check Lend attributes updated
    const lendId = getLendId(bucketId, accountId)
    const loadedLend = Lend.load(lendId)!
    assert.bytesEquals(bucketId, loadedLend.bucket)
    assertLendUpdate({
      id: lendId,
      bucketId: bucketId,
      poolAddress: poolAddress.toHexString(),
      deposit: amount,
      lpb: lpAwarded,
      lpbValueInQuote: lpAwarded
    })
  })

  test("MoveQuoteToken", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const lender = Address.fromString("0x0000000000000000000000000000000000000025")
    const fromBucketIndex = BigInt.fromI32(234)
    const toBucketIndex = BigInt.fromI32(567)
    const amount = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const lpRedeemedFrom = BigInt.fromI32(567).times(ONE_RAY_BI)
    const lpAwardedTo = BigInt.fromI32(567).times(ONE_RAY_BI)
    const lup = BigInt.fromString("9529276179422528643") // 9.529276179422528643 * 1e18

    /***********************/
    /*** Add Quote Token ***/
    /***********************/

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      fromBucketIndex,
      amount,
      ZERO_BI,
      lpRedeemedFrom,
      ZERO_BI,
      ONE_RAY_BI
    )
    mockGetBucketInfo(poolAddress, fromBucketIndex, expectedBucketInfo)

    const expectedLPBValueInQuote = lpRedeemedFrom
    mockGetLPBValueInQuote(poolAddress, lpRedeemedFrom, fromBucketIndex, expectedLPBValueInQuote)

    // mock add quote token event to provide quote that can later be moved
    const newAddQuoteTokenEvent = createAddQuoteTokenEvent(
      poolAddress,
      lender,
      fromBucketIndex,
      amount,
      lpRedeemedFrom,
      lup
    )
    handleAddQuoteToken(newAddQuoteTokenEvent)

    /************************/
    /*** Move Quote Token ***/
    /************************/

    // mock required contract calls
    const expectedFromBucketInfo = new BucketInfo(
      fromBucketIndex,
      amount,
      ZERO_BI,
      lpRedeemedFrom,
      ZERO_BI,
      ONE_RAY_BI
    )
    mockGetBucketInfo(poolAddress, fromBucketIndex, expectedFromBucketInfo)
    const expectedToBucketInfo = new BucketInfo(
      toBucketIndex,
      amount,
      ZERO_BI,
      lpAwardedTo,
      ZERO_BI,
      ONE_RAY_BI
    )
    mockGetBucketInfo(poolAddress, toBucketIndex, expectedToBucketInfo)

    const expectedLPBValueInQuoteFromBucketLend = ZERO_BI
    mockGetLPBValueInQuote(poolAddress, ZERO_BI, fromBucketIndex, expectedLPBValueInQuoteFromBucketLend)

    const expectedLPBValueInQuoteToBucketLend = lpAwardedTo
    mockGetLPBValueInQuote(poolAddress, lpAwardedTo, toBucketIndex, expectedLPBValueInQuoteToBucketLend)

    // mock moveQuoteToken event
    const newMoveQuoteTokenEvent = createMoveQuoteTokenEvent(
      poolAddress,
      lender,
      fromBucketIndex,
      toBucketIndex,
      amount,
      lpRedeemedFrom,
      lpAwardedTo,
      lup
    )
    handleMoveQuoteToken(newMoveQuoteTokenEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    assert.entityCount("MoveQuoteToken", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lender",
      `${lender.toHexString()}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "from",
      `${getBucketId(addressToBytes(poolAddress), fromBucketIndex).toHexString()}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "to",
      `${getBucketId(addressToBytes(poolAddress), toBucketIndex).toHexString()}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      `${amount}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpRedeemedFrom",
      `${lpRedeemedFrom}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpRedeemedFrom",
      `${lpAwardedTo}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${lup}`
    )
  })

  test("DrawDebt", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateralPledged = BigInt.fromI32(1067)
    const lup = BigInt.fromString("9529276179422528643") // 9.529276179422528643 * 1e18

    // mock drawDebt event
    const newDrawDebtEvent = createDrawDebtEvent(
      poolAddress,
      borrower,
      amountBorrowed,
      collateralPledged,
      lup
    )
    handleDrawDebt(newDrawDebtEvent)

    // check DrawDebtEvent attributes
    assert.entityCount("DrawDebt", 1)
    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "DrawDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "borrower",
      "0x0000000000000000000000000000000000000003"
    )
    assert.fieldEquals(
      "DrawDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amountBorrowed",
      `${amountBorrowed}`
    )
    assert.fieldEquals(
      "DrawDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "collateralPledged",
      `${collateralPledged}`
    )
    assert.fieldEquals(
      "DrawDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${lup}`
    )

    // TODO: check bucket attributes updated -> requires handling liquidations

    // check pool attributes updated
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "currentDebt",
      `${wadToDecimal(amountBorrowed)}`
    )
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "lup",
      "9.529276179422528643"
    )
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )

    // check Account attributes updated
    const accountId = addressToBytes(borrower)
    const loadedAccount = Account.load(accountId)!
    assert.bytesEquals(addressToBytes(poolAddress), loadedAccount.pools[0])
    assert.fieldEquals(
      "Account",
      `${accountId.toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )

    // check Loan attributes updated
    const loanId = getLoanId(addressToBytes(poolAddress), accountId)
    const loadedLoan = Loan.load(loanId)!
    assert.bytesEquals(addressToBytes(poolAddress), loadedLoan.pool)
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "collateralDeposited",
      `${wadToDecimal(collateralPledged)}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "debt",
      `${wadToDecimal(amountBorrowed)}`
    )
  })

  test("RepayDebt", () => {
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const quoteRepaid = BigInt.fromI32(567)
    const collateralPulled = BigInt.fromI32(1067)
    const lup = BigInt.fromI32(234)

    const newRepayDebtEvent = createRepayDebtEvent(
      poolAddress,
      borrower,
      quoteRepaid,
      collateralPulled,
      lup
    )
    handleRepayDebt(newRepayDebtEvent)

    // check RepayDebtEvent attributes
    assert.entityCount("RepayDebt", 1)
    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "RepayDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "borrower",
      `${borrower.toHexString()}`
    )
    assert.fieldEquals(
      "RepayDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "quoteRepaid",
      `${quoteRepaid}`
    )
    assert.fieldEquals(
      "RepayDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "collateralPulled",
      `${collateralPulled}`
    )
    assert.fieldEquals(
      "RepayDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${lup}`
    )
  })

  test("Kick", () => {
    // mock event params
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000030")
    const debt = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateral = BigInt.fromString("1067529276179422528643") // 1067.529276179422528643 * 1e18
    const bond = BigInt.fromString("234000000000000000000")

    // TODO: how to access timestamp?
    // mock auction info
    const kicker = Address.fromString("0x0000000000000000000000000000000000000003")
    const bondFactor = ONE_WAD_BI
    const kickTime = BigInt.fromI32(123)
    const kickMomp = BigInt.fromI32(456)
    const neutralPrice = BigInt.fromI32(456)
    const head = Address.fromString("0x0000000000000000000000000000000000000000")
    const next = Address.fromString("0x0000000000000000000000000000000000000000")
    const prev = Address.fromString("0x0000000000000000000000000000000000000000")
    const expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev
    )
    mockGetAuctionInfoERC20Pool(borrower, poolAddress, expectedAuctionInfo)

    // mock kick event
    const newKickEvent = createKickEvent(
      poolAddress,
      kicker,
      borrower,
      debt,
      collateral,
      bond
    )
    handleKick(newKickEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // check KickEvent attributes
    assert.entityCount("Kick", 1)
    assert.fieldEquals(
      "Kick",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "bond",
      `${bond}`
    )

    // check Account attributes updated
    const accountId = addressToBytes(kicker)
    const loadedAccount = Account.load(accountId)!
    assert.bytesEquals(addressToBytes(poolAddress), loadedAccount.pools[0])
    assert.fieldEquals(
      "Account",
      `${accountId.toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )

    // check Loan attributes
    const loanId = getLoanId(addressToBytes(poolAddress), addressToBytes(borrower))
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "inLiquidation",
      `${true}`
    )

    // check LiquidationAuction attributes
    const liquidationAuctionId = getLiquidationAuctionId(addressToBytes(poolAddress), loanId)
    assert.entityCount("LiquidationAuction", 1)
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "borrower",
      `${borrower.toHexString()}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "loan",
      `${loanId.toHexString()}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "kicker",
      `${kicker.toHexString()}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "kick",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000"
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "kickTime",
      `${kickTime}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "bondSize",
      `${wadToDecimal(bond)}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "bondFactor",
      `${wadToDecimal(bondFactor)}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "neutralPrice",
      `${wadToDecimal(neutralPrice)}`
    )

    // TODO: check pool attributes updated
    // assertPoolUpdate({
    //   poolAddress: addressToBytes(poolAddress).toHexString(),
    //   poolSize: debt,
    //   loansCount: ZERO_BI, // should be one while kicked but not settled
    //   maxBorrower: borrower.toHexString(),
    //   inflator: ONE_WAD_BI,
    //   pendingInflator: ONE_WAD_BI,
    //   pendingInterestFactor: ZERO_BI,
    //   currentDebt: ZERO_BI,
    //   pledgedCollateral: ZERO_BI,
    //   hpb: ZERO_BI,
    //   hpbIndex: ZERO_BI,
    //   htp: ZERO_BI,
    //   htpIndex: ZERO_BI,
    //   lup: MAX_PRICE_BI,
    //   lupIndex: MAX_PRICE_INDEX,
    //   reserves: ZERO_BI,
    //   claimableReserves: ZERO_BI,
    //   claimableReservesRemaining: ZERO_BI,
    //   reserveAuctionPrice: ZERO_BI,
    //   reserveAuctionTimeRemaining: ZERO_BI,
    //   minDebtAmount: ZERO_BI,
    //   collateralization: ONE_WAD_BI,
    //   actualUtilization: ZERO_BI,
    //   targetUtilization: ONE_WAD_BI,
    //   totalBondEscrowed: bond,
    //   // liquidationAuctions: liquidationAuctionId,
    //   txCount: ONE_BI
    // })
    
  })

  test("Take", () => {
    // mock event params
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const taker = Address.fromString("0x0000000000000000000000000000000000000009")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000030")
    const amountToTake = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateral = BigInt.fromString("1067529276179422528643") // 1067.529276179422528643 * 1e18
    const bondChange = BigInt.fromString("234000000000000000000")
    const isReward = false

    /********************/
    /*** Kick Auction ***/
    /********************/

    // mock auction info
    const kicker = Address.fromString("0x0000000000000000000000000000000000000003")
    const bond = BigInt.fromString("234000000000000000000")
    const bondFactor = ONE_WAD_BI
    const debt = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const kickTime = BigInt.fromI32(123)
    const kickMomp = BigInt.fromI32(456)
    const neutralPrice = BigInt.fromI32(456)
    const head = Address.fromString("0x0000000000000000000000000000000000000000")
    const next = Address.fromString("0x0000000000000000000000000000000000000000")
    const prev = Address.fromString("0x0000000000000000000000000000000000000000")
    let expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev
    )
    mockGetAuctionInfoERC20Pool(borrower, poolAddress, expectedAuctionInfo)

    // mock kick event
    const newKickEvent = createKickEvent(
      poolAddress,
      kicker,
      borrower,
      debt,
      collateral,
      bond
    )
    handleKick(newKickEvent)

    /********************/
    /*** Take Auction ***/
    /********************/

    // mock auction info
    expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev
    )
    mockGetAuctionInfoERC20Pool(borrower, poolAddress, expectedAuctionInfo)

    // mock take event
    const newTakeEvent = createTakeEvent(
      poolAddress,
      taker,
      borrower,
      amountToTake,
      collateral,
      bondChange,
      isReward
    )
    handleTake(newTakeEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // check TakeEvent attributes
    assert.entityCount("Take", 1)
    assert.fieldEquals(
      "Take",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "taker",
      `${taker.toHexString()}`
    )    
    assert.fieldEquals(
      "Take",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      `${amountToTake}`
    )

    // check kick state updated
    assert.entityCount("Kick", 1)
    assert.fieldEquals(
      "Kick",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "locked",
      `${wadToDecimal(bond)}`
    )    
    assert.fieldEquals(
      "Kick",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "claimable",
      `${0}`
    )
    
    // check Account attributes updated
    const accountId = addressToBytes(taker)
    const loadedAccount = Account.load(accountId)!
    assert.bytesEquals(addressToBytes(poolAddress), loadedAccount.pools[0])
    assert.fieldEquals(
      "Account",
      `${accountId.toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )

    // check Loan attributes
    const loanId = getLoanId(addressToBytes(poolAddress), addressToBytes(borrower))
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "inLiquidation",
      `${true}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "debt",
      `${debt.minus(amountToTake)}`
    )

    // check LiquidationAuction attributes
    const liquidationAuctionId = getLiquidationAuctionId(addressToBytes(poolAddress), loanId)
    assert.entityCount("LiquidationAuction", 1)
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "borrower",
      `${borrower.toHexString()}`
    )
    assert.fieldEquals(
      "LiquidationAuction",
      `${liquidationAuctionId.toHexString()}`,
      "loan",
      `${loanId.toHexString()}`
    )
  })

  test("BucketTake", () => {
    // mock event params
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const taker = Address.fromString("0x0000000000000000000000000000000000000009")
    const takeIndex = BigInt.fromI32(123)
    const borrower = Address.fromString("0x0000000000000000000000000000000000000030")
    const amountToTake = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateral = BigInt.fromString("1067529276179422528643") // 1067.529276179422528643 * 1e18
    const bondChange = BigInt.fromString("234000000000000000000")
    const isReward = false
    const lpAwardedKicker = BigInt.fromString("0")
    const lpAwardedTaker = BigInt.fromString("0")

    /********************/
    /*** Kick Auction ***/
    /********************/

    // mock auction info
    const kicker = Address.fromString("0x0000000000000000000000000000000000000003")
    const bond = BigInt.fromString("234000000000000000000")
    const bondFactor = ONE_WAD_BI
    const debt = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const kickTime = BigInt.fromI32(123)
    const kickMomp = BigInt.fromI32(456)
    const neutralPrice = BigInt.fromI32(456)
    const head = Address.fromString("0x0000000000000000000000000000000000000000")
    const next = Address.fromString("0x0000000000000000000000000000000000000000")
    const prev = Address.fromString("0x0000000000000000000000000000000000000000")
    let expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev
    )
    mockGetAuctionInfoERC20Pool(borrower, poolAddress, expectedAuctionInfo)

    // mock kick event
    const newKickEvent = createKickEvent(
      poolAddress,
      kicker,
      borrower,
      debt,
      collateral,
      bond
    )
    handleKick(newKickEvent)

    /********************/
    /*** Take Auction ***/
    /********************/

    // mock auction info
    expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev
    )
    mockGetAuctionInfoERC20Pool(borrower, poolAddress, expectedAuctionInfo)

    // mock bucket take event
    const newBucketTakeEvent = createBucketTakeEvent(
      poolAddress,
      taker,
      borrower,
      takeIndex,
      amountToTake,
      collateral,
      bondChange,
      isReward
    )
    handleBucketTake(newBucketTakeEvent)

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      takeIndex,
      debt,
      ZERO_BI,
      lpAwardedKicker.plus(lpAwardedTaker),
      ZERO_BI,
      ONE_RAY_BI
    )
    mockGetBucketInfo(poolAddress, takeIndex, expectedBucketInfo)

    const expectedKickerLPBValueInQuote = lpAwardedKicker
    mockGetLPBValueInQuote(poolAddress, lpAwardedKicker, takeIndex, expectedKickerLPBValueInQuote)

    const expectedTakerLPBValueInQuote = lpAwardedTaker
    mockGetLPBValueInQuote(poolAddress, lpAwardedTaker, takeIndex, expectedTakerLPBValueInQuote)

    // mock createBucketTakeLPAwardedEvent
    const newBucketTakeLPAwardedEvent = createBucketTakeLPAwardedEvent(
      poolAddress,
      taker,
      kicker,
      lpAwardedTaker,
      lpAwardedKicker
    )
    handleBucketTakeLPAwarded(newBucketTakeLPAwardedEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // check BucketTakeEvent attributes
    assert.entityCount("BucketTake", 1)
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "taker",
      `${taker.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      `${amountToTake}`
    )
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "collateral",
      `${collateral}`
    )

    // check BucketTakeLPAwarded attributes
    assert.entityCount("BucketTakeLPAwarded", 1)
    assert.fieldEquals(
      "BucketTakeLPAwarded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "taker",
      `${taker.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTakeLPAwarded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTakeLPAwarded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "kicker",
      `${kicker.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTakeLPAwarded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwardedTaker",
      `${lpAwardedTaker}`
    )
    assert.fieldEquals(
      "BucketTakeLPAwarded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwardedKicker",
      `${lpAwardedKicker}`
    )

    // TODO: check lends attributes

    // TODO: check bucket attributes

    // TODO: check LiquidationAuction attributes

  })

  test("Settle", () => {
    // TODO: implement this test
  })

  test("ReserveAuction", () => {
    // mock event params
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const kicker = Address.fromString("0x0000000000000000000000000000000000000008")
    const taker = Address.fromString("0x0000000000000000000000000000000000000018")
    let claimableReservesRemaining = BigInt.fromString("100000000000000000000") // Wad(100)
    const auctionPrice = BigInt.fromI32(456)
    const seventyTwoHours = BigInt.fromString("259200")
    let timestamp = BigInt.fromI32(123)
    let totalInterest = ZERO_BI
    const totalBurnedAtKick = ONE_WAD_BI

    /****************************/
    /*** Kick Reserve Auction ***/
    /****************************/

    // mock pool info contract calls
    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: ONE_WAD_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      pendingInflator: ONE_WAD_BI,
      pendingInterestFactor: ZERO_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: ZERO_BI,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: MAX_PRICE_INDEX, //TODO: indexToPrice(lup)
      reserves: ZERO_BI,
      claimableReserves: claimableReservesRemaining,
      claimableReservesRemaining: claimableReservesRemaining,
      reserveAuctionPrice: auctionPrice,
      reserveAuctionTimeRemaining: seventyTwoHours,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    // mock burnInfo contract calls
    const expectedBurnEpoch = ONE_BI
    mockGetCurrentBurnEpoch(poolAddress, expectedBurnEpoch)

    let expectedBurnInfo = new BurnInfo(
      timestamp,
      totalInterest,
      totalBurnedAtKick
    )
    mockGetBurnInfo(poolAddress, ONE_BI, expectedBurnInfo)

    let newReserveAuctionEvent = createReserveAuctionEvent(
      kicker,
      poolAddress,
      claimableReservesRemaining,
      auctionPrice
    )
    handleReserveAuction(newReserveAuctionEvent)

    /*********************************/
    /*** Assert Reserve Kick State ***/
    /*********************************/

    assert.entityCount("ReserveAuction", 1)

    const reserveAuctionProcessId = getReserveAuctionId(addressToBytes(poolAddress), expectedBurnEpoch)
    assert.entityCount("ReserveAuctionProcess", 1)
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "kicker",
      `${kicker.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "kickerAward",
      `${wadToDecimal(claimableReservesRemaining.times(BigInt.fromString("10000000000000000"))).div(bigDecimalExp18())}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "burnEpoch",
      `${expectedBurnEpoch}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "ajnaBurnedAcrossAllTakes",
      `${0}`
    )

    /****************************/
    /*** Take Reserve Auction ***/
    /****************************/

    const totalBurnedAtTake = BigInt.fromString("100000000000000000000") // Wad(100)
    const claimableReservesRemainingAfterTake = BigInt.fromString("500000000000000000000") // Wad(500)
    const seventyHours = BigInt.fromString("252000")

    // mock pool info contract calls
    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: ONE_WAD_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      pendingInflator: ONE_WAD_BI,
      pendingInterestFactor: ZERO_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: ZERO_BI,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: MAX_PRICE_INDEX, //TODO: indexToPrice(lup)
      reserves: ZERO_BI,
      claimableReserves: claimableReservesRemainingAfterTake,
      claimableReservesRemaining: claimableReservesRemainingAfterTake,
      reserveAuctionPrice: auctionPrice,
      reserveAuctionTimeRemaining: seventyHours,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    timestamp = BigInt.fromI32(456)
    totalInterest = BigInt.fromString("100000000000000000000") // Wad(100)
    expectedBurnInfo = new BurnInfo(
      timestamp,
      totalInterest,
      totalBurnedAtTake
    )
    mockGetBurnInfo(poolAddress, ONE_BI, expectedBurnInfo)

    newReserveAuctionEvent = createReserveAuctionEvent(
      taker,
      poolAddress,
      claimableReservesRemainingAfterTake,
      auctionPrice
    )
    handleReserveAuction(newReserveAuctionEvent)

    /*********************************/
    /*** Assert Reserve Kick State ***/
    /*********************************/

    const kickReserveAuctionID = Bytes.fromHexString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a").concat(addressToBytes(kicker))
    const takeReserveAuctionID = Bytes.fromHexString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a").concat(addressToBytes(taker))
    const loadedKickReserveAuction = ReserveAuction.load(kickReserveAuctionID)!
    const loadedTakeReserveAuction = ReserveAuction.load(takeReserveAuctionID)!
    const incrementalAjnaBurned = wadToDecimal(totalBurnedAtTake.minus(totalBurnedAtKick))

    assert.entityCount("ReserveAuction", 2)
    // assert first kick reserve auction entity
    assert.fieldEquals(
      "ReserveAuction",
      `${kickReserveAuctionID.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${kickReserveAuctionID.toHexString()}`,
      "reserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${kickReserveAuctionID.toHexString()}`,
      "incrementalAjnaBurned",
      `${0}`
    )
    // assert.assertNull(loadedKickReserveAuction.taker) // FIXME: this is failing with a type issue

    // assert second take reserve auction entity
    assert.fieldEquals(
      "ReserveAuction",
      `${takeReserveAuctionID.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${takeReserveAuctionID.toHexString()}`,
      "taker",
      `${taker.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${takeReserveAuctionID.toHexString()}`,
      "reserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${takeReserveAuctionID.toHexString()}`,
      "incrementalAjnaBurned",
      `${incrementalAjnaBurned}`
    )
    // assert.assertNotNull(loadedTakeReserveAuction.taker) // FIXME: this is failing with a type issue

    // assert reserve auction process entity
    assert.entityCount("ReserveAuctionProcess", 1)
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "kicker",
      `${kicker.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "kickerAward",
      `${wadToDecimal(claimableReservesRemaining.times(BigInt.fromString("10000000000000000"))).div(bigDecimalExp18())}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "claimableReservesRemaining",
      `${wadToDecimal(claimableReservesRemainingAfterTake)}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "burnEpoch",
      `${expectedBurnEpoch}`
    )
    assert.fieldEquals(
      "ReserveAuctionProcess",
      `${reserveAuctionProcessId.toHexString()}`,
      "ajnaBurnedAcrossAllTakes",
      `${incrementalAjnaBurned}`
    )

    // check account state
    assert.entityCount("Account", 2)
    assert.fieldEquals(
      "Account",
      `${kicker.toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )
    assert.fieldEquals(
      "Account",
      `${taker.toHexString()}`,
      "txCount",
      `${ONE_BI}`
    )

    // check pool attributed updated
    assertPoolUpdate({
      poolAddress: addressToBytes(poolAddress).toHexString(),
      poolSize: ONE_WAD_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS.toHexString(),
      inflator: ONE_WAD_BI,
      pendingInflator: ONE_WAD_BI,
      pendingInterestFactor: ZERO_BI,
      currentDebt: ZERO_BI,
      pledgedCollateral: ZERO_BI,
      hpb: ZERO_BI,
      hpbIndex: ZERO_BI,
      htp: ZERO_BI,
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: MAX_PRICE_INDEX,
      reserves: ZERO_BI,
      claimableReserves: claimableReservesRemainingAfterTake,
      claimableReservesRemaining: claimableReservesRemainingAfterTake,
      reserveAuctionPrice: auctionPrice,
      reserveAuctionTimeRemaining: seventyHours,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI,
      totalBondEscrowed: ZERO_BI,
      // liquidationAuctions: Bytes.fromHexString("0x"),
      txCount: BigInt.fromI32(2)
    })

  })

})
