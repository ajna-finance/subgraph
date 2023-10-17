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
import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { handleAddCollateral, handleAddQuoteToken, handleBucketBankruptcy, handleBucketTake, handleBucketTakeLPAwarded, handleDrawDebt, handleFlashloan, handleKick, handleMoveQuoteToken, handleRepayDebt, handleReserveAuctionKick, handleReserveAuctionTake, handleTake, handleUpdateInterestRate } from "../src/mappings/erc-20-pool"
import { createAddCollateralEvent, createAddQuoteTokenEvent, createBucketBankruptcyEvent, createBucketTakeEvent, createBucketTakeLPAwardedEvent, createDrawDebtEvent, createFlashLoanEvent, createKickEvent, createMoveQuoteTokenEvent, createRepayDebtEvent, createReserveAuctionKickEvent, createReserveAuctionTakeEvent, createTakeEvent, createUpdateInterestRateEvent } from "./utils/erc-20-pool-utils"
import {
  assertBucketUpdate,
  assertLendUpdate,
  assertPoolUpdate,
  createPool
} from "./utils/common"
import { mockGetAuctionInfo, mockGetAuctionStatus, mockGetBorrowerInfo, mockGetBucketInfo, mockGetBurnInfo, mockGetCurrentBurnEpoch, mockGetDebtInfo, mockGetLPBValueInQuote, mockGetLenderInfo, mockGetRatesAndFees, mockPoolInfoUtilsPoolUpdateCalls, mockTokenBalance } from "./utils/mock-contract-calls"
import { BucketInfo, getBucketId } from "../src/utils/pool/bucket"
import { addressToBytes, wadToDecimal } from "../src/utils/convert"
import { FIVE_PERCENT_BI, MAX_PRICE, MAX_PRICE_BI, MAX_PRICE_INDEX, ONE_BI, ONE_PERCENT_BI, ONE_WAD_BI, TWO_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../src/utils/constants"
import { Account, Lend, Loan, Pool } from "../generated/schema"
import { getLendId } from "../src/utils/pool/lend"
import { BorrowerInfo, getLoanId } from "../src/utils/pool/loan"
import { AuctionInfo, AuctionStatus, getLiquidationAuctionId } from "../src/utils/pool/liquidation"
import { BurnInfo, DebtInfo } from "../src/utils/pool/pool"
import { getReserveAuctionId } from "../src/utils/pool/reserve-auction"
import { wdiv, wmul } from "../src/utils/math"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("ERC20Pool assertions", () => {

  beforeAll(() => {
    // set dataSource.network() return value to "goerli" so constant mapping for poolInfoUtils can be accessed
    dataSourceMock.setNetwork("goerli")
  })

  beforeEach(() => {
    // deploy pool contract
    const pool = Address.fromString("0x0000000000000000000000000000000000000001")
    const collateralToken = Address.fromString("0x0000000000000000000000000000000000000010")
    const quoteToken = Address.fromString("0x0000000000000000000000000000000000000012")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    mockGetRatesAndFees(pool, BigInt.fromString("970000000000000000"), BigInt.fromString("55000000000000000"))

    createPool(pool, collateralToken, quoteToken, expectedInitialInterestRate, expectedInitialFeeRate)
  })

  afterEach(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AddCollateral", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const actor = Address.fromString("0x0000000000000000000000000000000000000001")
    const index = BigInt.fromI32(234)
    const price = BigDecimal.fromString("312819781990957000000000000") // 312819781.990957 * 1e18
    const collateralAmount = BigInt.fromString("3196720000000")        // 0.00000319672 * 1e18
    const lpAwarded = BigInt.fromString("3036884000000")               // 0.00000303688 * 1e18
    
    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      index.toU32(),
      price,
      ZERO_BI,
      collateralAmount,
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

    // mock addCollateralEvent
    const newAddCollateralEvent = createAddCollateralEvent(
      poolAddress,
      actor,
      index,
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
      "index",
      "234"
    )
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      `${wadToDecimal(collateralAmount)}`
    )
    assert.fieldEquals(
      "AddCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwarded",
      `${wadToDecimal(lpAwarded)}`
    )

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), index.toU32())
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

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), index.toU32())
    assertBucketUpdate({
      id: bucketId,
      collateral: ZERO_BI,
      deposit: amount,
      exchangeRate: ONE_WAD_BI,
      bucketIndex: index,
      lpb: lpAwarded
    })

    // check pool attributes updated
    assertPoolUpdate({
      poolAddress: addressToBytes(poolAddress).toHexString(),
      poolSize: amount,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS.toHexString(),
      inflator: ONE_WAD_BI,
      t0debt: ZERO_BI,
      pledgedCollateral: ZERO_BI,
      hpb: ZERO_BI,
      hpbIndex: index,
      htp: ZERO_BI,
      htpIndex: ZERO_BI,
      lup: lup,
      lupIndex: BigInt.fromU32(MAX_PRICE_INDEX),
      reserves: ZERO_BI,
      claimableReserves: ZERO_BI,
      claimableReservesRemaining: ZERO_BI,
      minDebtAmount: ZERO_BI,
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
    const expectedDepositTime = newAddQuoteTokenEvent.block.timestamp
    assert.bytesEquals(bucketId, loadedLend.bucket)
    assertLendUpdate({
      id: lendId,
      bucketId: bucketId,
      poolAddress: poolAddress.toHexString(),
      depositTime: expectedDepositTime,
      lpb: lpAwarded,
      lpbValueInQuote: lpAwarded
    })
  })

  test("MoveQuoteToken", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const lender = Address.fromString("0x0000000000000000000000000000000000000025")
    const fromBucketIndex = BigInt.fromI32(234)
    const fromPrice = BigDecimal.fromString("312819781990957000000000000")
    const toBucketIndex = BigInt.fromI32(567)
    const toPrice = BigDecimal.fromString("59428619800395500000000000")
    const amount = BigInt.fromString("567529276179422528643")         // 567.529276179422528643 * 1e18
    const lpRedeemedFrom = BigInt.fromString("527802226846862951638") // 527.802226846862951638 * 1e18
    const lpAwardedTo = BigInt.fromString("538358271383800210670")    // 538.358271383800210670 * 1e18
    const lup = BigInt.fromString("9529276179422528643")              //   9.529276179422528643 * 1e18

    /***********************/
    /*** Add Quote Token ***/
    /***********************/

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      fromBucketIndex.toU32(),
      fromPrice,
      amount,
      ZERO_BI,
      lpRedeemedFrom,
      ZERO_BI,
      ONE_WAD_BI
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
      fromBucketIndex.toU32(),
      fromPrice,
      amount,
      ZERO_BI,
      lpRedeemedFrom,
      ZERO_BI,
      ONE_WAD_BI
    )
    mockGetBucketInfo(poolAddress, fromBucketIndex, expectedFromBucketInfo)
    const expectedToBucketInfo = new BucketInfo(
      toBucketIndex.toU32(),
      toPrice,
      amount,
      ZERO_BI,
      lpAwardedTo,
      ZERO_BI,
      ONE_WAD_BI
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
      `${getBucketId(addressToBytes(poolAddress), fromBucketIndex.toU32()).toHexString()}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "to",
      `${getBucketId(addressToBytes(poolAddress), toBucketIndex.toU32()).toHexString()}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      `${wadToDecimal(amount)}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpRedeemedFrom",
      `${wadToDecimal(lpRedeemedFrom)}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwardedTo",
      `${wadToDecimal(lpAwardedTo)}`
    )
    assert.fieldEquals(
      "MoveQuoteToken",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${wadToDecimal(lup)}`
    )
  })

  test("DrawDebt", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateralPledged = BigInt.fromI32(1067)
    const lup = BigInt.fromString("9529276179422528643") // 9.529276179422528643 * 1e18

    const expectedPoolDebtInfo = new DebtInfo(amountBorrowed, ZERO_BI, ZERO_BI, ZERO_BI)
    mockGetDebtInfo(poolAddress, expectedPoolDebtInfo)

    const inflator = BigInt.fromString("1002804000000000000")
    const expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator), 
      collateralPledged, 
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

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
      `${wadToDecimal(amountBorrowed)}`
    )
    assert.fieldEquals(
      "DrawDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "collateralPledged",
      `${wadToDecimal(collateralPledged)}`
    )
    assert.fieldEquals(
      "DrawDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${wadToDecimal(lup)}`
    )

    // TODO: check bucket attributes updated -> requires handling liquidations

    // check pool attributes updated
    // not dividing by inflator because the PoolInfoUtils mock sets inflator to 1
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "t0debt",
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
      "collateralPledged",
      `${wadToDecimal(collateralPledged)}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "t0debt",
      `${wadToDecimal(wdiv(amountBorrowed, inflator))}`
    )
  })

  test("RepayDebt", () => {
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const quoteRepaid = BigInt.fromString("567111000000000000000")     // 567.111  * 1e18
    const collateralPulled = BigInt.fromString("13400500000000000000") //  13.4005 * 1e18
    const lup = BigInt.fromString("63480000000000000000")              //  63.48   * 1e18

    const expectedBorrowerInfo = new BorrowerInfo(quoteRepaid, collateralPulled, BigInt.fromString("501250000000000000"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

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
      `${wadToDecimal(quoteRepaid)}`
    )
    assert.fieldEquals(
      "RepayDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "collateralPulled",
      `${wadToDecimal(collateralPulled)}`
    )
    assert.fieldEquals(
      "RepayDebt",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${wadToDecimal(lup)}`
    )
  })

  test("Kick", () => {
    // mock event params
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000030")
    const debt = BigInt.fromString("567529276179422528643")        //  567.529276179422528643 * 1e18
    const collateral = BigInt.fromString("1067529276179422528643") // 1067.529276179422528643 * 1e18
    const bond = BigInt.fromString("234000000000000000000")        //  234                    * 1e18

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
    const alreadyTaken = false
    const startPrice = neutralPrice.times(BigInt.fromU32(32))
    const expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev,
      alreadyTaken
    )
    mockGetAuctionInfo(borrower, poolAddress, expectedAuctionInfo)
    const expectedAuctionStatus = new AuctionStatus(
      kickTime,
      collateral,
      debt,
      false,
      startPrice,
      neutralPrice
    )
    mockGetAuctionStatus(poolAddress, borrower, expectedAuctionStatus)

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
      `${wadToDecimal(bond)}`
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
    const liquidationAuctionId = getLiquidationAuctionId(addressToBytes(poolAddress), loanId, ONE_BI)
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
    //   inflator: ONE_WAD_BI,
    //   debt: ZERO_BI,
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
    const alreadyTaken = false

    let expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev,
      false
    )
    mockGetAuctionInfo(borrower, poolAddress, expectedAuctionInfo)

    const inflator = BigInt.fromString("1001530000000000000")
    let expectedBorrowerInfo = new BorrowerInfo(
      wdiv(debt, inflator), 
      collateral, 
      wdiv(neutralPrice, inflator))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

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
      prev,
      alreadyTaken
    )
    mockGetAuctionInfo(borrower, poolAddress, expectedAuctionInfo)
    const expectedAuctionStatus = new AuctionStatus(
      kickTime,
      collateral,
      debt,
      false,
      wmul(neutralPrice, BigInt.fromString("970000000000000000")), // take price = neutral price * 0.97
      neutralPrice
    )
    mockGetAuctionStatus(poolAddress, borrower, expectedAuctionStatus)
    expectedBorrowerInfo = new BorrowerInfo(
      wdiv(debt, inflator), 
      collateral.minus(amountToTake), 
      wdiv(neutralPrice, inflator))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

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
      `${wadToDecimal(amountToTake)}`
    )

    // check kick state updated
    assert.entityCount("Kick", 1)
    assert.fieldEquals(
      "Kick",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "locked",
      `${0}`
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
      "t0debt",
      `${wadToDecimal(wdiv(debt, inflator))}`
    )

    // check LiquidationAuction attributes
    const liquidationAuctionId = getLiquidationAuctionId(addressToBytes(poolAddress), loanId, ONE_BI)
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
    const takePrice = BigDecimal.fromString("544160563095425000000000000")
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
    const alreadyTaken = false
    let expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev,
      alreadyTaken
    )
    mockGetAuctionInfo(borrower, poolAddress, expectedAuctionInfo)

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
      prev,
      alreadyTaken
    )
    mockGetAuctionInfo(borrower, poolAddress, expectedAuctionInfo)
    const expectedAuctionStatus = new AuctionStatus(
      kickTime,
      collateral,
      debt,
      false,
      wmul(neutralPrice, BigInt.fromString("1020000000000000000")), // take price = neutral price * 1.02
      neutralPrice
    )
    mockGetAuctionStatus(poolAddress, borrower, expectedAuctionStatus)

    // mock required contract calls
    const expectedBucketInfo = new BucketInfo(
      takeIndex.toU32(),
      takePrice,
      debt,
      ZERO_BI,
      lpAwardedKicker.plus(lpAwardedTaker),
      ZERO_BI,
      ONE_WAD_BI
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
    // implementation assumes these events happen in succession
    newBucketTakeEvent.transaction.hash = newBucketTakeLPAwardedEvent.transaction.hash
    newBucketTakeEvent.logIndex = newBucketTakeLPAwardedEvent.logIndex.plus(ONE_BI)
    handleBucketTake(newBucketTakeEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // check BucketTakeEvent attributes
    assert.entityCount("BucketTake", 1)
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a02000000",
      "taker",
      `${taker.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a02000000",
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a02000000",
      "amount",
      `${wadToDecimal(amountToTake)}`
    )
    assert.fieldEquals(
      "BucketTake",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a02000000",
      "collateral",
      `${wadToDecimal(collateral)}`
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
      `${wadToDecimal(lpAwardedTaker)}`
    )
    assert.fieldEquals(
      "BucketTakeLPAwarded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lpAwardedKicker",
      `${wadToDecimal(lpAwardedKicker)}`
    )

    // TODO: check lends attributes

    // TODO: check bucket attributes

    // TODO: check LiquidationAuction attributes

  })

  test("Settle", () => {
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
    const alreadyTaken = false
    let expectedAuctionInfo = new AuctionInfo(
      kicker,
      bondFactor,
      bond,
      kickTime,
      kickMomp,
      neutralPrice,
      head,
      next,
      prev,
      alreadyTaken
    )
    mockGetAuctionInfo(borrower, poolAddress, expectedAuctionInfo)

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

  })

  test("ReserveAuction", () => {
    // mock event params
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const kicker = Address.fromString("0x0000000000000000000000000000000000000008")
    const taker = Address.fromString("0x0000000000000000000000000000000000000018")
    const claimableReserves = BigInt.fromString("100000000000000000000") // Wad(100)
    const auctionPrice = BigInt.fromI32(456)
    const seventyTwoHours = BigInt.fromString("259200")
    let timestamp = BigInt.fromI32(123)
    let totalInterest = ZERO_BI
    const totalBurnedAtKick = BigInt.fromString("12000000000000000000") // Wad(12)
    const burnEpoch = BigInt.fromI32(9998101)

    /****************************/
    /*** Kick Reserve Auction ***/
    /****************************/

    // mock pool info contract calls
    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: ONE_WAD_BI,
      debt: ZERO_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      inflator: ONE_WAD_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: ZERO_BI,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI, //TODO: indexToPrice(lup)
      lupIndex: BigInt.fromU32(MAX_PRICE_INDEX),
      momp: BigInt.fromI32(623801),
      reserves: ZERO_BI,
      claimableReserves: claimableReserves,
      claimableReservesRemaining: claimableReserves,
      reserveAuctionPrice: auctionPrice,
      currentBurnEpoch: burnEpoch,
      reserveAuctionTimeRemaining: seventyTwoHours,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    // mock burnInfo contract calls
    mockGetCurrentBurnEpoch(poolAddress, burnEpoch)

    // Pretend the pool already had some AJNA burned.  Kick event should not need to check burn info.
    const pool = Pool.load(Address.fromBytes(poolAddress))!
    pool.totalAjnaBurned = wadToDecimal(totalBurnedAtKick)
    pool.save()

    const kickEvent = createReserveAuctionKickEvent(
      kicker,
      poolAddress,
      claimableReserves,
      auctionPrice,
      burnEpoch,
    )
    handleReserveAuctionKick(kickEvent)

    /*********************************/
    /*** Assert Reserve Kick State ***/
    /*********************************/

    assert.entityCount("ReserveAuctionKick", 1)
    const kickReserveAuctionID = Bytes.fromHexString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a").concat(addressToBytes(kicker))
    const reserveAuctionId     = getReserveAuctionId(addressToBytes(poolAddress), burnEpoch)

    // assert kick reserve auction entity
    assert.fieldEquals(
      "ReserveAuctionKick",
      `${kickReserveAuctionID.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionKick",
      `${kickReserveAuctionID.toHexString()}`,
      "reserveAuction",
      `${reserveAuctionId.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionKick",
      `${kickReserveAuctionID.toHexString()}`,
      "claimableReserves",
      `${wadToDecimal(claimableReserves)}`
    )
    assert.fieldEquals(
      "ReserveAuctionKick",
      `${kickReserveAuctionID.toHexString()}`,
      "kicker",
      `${kicker.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionKick",
      `${kickReserveAuctionID.toHexString()}`,
      "kickerAward",
      `${wadToDecimal(wmul(claimableReserves, ONE_PERCENT_BI))}`
    )

    assert.entityCount("ReserveAuction", 1)
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "claimableReservesRemaining",
      `${wadToDecimal(claimableReserves)}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "burnEpoch",
      `${burnEpoch}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "ajnaBurned",
      `${ZERO_BD}`
    )

    /****************************/
    /*** Take Reserve Auction ***/
    /****************************/

    const totalBurnedAtTake = BigInt.fromString("14000000000000000000") // Wad(14) (2 AJNA burned)
    timestamp = timestamp.plus(BigInt.fromU32(3600 * 2))  // two hours elapsed
    const seventyHours = BigInt.fromString("252000")      // seventy hours remain
    const claimableReservesAfterTake = BigInt.fromString("500000000000000000000") // Wad(500)

    // mock pool info contract calls
    mockPoolInfoUtilsPoolUpdateCalls(poolAddress, {
      poolSize: ONE_WAD_BI,
      debt: ZERO_BI,
      loansCount: ZERO_BI,
      maxBorrower: ZERO_ADDRESS,
      inflator: ONE_WAD_BI,
      hpb: ZERO_BI, //TODO: indexToPrice(price)
      hpbIndex: ZERO_BI,
      htp: ZERO_BI, //TODO: indexToPrice(price)
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: BigInt.fromU32(MAX_PRICE_INDEX), //TODO: indexToPrice(lup)
      momp: BigInt.fromI32(623802),
      reserves: ZERO_BI,
      claimableReserves: claimableReservesAfterTake,
      claimableReservesRemaining: claimableReservesAfterTake,
      reserveAuctionPrice: auctionPrice,
      currentBurnEpoch: burnEpoch,
      reserveAuctionTimeRemaining: seventyHours,
      minDebtAmount: ZERO_BI,
      collateralization: ONE_WAD_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI
    })

    totalInterest = BigInt.fromString("100000000000000000000") // Wad(100)
    const expectedBurnInfo = new BurnInfo(
      timestamp,
      totalInterest,
      totalBurnedAtTake
    )
    mockGetBurnInfo(poolAddress, burnEpoch, expectedBurnInfo)

    const takeEvent = createReserveAuctionTakeEvent(
      taker,
      poolAddress,
      claimableReservesAfterTake,
      auctionPrice,
      burnEpoch,
    )
    handleReserveAuctionTake(takeEvent)

    const takeReserveAuctionID = Bytes.fromHexString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a").concat(addressToBytes(taker))
    const incrementalAjnaBurned = wadToDecimal(totalBurnedAtTake.minus(totalBurnedAtKick))

    // assert take reserve auction entity
    assert.entityCount("ReserveAuctionTake", 1)
    assert.fieldEquals(
      "ReserveAuctionTake",
      `${takeReserveAuctionID.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionTake",
      `${takeReserveAuctionID.toHexString()}`,
      "taker",
      `${taker.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionTake",
      `${takeReserveAuctionID.toHexString()}`,
      "reserveAuction",
      `${reserveAuctionId.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuctionTake",
      `${takeReserveAuctionID.toHexString()}`,
      "ajnaBurned",
      `${incrementalAjnaBurned}`
    )

    // assert reserve auction entity
    assert.entityCount("ReserveAuction", 1)
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "pool",
      `${poolAddress.toHexString()}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "claimableReservesRemaining",
      `${wadToDecimal(claimableReservesAfterTake)}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "burnEpoch",
      `${burnEpoch}`
    )
    assert.fieldEquals(
      "ReserveAuction",
      `${reserveAuctionId.toHexString()}`,
      "ajnaBurned",
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
      t0debt: ZERO_BI,
      pledgedCollateral: ZERO_BI,
      hpb: ZERO_BI,
      hpbIndex: ZERO_BI,
      htp: ZERO_BI,
      htpIndex: ZERO_BI,
      lup: MAX_PRICE_BI,
      lupIndex: BigInt.fromU32(MAX_PRICE_INDEX),
      reserves: ZERO_BI,
      claimableReserves: claimableReservesAfterTake,
      claimableReservesRemaining: claimableReservesAfterTake,
      minDebtAmount: ZERO_BI,
      actualUtilization: ZERO_BI,
      targetUtilization: ONE_WAD_BI,
      totalBondEscrowed: ZERO_BI,
      // liquidationAuctions: Bytes.fromHexString("0x"),
      txCount: BigInt.fromI32(2)
    })
  })

  test("BucketBankruptcy", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const lender = Address.fromString("0x0000000000000000000000000000000000000002")
    const index = BigInt.fromI32(234)
    const price = BigDecimal.fromString("312819781990957000000000000") // 312819781.990957       * 1e18
    const amount = BigInt.fromString("567529276179422528643")          // 567.529276179422528643 * 1e18
    const lpAwarded = BigInt.fromString("544828105132245627497")       // 544.828105132245627497 * 1e18
    const lup = BigInt.fromString("9529276179422528643")               //   9.529276179422528643 * 1e18

    /***********************/
    /*** Add Quote Token ***/
    /***********************/

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

    // mock add quote token event
    const newAddQuoteTokenEvent = createAddQuoteTokenEvent(
      poolAddress,
      lender,
      index,
      amount,
      lpAwarded,
      lup
    )
    mockGetLPBValueInQuote(poolAddress, lpAwarded, index, lpAwarded)
    handleAddQuoteToken(newAddQuoteTokenEvent)

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), index.toU32())
    assertBucketUpdate({
      id: bucketId,
      collateral: ZERO_BI,
      deposit: amount,
      exchangeRate: ONE_WAD_BI,
      bucketIndex: index,
      lpb: lpAwarded
    })
    assert.entityCount("Bucket", 1)

    const accountId = addressToBytes(lender)
    const lendId = getLendId(bucketId, accountId)
    const expectedDepositTime = newAddQuoteTokenEvent.block.timestamp
    assertLendUpdate({
      id: lendId,
      bucketId: bucketId,
      poolAddress: poolAddress.toHexString(),
      depositTime: expectedDepositTime,
      lpb: lpAwarded,
      lpbValueInQuote: lpAwarded
    })
    assert.entityCount("Lend", 1)

    /*************************/
    /*** Bucket Bankruptcy ***/
    /*************************/

    const newBucketBankruptcyEvent = createBucketBankruptcyEvent(
      poolAddress,
      index,
      lpAwarded
    )
    handleBucketBankruptcy(newBucketBankruptcyEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    assertBucketUpdate({
      id: bucketId,
      collateral: ZERO_BI,
      deposit: ZERO_BI,
      exchangeRate: ZERO_BI,
      bucketIndex: index,
      lpb: ZERO_BI
    })
    assert.entityCount("Bucket", 1)
    assert.entityCount("BucketBankruptcy", 1)
    assert.entityCount("Lend", 0)
  })

  test("UpdateInterestRate", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const oldInterestRate = FIVE_PERCENT_BI
    const newInterestRate = BigInt.fromString("55000000000000000") // 0.055 * 1e18

    assert.fieldEquals(
      "Pool",
      `${poolAddress.toHexString()}`,
      "borrowRate",
      `${wadToDecimal(oldInterestRate)}`
    )

    // mock required contract calls
    mockGetRatesAndFees(poolAddress, BigInt.fromString("920000000000000000"), newInterestRate)

    // mock update interest rate event
    const newUpdateInterestRateEvent = createUpdateInterestRateEvent(
      poolAddress,
      oldInterestRate,
      newInterestRate
    )
    handleUpdateInterestRate(newUpdateInterestRateEvent)

    assert.entityCount("Pool", 1)
    assert.entityCount("UpdateInterestRate", 1)

    // check interest rate was updated
    assert.fieldEquals(
      "Pool",
      `${poolAddress.toHexString()}`,
      "borrowRate",
      `${wadToDecimal(newInterestRate)}`
    )
  })

  test("FlashLoan", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const reciever = Address.fromString("0x0000000000000000000000000000000000000002")
    const token = Address.fromString("0x0000000000000000000000000000000000000012")
    const amount = BigInt.fromString("567529276179422528643")          // 567.529276179422528643 * 1e18

    const flashLoanEvent = createFlashLoanEvent(poolAddress, reciever, token, amount)
    handleFlashloan(flashLoanEvent)

    assert.entityCount("Flashloan", 1)

  })

})
