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
import { Account, Lend, Loan } from "../generated/schema"
import { handleAddCollateralNFT, handleAddQuoteToken, handleDrawDebtNFT, handleRepayDebt, handleMergeOrRemoveCollateralNFT, handleRemoveCollateral, handleKick, handleAuctionNFTSettle, handleSettle, handleTake, handleBucketTakeLPAwarded, handleBucketTake } from "../src/erc-721-pool"
import { createAddCollateralNFTEvent, createAddQuoteTokenEvent, createDrawDebtNFTEvent, createRepayDebtEvent, createMergeOrRemoveCollateralNFTEvent, createRemoveCollateralEvent, createKickEvent, createAuctionNFTSettleEvent, createSettleEvent, createTakeEvent, createBucketTakeEvent, createBucketTakeLPAwardedEvent } from "./utils/erc-721-pool-utils"

import { FIVE_PERCENT_BI, MAX_PRICE, MAX_PRICE_BI, MAX_PRICE_INDEX, ONE_BI, ONE_PERCENT_BI, ONE_WAD_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../src/utils/constants"
import { assertBucketUpdate, assertLendUpdate, create721Pool, createPool, mockGetAuctionInfo, mockGetAuctionStatus, mockGetBorrowerInfo, mockGetBucketInfo, mockGetDebtInfo, mockGetLPBValueInQuote, mockGetRatesAndFees, mockPoolInfoUtilsPoolUpdateCalls, mockTokenBalance } from "./utils/common"
import { BucketInfo, getBucketId } from "../src/utils/pool/bucket"
import { addressToBytes, wadToDecimal } from "../src/utils/convert"
import { DebtInfo } from "../src/utils/pool/pool"
import { BorrowerInfo, getLoanId } from "../src/utils/pool/loan"
import { wdiv, wmul } from "../src/utils/math"
import { getLendId } from "../src/utils/pool/lend"
import { AuctionInfo, AuctionStatus, getLiquidationAuctionId } from "../src/utils/pool/liquidation"

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
    const expectedCollateralToken = Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81")
    const expectedQuoteToken      = Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B")
    const expectedInitialInterestRate = FIVE_PERCENT_BI
    const expectedInitialFeeRate = ZERO_BI

    const calldata = Bytes.fromHexString("0xb038d2e1000000000000000000000000c9bceeea5288b2be0b777f4f388f125f55ab5a8100000000000000000000000010aa0cf12aab305bd77ad8f76c037e048b12513b000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000b1a2bc2ec500000000000000000000000000000000000000000000000000000000000000000000")
    create721Pool(pool, expectedCollateralToken, expectedQuoteToken, expectedInitialInterestRate, expectedInitialFeeRate, calldata)

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

    mockTokenBalance(Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B"), poolAddress, ZERO_BI)
    mockTokenBalance(Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81"), poolAddress, ZERO_BI)

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

  test("DrawDebtNFT", () => {
    // check entity is unavailable prior to storage
    assert.entityCount("DrawDebtNFT", 0)

    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const tokenIdsPledged = [BigInt.fromI32(234), BigInt.fromI32(345)]
    const amountPledged = BigInt.fromString("2000000000000000000")
    const lup = BigInt.fromString("9529276179422528643") //   9.529276179422528643 * 1e18

    // mock required contract calls
    const expectedPoolDebtInfo = new DebtInfo(amountBorrowed, ZERO_BI, ZERO_BI, ZERO_BI)
    mockGetDebtInfo(poolAddress, expectedPoolDebtInfo)

    const inflator = BigInt.fromString("1002804000000000000")
    const expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator),
      amountPledged,
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    const newDrawDebtEvent = createDrawDebtNFTEvent(
      poolAddress,
      borrower,
      amountBorrowed,
      tokenIdsPledged,
      lup
    )
    handleDrawDebtNFT(newDrawDebtEvent)

    // check DrawDebtNFT entity
    assert.entityCount("DrawDebtNFT", 1)
    assert.fieldEquals(
      "DrawDebtNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "borrower",
      "0x0000000000000000000000000000000000000003"
    )
    assert.fieldEquals(
      "DrawDebtNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "lup",
      `${wadToDecimal(lup)}`
    )
    assert.fieldEquals(
      "DrawDebtNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "tokenIdsPledged",
      "[234, 345]"
    )
    assert.fieldEquals(
      "DrawDebtNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amountBorrowed",
      `${wadToDecimal(amountBorrowed)}`
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

    // check Loan entity
    const loanId = getLoanId(addressToBytes(poolAddress), accountId)
    const loadedLoan = Loan.load(loanId)!
    assert.bytesEquals(addressToBytes(poolAddress), loadedLoan.pool)
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "collateralPledged",
      `${wadToDecimal(amountPledged)}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345]"
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "t0debt",
      `${wadToDecimal(wdiv(amountBorrowed, inflator))}`
    )

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
    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "tokenIdsPledged",
      "[234, 345]"
    )
  })

  test("RepayDebt", () => {
    // check entities are unavailable prior to storage
    assert.entityCount("DrawDebtNFT", 0)
    assert.entityCount("RepayDebt", 0)

    /*****************/
    /*** Draw Debt ***/
    /*****************/

    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const tokenIdsPledged = [BigInt.fromI32(234), BigInt.fromI32(345)]
    const amountPledged = BigInt.fromString("2000000000000000000")
    let lup = BigInt.fromString("9529276179422528643") //   9.529276179422528643 * 1e18

    // mock required contract calls
    const expectedPoolDebtInfo = new DebtInfo(amountBorrowed, ZERO_BI, ZERO_BI, ZERO_BI)
    mockGetDebtInfo(poolAddress, expectedPoolDebtInfo)

    const inflator = BigInt.fromString("1002804000000000000")
    let expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator),
      amountPledged,
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    const newDrawDebtEvent = createDrawDebtNFTEvent(
      poolAddress,
      borrower,
      amountBorrowed,
      tokenIdsPledged,
      lup
    )
    handleDrawDebtNFT(newDrawDebtEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // set expected addresses
    const expectedPoolAddress = addressToBytes(poolAddress)
    const accountId = addressToBytes(borrower)
    const loanId = getLoanId(expectedPoolAddress, accountId)
    let loadedLoan = Loan.load(loanId)!

    assert.fieldEquals(
      "Pool",
      `${addressToBytes(poolAddress).toHexString()}`,
      "tokenIdsPledged",
      "[234, 345]"
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345]"
    )

    /******************/
    /*** Repay Debt ***/
    /******************/

    // mock parameters
    const quoteRepaid = BigInt.fromString("567111000000000000000")     // 567.111  * 1e18
    const collateralPulled = BigInt.fromString("1000000000000000000") //  1 * 1e18

    expectedBorrowerInfo = new BorrowerInfo(quoteRepaid, collateralPulled, BigInt.fromString("501250000000000000"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    const newRepayDebtEvent = createRepayDebtEvent(
      poolAddress,
      borrower,
      quoteRepaid,
      collateralPulled,
      lup
    )
    handleRepayDebt(newRepayDebtEvent)

    /********************/
    /*** Assert State ***/
    /********************/

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

    // check pool attributes updated
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "t0debt",
      `${wadToDecimal(amountBorrowed)}`
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "lup",
      `${wadToDecimal(lup)}`
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "txCount",
      `${BigInt.fromI32(2)}`
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[234]"
    )

    // check Account attributes updated
    assert.entityCount("Account", 1)
    const loadedAccount = Account.load(accountId)!
    assert.bytesEquals(expectedPoolAddress, loadedAccount.pools[0])
    assert.fieldEquals(
      "Account",
      `${accountId.toHexString()}`,
      "txCount",
      `${BigInt.fromI32(2)}`
    )

    // check loan attributes
    assert.entityCount("Loan", 1)
    loadedLoan = Loan.load(loanId)!
    assert.bytesEquals(expectedPoolAddress, loadedLoan.pool)
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "collateralPledged",
      `${wadToDecimal(amountPledged.minus(collateralPulled))}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234]" // last tokenId should have been target of pop()
    )
  })

  test("RemoveCollateral", () => {
    assert.entityCount("AddCollateralNFT", 0)
    assert.entityCount("RemoveCollateral", 0)

    /**********************/
    /*** Add Collateral ***/
    /**********************/

    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const actor = Address.fromString("0x0000000000000000000000000000000000000003")
    const index = BigInt.fromI32(234)
    const price = BigDecimal.fromString("312819781990957000000000000") // 312819781.990957 * 1e18
    const tokenIds = [BigInt.fromI32(234), BigInt.fromI32(456), BigInt.fromI32(789)]
    const lpAwarded = BigInt.fromString("3036884000000")               // 0.00000303688 * 1e18

    const expectedCollateralAmountWad = BigInt.fromString('1000000000000000000').times(BigInt.fromI32(tokenIds.length))

    // mock required contract calls
    let expectedBucketInfo = new BucketInfo(
      index.toU32(),
      price,
      ZERO_BI,
      expectedCollateralAmountWad, // 3 * 1e18
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

    mockTokenBalance(Address.fromString("0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B"), poolAddress, ZERO_BI)
    mockTokenBalance(Address.fromString("0xC9bCeeEA5288b2BE0b777F4F388F125F55aB5a81"), poolAddress, ZERO_BI)

    const newAddCollateralNFTEvent = createAddCollateralNFTEvent(
      poolAddress,
      actor,
      index,
      tokenIds,
      lpAwarded
    )
    handleAddCollateralNFT(newAddCollateralNFTEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    assert.fieldEquals(
      "AddCollateralNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "actor",
      `${actor.toHexString()}`
    )
    assert.fieldEquals(
      "AddCollateralNFT",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "tokenIds",
      "[234, 456, 789]"
    )

    /*************************/
    /*** Remove Collateral ***/
    /*************************/

    // mock parameters
    const collateralRemoved = BigInt.fromString("2000000000000000000") // 2 * 1e18
    const lpRedeemed = BigInt.fromString("2036884000000")       // 0.00000203688 * 1e18
    const expectedRemainingLPB = lpAwarded.minus(lpRedeemed)

    // mock required contract calls
    expectedBucketInfo = new BucketInfo(
      index.toU32(),
      price,
      ZERO_BI,
      ONE_WAD_BI, // 3 * 1e18
      expectedRemainingLPB,
      ZERO_BI,
      ONE_WAD_BI
    )
    mockGetBucketInfo(poolAddress, index, expectedBucketInfo)

    mockGetLPBValueInQuote(poolAddress, expectedRemainingLPB, index, lpRedeemed)

    const newRemoveCollateralEvent = createRemoveCollateralEvent(poolAddress, actor, index, collateralRemoved, lpRedeemed)
    handleRemoveCollateral(newRemoveCollateralEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // set expected addresses
    const expectedPoolAddress = addressToBytes(poolAddress)
    const accountId = addressToBytes(actor)
    const bucketId = getBucketId(expectedPoolAddress, index.toU32())

    // check RemoveCollateralEvent attributes
    assert.entityCount("RemoveCollateral", 1)
    assert.fieldEquals(
      "RemoveCollateral",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "claimer",
      `${actor.toHexString()}`
    )

    // check pool attributes updated
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "t0debt",
      `${0}`
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[]"
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "bucketTokenIds",
      "[234]"
    )

    // check bucket attributes updated
    assertBucketUpdate({
      id: bucketId,
      collateral: ONE_WAD_BI,
      deposit: ZERO_BI,
      exchangeRate: ONE_WAD_BI,
      bucketIndex: index,
      lpb: expectedRemainingLPB
    })

    // check Lend attributes updated
    assert.entityCount("Lend", 1)
    const lendId = getLendId(bucketId, accountId)
    const loadedLend = Lend.load(lendId)!
    assert.bytesEquals(bucketId, loadedLend.bucket)
    assertLendUpdate({
      id: lendId,
      bucketId: bucketId,
      poolAddress: poolAddress.toHexString(),
      lpb: expectedRemainingLPB,
      lpbValueInQuote: lpRedeemed
    })

  })

  test("Kick, Take, and Settle", () => {

    // check entities are unavailable prior to storage
    assert.entityCount("Account", 0)
    assert.entityCount("DrawDebtNFT", 0)
    assert.entityCount("Loan", 0)
    assert.entityCount("LiquidationAuction", 0)
    assert.entityCount("Kick", 0)
    assert.entityCount("Take", 0)
    assert.entityCount("Settle", 0)
    assert.entityCount("AuctionNFTSettle", 0)

    // mock addresses
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000030")
    const kicker = Address.fromString("0x0000000000000000000000000000000000000079")
    const settler = Address.fromString("0x0000000000000000000000000000000000000049")
    const taker = Address.fromString("0x0000000000000000000000000000000000000009")

    /*****************/
    /*** Draw Debt ***/
    /*****************/

    // DrawDebt event params
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const tokenIdsPledged = [BigInt.fromI32(234), BigInt.fromI32(345), BigInt.fromI32(456), BigInt.fromI32(567), BigInt.fromI32(789)]
    const amountPledged = BigInt.fromString("5000000000000000000") // 5 * 1e18
    const lup = BigInt.fromString("9529276179422528643") //   9.529276179422528643 * 1e18

    // mock required contract calls
    const expectedPoolDebtInfo = new DebtInfo(amountBorrowed, ZERO_BI, ZERO_BI, ZERO_BI)
    mockGetDebtInfo(poolAddress, expectedPoolDebtInfo)

    let inflator = BigInt.fromString("1002804000000000000")
    let expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator),
      amountPledged,
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    // create and handle DrawDebt event
    const newDrawDebtEvent = createDrawDebtNFTEvent(
      poolAddress,
      borrower,
      amountBorrowed,
      tokenIdsPledged,
      lup
    )
    handleDrawDebtNFT(newDrawDebtEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    const expectedPoolAddress = addressToBytes(poolAddress)
    const loanId = getLoanId(expectedPoolAddress, addressToBytes(borrower))

    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345, 456, 567, 789]"
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345, 456, 567, 789]"
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "bucketTokenIds",
      "[]"
    )

    /********************/
    /*** Kick Auction ***/
    /********************/

    // mock Kick event params
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

    // mock required contract calls
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

    const expectedAuctionStatus = new AuctionStatus(
      kickTime,
      amountPledged,
      debt,
      false,
      wmul(neutralPrice, BigInt.fromString("1020000000000000000")), // take price = neutral price * 1.02
      neutralPrice
    )
    mockGetAuctionStatus(poolAddress, borrower, expectedAuctionStatus)

    // create and handle Kick event
    const newKickEvent = createKickEvent(
      poolAddress,
      kicker,
      borrower,
      debt,
      amountPledged,
      bond
    )
    handleKick(newKickEvent)

    /********************/
    /*** Take Auction ***/
    /********************/

    const amountToTake = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateralToTake = BigInt.fromString("3967529276179422528") // 3.967529276179422528 * 1e18
    const bondChange = BigInt.fromString("234000000000000000000")

    const isReward = false

    // need to update mock borrower info to reflect reduced collateral to ensure that the expected tokenId rebalancing occurs
    inflator = BigInt.fromString("1002804000000000000")
    expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator),
      amountPledged.minus(collateralToTake),
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    // create and handle Take event
    const newTakeEvent = createTakeEvent(
      poolAddress,
      taker,
      borrower,
      amountToTake,
      collateralToTake,
      bondChange,
      isReward
    )
    handleTake(newTakeEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    const liquidationAuctionId = getLiquidationAuctionId(addressToBytes(poolAddress), loanId, ONE_BI)
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
      "settled",
      `${false}`
    )

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
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234]"
    )

    // check Pool attributes
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[234]"
    )
    // check Pool attributes
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "bucketTokenIds",
      "[345]" // since borrower collateral was > 1 but < 2 after take their last tokenId should have been popped and transferred to bucketTokenIds
    )

    /**********************/
    /*** Settle Auction ***/
    /**********************/

    const lp = BigInt.fromString("3036884000000") // 0.000003036884 * 1e18
    const index = BigInt.fromI32(234)

    // create and handle Settle event
    const newSettleEvent = createSettleEvent(poolAddress, settler, borrower, amountBorrowed)
    handleSettle(newSettleEvent)

    // create and handle AuctionNFTSettleEvent event
    const newAuctionNFTSettleEvent = createAuctionNFTSettleEvent(poolAddress, borrower, amountBorrowed, lp, index)
    handleAuctionNFTSettle(newAuctionNFTSettleEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    // check entities have been stored
    assert.entityCount("Account", 4)
    assert.entityCount("DrawDebtNFT", 1)
    assert.entityCount("Loan", 1)
    assert.entityCount("LiquidationAuction", 1)
    assert.entityCount("Kick", 1)
    assert.entityCount("Take", 1)
    assert.entityCount("Settle", 1)
    assert.entityCount("AuctionNFTSettle", 1)

    // check Take state
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
    assert.fieldEquals(
      "Take",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "collateral",
      `${wadToDecimal(collateralToTake)}`
    )

    // check Loan attributes
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "inLiquidation",
      `${false}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "t0debt",
      `${0}`
    )
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234]"
    )

    // check Pool attributes
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[234]"
    )
    // check Pool attributes
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "bucketTokenIds",
      "[345]" // since tokenIds were already rebalance in Take, no additional rebalancing should occur in AuctionNFTSettle
    )

    // check LiquidationAuction state
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
      "settled",
      `${true}`
    )
  })

  test("Add Liquidity, Kick, BucketTake", () => {

    // check entities are unavailable prior to storage
    assert.entityCount("Account", 0)
    assert.entityCount("DrawDebtNFT", 0)
    assert.entityCount("Loan", 0)
    assert.entityCount("LiquidationAuction", 0)
    assert.entityCount("Kick", 0)
    assert.entityCount("Take", 0)
    assert.entityCount("Settle", 0)
    assert.entityCount("AuctionNFTSettle", 0)

    // mock addresses
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000030")
    const kicker = Address.fromString("0x0000000000000000000000000000000000000079")
    const lender = Address.fromString("0x0000000000000000000000000000000000000089") 
    const settler = Address.fromString("0x0000000000000000000000000000000000000049")
    const taker = Address.fromString("0x0000000000000000000000000000000000000009")

    /***********************/
    /*** Add Quote Token ***/
    /***********************/

    // AddQuoteToken event params
    const index = BigInt.fromI32(234)
    const price = BigDecimal.fromString("312819781990957000000000000")
    const amount = BigInt.fromString("567529276179422528643")    // 567.529276179422528643 * 1e18
    const lpAwarded = BigInt.fromString("533477519608657176924") // 533.477519608657176924 * 1e18
    const lup = BigInt.fromString("9529276179422528643")         //   9.529276179422528643 * 1e18

    // mock required contract calls
    let expectedBucketInfo = new BucketInfo(
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

    /*****************/
    /*** Draw Debt ***/
    /*****************/

    // DrawDebt event params
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const tokenIdsPledged = [BigInt.fromI32(234), BigInt.fromI32(345), BigInt.fromI32(456), BigInt.fromI32(567), BigInt.fromI32(789)]
    const amountPledged = BigInt.fromString("5000000000000000000") // 5 * 1e18

    // mock required contract calls
    const expectedPoolDebtInfo = new DebtInfo(amountBorrowed, ZERO_BI, ZERO_BI, ZERO_BI)
    mockGetDebtInfo(poolAddress, expectedPoolDebtInfo)

    let inflator = BigInt.fromString("1002804000000000000")
    let expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator),
      amountPledged,
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    // create and handle DrawDebt event
    const newDrawDebtEvent = createDrawDebtNFTEvent(
      poolAddress,
      borrower,
      amountBorrowed,
      tokenIdsPledged,
      lup
    )
    handleDrawDebtNFT(newDrawDebtEvent)

    /********************/
    /*** Assert State ***/
    /********************/

    const expectedPoolAddress = addressToBytes(poolAddress)
    const loanId = getLoanId(expectedPoolAddress, addressToBytes(borrower))

    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345, 456, 567, 789]"
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345, 456, 567, 789]"
    )
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "bucketTokenIds",
      "[]"
    )

    /********************/
    /*** Kick Auction ***/
    /********************/

    // mock Kick event params
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

    // mock required contract calls
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

    const expectedAuctionStatus = new AuctionStatus(
      kickTime,
      amountPledged,
      debt,
      false,
      wmul(neutralPrice, BigInt.fromString("1020000000000000000")), // take price = neutral price * 1.02
      neutralPrice
    )
    mockGetAuctionStatus(poolAddress, borrower, expectedAuctionStatus)

    // create and handle Kick event
    const newKickEvent = createKickEvent(
      poolAddress,
      kicker,
      borrower,
      debt,
      amountPledged,
      bond
    )
    handleKick(newKickEvent)

    /*******************/
    /*** Bucket Take ***/
    /*******************/

    const amountToTake = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const bondChange = BigInt.fromString("234000000000000000000")
    const collateralToTake = BigInt.fromString("2967529276179422528") // 2.967529276179422528 * 1e18
    const lpAwardedKicker = BigInt.fromString("0")
    const lpAwardedTaker = BigInt.fromString("0")
    const isReward = true

    // mock required contract calls
    expectedBucketInfo = new BucketInfo(
      index.toU32(),
      price,
      debt,
      ZERO_BI,
      lpAwarded.plus(lpAwardedTaker),
      ZERO_BI,
      ONE_WAD_BI
    )
    mockGetBucketInfo(poolAddress, index, expectedBucketInfo)

    const expectedKickerLPBValueInQuote = lpAwardedKicker
    mockGetLPBValueInQuote(poolAddress, lpAwardedKicker, index, expectedKickerLPBValueInQuote)

    const expectedTakerLPBValueInQuote = lpAwardedTaker
    mockGetLPBValueInQuote(poolAddress, lpAwardedTaker, index, expectedTakerLPBValueInQuote)

    // mock createBucketTakeLPAwardedEvent
    const newBucketTakeLPAwardedEvent = createBucketTakeLPAwardedEvent(
      poolAddress,
      taker,
      kicker,
      lpAwardedTaker,
      lpAwardedKicker
    )
    handleBucketTakeLPAwarded(newBucketTakeLPAwardedEvent)

    // need to update mock borrower info to reflect reduced collateral to ensure that the expected tokenId rebalancing occurs
    inflator = BigInt.fromString("1002804000000000000")
    expectedBorrowerInfo = new BorrowerInfo(
      wdiv(amountBorrowed, inflator),
      amountPledged.minus(collateralToTake),
      BigInt.fromString("8766934085068726351"))
    mockGetBorrowerInfo(poolAddress, borrower, expectedBorrowerInfo)

    // mock bucket take event
    const newBucketTakeEvent = createBucketTakeEvent(
      poolAddress,
      taker,
      borrower,
      index,
      amountToTake,
      collateralToTake,
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

    // check entities have been stored
    assert.entityCount("Account", 4)
    assert.entityCount("AddQuoteToken", 1)
    assert.entityCount("DrawDebtNFT", 1)
    assert.entityCount("Loan", 1)
    assert.entityCount("LiquidationAuction", 1)
    assert.entityCount("Kick", 1)
    assert.entityCount("BucketTake", 1)
    assert.entityCount("BucketTakeLPAwarded", 1)
    assert.entityCount("Pool", 2)

    const liquidationAuctionId = getLiquidationAuctionId(addressToBytes(poolAddress), loanId, ONE_BI)
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
      "settled",
      `${false}`
    )

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
    assert.fieldEquals(
      "Loan",
      `${loanId.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345]"
    )

    // check Pool attributes
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "tokenIdsPledged",
      "[234, 345]"
    )
    // check Pool attributes
    assert.fieldEquals(
      "Pool",
      `${expectedPoolAddress.toHexString()}`,
      "bucketTokenIds",
      "[456]" // since borrower collateral was > 2 but < 3 after take their last tokenId should have been popped and transferred to bucketTokenIds
    )
  })

  // TODO: finish implementing once a mergeOrRemoveCollateralNFT calldata becomes available
  test("MergeOrRemoveCollateralNFT", () => {
    // check entity is unavailable prior to storage
    assert.entityCount("MergeOrRemoveCollateralNFT", 0)

    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const actor = Address.fromString("0x0000000000000000000000000000000000000003")
    const collateralMerged = BigInt.fromString("2000000000000000000") // 2 * 1e18
    const toIndexLps = BigInt.fromI32(234)

    // TODO: mock required contract calls

    const calldata = Bytes.empty()
    const newMergeOrRemoveCollateralNFTEvent = createMergeOrRemoveCollateralNFTEvent(poolAddress, actor, collateralMerged, toIndexLps, calldata)
    // handleMergeOrRemoveCollateralNFT(newMergeOrRemoveCollateralNFTEvent)

  })

})
