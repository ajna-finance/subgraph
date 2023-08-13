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
import { Account, AddCollateralNFT, Loan } from "../generated/schema"
import { AddCollateralNFT as AddCollateralNFTEvent } from "../generated/templates/ERC721Pool/ERC721Pool"
import { handleAddCollateralNFT, handleAddQuoteToken, handleDrawDebtNFT, handleRepayDebt, handleMergeOrRemoveCollateralNFT } from "../src/erc-721-pool"
import { createAddCollateralNFTEvent, createAddQuoteTokenEvent, createDrawDebtNFTEvent, createRepayDebtEvent, createMergeOrRemoveCollateralNFTEvent } from "./utils/erc-721-pool-utils"

import { FIVE_PERCENT_BI, MAX_PRICE, MAX_PRICE_BI, MAX_PRICE_INDEX, ONE_BI, ONE_PERCENT_BI, ONE_WAD_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../src/utils/constants"
import { create721Pool, createPool, mockGetBorrowerInfo, mockGetBucketInfo, mockGetDebtInfo, mockGetLPBValueInQuote, mockGetRatesAndFees, mockPoolInfoUtilsPoolUpdateCalls, mockTokenBalance } from "./utils/common"
import { BucketInfo } from "../src/utils/pool/bucket"
import { addressToBytes, wadToDecimal } from "../src/utils/convert"
import { DebtInfo } from "../src/utils/pool/pool"
import { BorrowerInfo, getLoanId } from "../src/utils/pool/loan"
import { wdiv } from "../src/utils/math"

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

  // TODO: test token and pool tx count incrementing in more thorough own unit test

})
