import { Address, BigInt, Bytes, ethereum, dataSource, log, BigDecimal } from "@graphprotocol/graph-ts"
import { assert, createMockedFunction } from "matchstick-as"

import { handlePoolCreated } from "../../src/mappings/erc-20-pool-factory"
import { handlePoolCreated as handleERC721PoolCreated } from "../../src/mappings/erc-721-pool-factory"

import { createPoolCreatedEvent } from "./erc-20-pool-factory-utils"
import { createERC721PoolFactoryPoolCreatedEvent } from "./erc-721-pool-factory-utils"

import { BucketInfo } from "../../src/utils/pool/bucket"
import { wadToDecimal } from "../../src/utils/convert"
import { positionManagerAddressTable, poolInfoUtilsAddressTable, ZERO_BI, ONE_BI, ONE_WAD_BI, ZERO_ADDRESS, MAX_PRICE_INDEX } from "../../src/utils/constants"
import { BurnInfo, DebtInfo, LoansInfo, PoolPricesInfo, PoolUtilizationInfo, ReservesInfo } from "../../src/utils/pool/pool"
import { AuctionInfo, AuctionStatus } from "../../src/utils/pool/liquidation"
import { BorrowerInfo } from "../../src/utils/pool/loan"
import { wdiv, wmin, wmul } from "../../src/utils/math"
import { createAddQuoteTokenEvent } from "./erc-721-pool-utils"
import { handleAddQuoteToken } from "../../src/mappings/erc-721-pool"
import { mockGetBucketInfo, mockGetBurnInfo, mockGetERC721TokenInfo, mockGetLPBValueInQuote, mockGetRatesAndFees, mockGetTokenInfo, mockPoolInfoUtilsPoolUpdateCalls } from "./mock-contract-calls"

/*************************/
/*** Bucket Assertions ***/
/*************************/

export class BucketUpdatedParams {
    id: Bytes
    collateral: BigInt
    deposit: BigInt
    exchangeRate: BigInt
    bucketIndex: BigInt
    lpb: BigInt
}
export function assertBucketUpdate(params: BucketUpdatedParams): void {
    assert.fieldEquals(
      "Bucket",
      `${params.id.toHexString()}`,
      "collateral",
      `${wadToDecimal(params.collateral)}`
    )
    assert.fieldEquals(
        "Bucket",
        `${params.id.toHexString()}`,
        "deposit",
        `${wadToDecimal(params.deposit)}`
    )
    assert.fieldEquals(
        "Bucket",
        `${params.id.toHexString()}`,
        "exchangeRate",
        `${wadToDecimal(params.exchangeRate)}`
    )
    assert.fieldEquals(
        "Bucket",
        `${params.id.toHexString()}`,
        "lpb",
        `${wadToDecimal(params.lpb)}`
    )
}

/***********************/
/*** Lend Assertions ***/
/***********************/

export class LendUpdatedParams {
    id: Bytes
    bucketId: Bytes
    poolAddress: String
    depositTime: BigInt
    lpb: BigInt
    lpbValueInQuote: BigInt
}
export function assertLendUpdate(params: LendUpdatedParams): void {
    assert.fieldEquals(
        "Lend",
        `${params.id.toHexString()}`,
        "poolAddress",
        `${params.poolAddress}`
    )
    assert.fieldEquals(
        "Lend",
        `${params.id.toHexString()}`,
        "depositTime",
        `${params.depositTime}`
    )
    assert.fieldEquals(
        "Lend",
        `${params.id.toHexString()}`,
        "lpb",
        `${wadToDecimal(params.lpb)}`
    )
    assert.fieldEquals(
        "Lend",
        `${params.id.toHexString()}`,
        "lpbValueInQuote",
        `${wadToDecimal(params.lpbValueInQuote)}`
    )      
}

/***********************/
/*** Pool Assertions ***/
/***********************/

