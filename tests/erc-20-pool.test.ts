import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach,
  logStore
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { handleAddCollateral, handleAddQuoteToken, handleDrawDebt, handleRepayDebt } from "../src/erc-20-pool"
import { createAddCollateralEvent, createAddQuoteTokenEvent, createDrawDebtEvent, createRepayDebtEvent } from "./utils/erc-20-pool-utils"
import { assertBucketUpdate, assertPoolUpdate, createPool, mockGetPoolReserves } from "./utils/common"
import { getBucketId } from "../src/utils/bucket"
import { addressToBytes, rayToDecimal, wadToDecimal } from "../src/utils/convert"
import { ONE_BI, ONE_RAY_BI, ZERO_BI } from "../src/utils/constants"
import { Account, Lend, Loan } from "../generated/schema"
import { getLendId } from "../src/utils/lend"
import { getLoanId } from "../src/utils/loan"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
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
    const amount = BigInt.fromI32(234)
    const lpAwarded = BigInt.fromI32(234)
    
    // mock addCollateralEvent
    const newAddCollateralEvent = createAddCollateralEvent(
      poolAddress,
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

    // check bucket attributes updated
    const bucketId = getBucketId(addressToBytes(poolAddress), price)
    assert.fieldEquals(
      "Bucket",
      `${bucketId.toHexString()}`,
      "collateral",
      `${wadToDecimal(amount)}`
    )

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
    const quoteToken = Address.fromString("0x0000000000000000000000000000000000000012")
    const expectedContractBalance = amount
    mockGetPoolReserves(poolAddress, quoteToken, expectedContractBalance)

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
      deposit: amount,
      exchangeRate: ONE_RAY_BI,
      bucketIndex: price,
      lpb: lpAwarded
    })

    // check pool attributes updated
    assertPoolUpdate({
      poolAddress: addressToBytes(poolAddress).toHexString(),
      currentReserves: ZERO_BI,
      lup: lup,
      totalDeposits: amount,
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
    assert.fieldEquals(
      "Lend",
      `${lendId.toHexString()}`,
      "deposit",
      `${wadToDecimal(amount)}`
    )
    assert.fieldEquals(
      "Lend",
      `${lendId.toHexString()}`,
      "lpb",
      `${rayToDecimal(lpAwarded)}`
    )
  })

  test("DrawDebt", () => {
    // mock parameters
    const poolAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const borrower = Address.fromString("0x0000000000000000000000000000000000000003")
    const amountBorrowed = BigInt.fromString("567529276179422528643") // 567.529276179422528643 * 1e18
    const collateralPledged = BigInt.fromI32(1067)
    const lup = BigInt.fromString("9529276179422528643") // 9.529276179422528643 * 1e18

    // mock required contract calls
    // const quoteToken = Address.fromString("0x0000000000000000000000000000000000000012")
    // const expectedContractBalance = amount
    // mockGetPoolReserves(poolAddress, quoteToken, expectedContractBalance)

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

    // TODO: check utilization for pool

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

})