export class PoolUpdatedParams {
    poolAddress: String
    // loans info
    poolSize: BigInt
    loansCount: BigInt
    maxBorrower: String
    inflator: BigInt
    t0debt: BigInt
    pledgedCollateral: BigInt
    // prices info
    hpb: BigInt
    hpbIndex: BigInt
    htp: BigInt
    htpIndex: BigInt
    lup: BigInt
    lupIndex: BigInt
    // reserve info
    reserves: BigInt
    claimableReserves: BigInt
    claimableReservesRemaining: BigInt
    // utilization info
    minDebtAmount: BigInt
    actualUtilization: BigInt
    targetUtilization: BigInt
    // liquidation info
    totalBondEscrowed: BigInt
    // liquidationAuctions: List // TODO: update this to check an array of ids
    // misc
    txCount: BigInt
}
export function assertPoolUpdate(params: PoolUpdatedParams): void {
    // loans assertions
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "poolSize",
        `${wadToDecimal(params.poolSize)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "loansCount",
        `${params.loansCount}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "maxBorrower",
        `${params.maxBorrower}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "inflator",
        `${wadToDecimal(params.inflator)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "t0debt",
        `${wadToDecimal(params.t0debt)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "pledgedCollateral",
        `${wadToDecimal(params.pledgedCollateral)}`
    )
    // prices assertions
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "hpb",
        `${wadToDecimal(params.hpb)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "hpbIndex",
        `${params.hpbIndex}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "htp",
        `${wadToDecimal(params.htp)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "htpIndex",
        `${params.htpIndex}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "lup",
        `${wadToDecimal(params.lup)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "lupIndex",
        `${params.lupIndex}`
    )
    // reserves assertions
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "reserves",
        `${wadToDecimal(params.reserves)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "claimableReserves",
        `${wadToDecimal(params.claimableReserves)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "claimableReservesRemaining",
        `${wadToDecimal(params.claimableReservesRemaining)}`
    )
    // utilization assertions
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "minDebtAmount",
        `${wadToDecimal(params.minDebtAmount)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "actualUtilization",
        `${wadToDecimal(params.actualUtilization)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "targetUtilization",
        `${wadToDecimal(params.targetUtilization)}`
    )
    // liquidation assertions
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "totalBondEscrowed",
        `${wadToDecimal(params.totalBondEscrowed)}`
    )
    // assert.fieldEquals(
    //     "Pool",
    //     `${params.poolAddress}`,
    //     "liquidationAuctions",
    //     `${params.liquidationAuctions.toHexString()}`
    // )
    // misc assertions
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "txCount",
        `${params.txCount}`
    )    
}

/*************************/
/*** Utility Functions ***/
/*************************/

// TODO: add mockGetRatesAndFees to this function
// create a pool entity and save it to the store
export function createPool(pool_: Address, collateral: Address, quote: Address, interestRate: BigInt, feeRate: BigInt): void {
    // mock interest rate info contract call
    createMockedFunction(pool_, 'interestRateInfo', 'interestRateInfo():(uint256,uint256)')
        .withArgs([])
        .returns([
            ethereum.Value.fromUnsignedBigInt(interestRate),
            ethereum.Value.fromUnsignedBigInt(feeRate)
        ])

    // mock get token address contract calls
    createMockedFunction(pool_, 'collateralAddress', 'collateralAddress():(address)')
        .withArgs([])
        .returns([ethereum.Value.fromAddress(collateral)])
    createMockedFunction(pool_, 'quoteTokenAddress', 'quoteTokenAddress():(address)')
        .withArgs([])
        .returns([ethereum.Value.fromAddress(quote)])

    // mock get token info contract calls
    mockGetTokenInfo(collateral, 'collateral', 'C', BigInt.fromI32(18), BigInt.fromI32(100))
    mockGetTokenInfo(quote, 'quote', 'Q', BigInt.fromI32(18), BigInt.fromI32(100))

    // mock PoolCreated event
    const newPoolCreatedEvent = createPoolCreatedEvent(pool_)
    newPoolCreatedEvent.address = Address.fromString("0x0000000000000000000000000000000000002020")
    handlePoolCreated(newPoolCreatedEvent)
}

// create a 721 type pool entity and save it to the store
export function create721Pool(pool: Address, collateral: Address, quote: Address, interestRate: BigInt, feeRate: BigInt, calldata: Bytes): void {
    // mock rates and fees contract calls
    mockGetRatesAndFees(pool, BigInt.fromString("980000000000000000"), BigInt.fromString("60000000000000000"))

    // mock interest rate info contract call
    createMockedFunction(pool, 'interestRateInfo', 'interestRateInfo():(uint256,uint256)')
        .withArgs([])
        .returns([
            ethereum.Value.fromUnsignedBigInt(interestRate),
            ethereum.Value.fromUnsignedBigInt(feeRate)
        ])

    // mock get token info contract calls
    mockGetERC721TokenInfo(collateral, 'collateral', 'C')
    mockGetTokenInfo(quote, 'quote', 'Q', BigInt.fromI32(18), BigInt.fromI32(100))

    // handlePoolCreated event
    const erc721PoolFactoryAddress = Address.fromString("0x4f05DA51eAAB00e5812c54e370fB95D4C9c51F21")
    const newPoolCreatedEvent = createERC721PoolFactoryPoolCreatedEvent(erc721PoolFactoryAddress, pool, calldata)
    // TODO: DYNAMICALLY SET THIS ADDRESS
    newPoolCreatedEvent.address = Address.fromString("0x0000000000000000000000000000000000002020")
    handleERC721PoolCreated(newPoolCreatedEvent)
}

// CURRENTLY ERC721 POOLS ONLY
export function createAndHandleAddQuoteTokenEvent(poolAddress: Address, lender: Address, index: BigInt, price: BigDecimal, amount: BigInt, lpAwarded: BigInt, lup: BigInt, logIndex: BigInt): void {
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

      // TODO: load pool entity and use it to determine which type of event to create

      // mock add quote token event
      const newAddQuoteTokenEvent = createAddQuoteTokenEvent(
        poolAddress,
        logIndex,
        lender,
        index,
        amount,
        lpAwarded,
        lup
      )
      handleAddQuoteToken(newAddQuoteTokenEvent)
}
