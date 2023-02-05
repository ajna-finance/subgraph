import { Address, BigDecimal, BigInt, Bytes, ethereum, dataSource } from "@graphprotocol/graph-ts"
import { assert, createMockedFunction } from "matchstick-as"

import { handlePoolCreated } from "../../src/erc-20-pool-factory"
import { createPoolCreatedEvent } from "./erc-20-pool-factory-utils"

import { BucketInfo, getBucketId } from "../../src/utils/bucket"
import { addressToBytes, rayToDecimal, wadToDecimal } from "../../src/utils/convert"
import { poolInfoUtilsNetworkLookUpTable } from "../../src/utils/constants"
import { LoansInfo, PoolPricesInfo, PoolUtilizationInfo, ReservesInfo } from "../../src/utils/pool"

/*************************/
/*** Bucket Assertions ***/
/*************************/

export class BucketUpdatedParams {
    id: Bytes
    collateral: BigInt
    quoteTokens: BigInt
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
        "quoteTokens",
        `${wadToDecimal(params.quoteTokens)}`
    )
    assert.fieldEquals(
        "Bucket",
        `${params.id.toHexString()}`,
        "exchangeRate",
        `${rayToDecimal(params.exchangeRate)}`
    )
    assert.fieldEquals(
        "Bucket",
        `${params.id.toHexString()}`,
        "lpb",
        `${rayToDecimal(params.lpb)}`
    )
}

/***********************/
/*** Lend Assertions ***/
/***********************/

export class LendUpdatedParams {
    id: Bytes
    bucketId: Bytes
    poolAddress: String
    deposit: BigInt
    lpb: BigInt
    lpbValueInQuote: BigInt
}
export function assertLendUpdate(params: LendUpdatedParams): void {
    assert.fieldEquals(
        "Lend",
        `${params.id.toHexString()}`,
        "deposit",
        `${wadToDecimal(params.deposit)}`
    )
    assert.fieldEquals(
        "Lend",
        `${params.id.toHexString()}`,
        "lpb",
        `${rayToDecimal(params.lpb)}`
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
    reserves: BigInt
    lup: BigInt
    poolSize: BigInt
    txCount: BigInt
}
export function assertPoolUpdate(params: PoolUpdatedParams): void {
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "reserves",
        `${wadToDecimal(params.reserves)}`
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
        "poolSize",
        `${wadToDecimal(params.poolSize)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "txCount",
        `${params.txCount}`
    )    
}

/**********************/
/*** Mock Functions ***/
/**********************/

// create a pool entity and save it to the store
export function createPool(pool_: Address, collateral: Address, quote: Address): void {
    // mock contract calls
    createMockedFunction(pool_, 'collateralAddress', 'collateralAddress():(address)')
      .withArgs([])
      .returns([ethereum.Value.fromAddress(collateral)])
    createMockedFunction(pool_, 'quoteTokenAddress', 'quoteTokenAddress():(address)')
      .withArgs([])
      .returns([ethereum.Value.fromAddress(quote)])

    // mock PoolCreated event
    const newPoolCreatedEvent = createPoolCreatedEvent(pool_)
    handlePoolCreated(newPoolCreatedEvent)
}

// mock getBucketInfo contract calls
export function mockGetBucketInfo(pool: Address, bucketIndex: BigInt, expectedInfo: BucketInfo): void {
    createMockedFunction(poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!, 'bucketInfo', 'bucketInfo(address,uint256):(uint256,uint256,uint256,uint256,uint256,uint256)')
      .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromUnsignedBigInt(bucketIndex)])
      .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo.price),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.quoteTokens),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.collateral),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.lpb),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.scale),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.exchangeRate)
    ])
}

// mock getLPBValueInQuote contract calls
export function mockGetLPBValueInQuote(pool: Address, lpb: BigInt, bucketIndex: BigInt, expectedValue: BigInt): void {
    createMockedFunction(poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!, 'lpsToQuoteTokens', 'lpsToQuoteTokens(address,uint256,uint256):(uint256)')
      .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromUnsignedBigInt(lpb), ethereum.Value.fromUnsignedBigInt(bucketIndex)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedValue)])
}

// mock getPoolLoansInfo contract calls
export function mockGetPoolLoansInfo(pool: Address, expectedInfo: LoansInfo): void {
    createMockedFunction(poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!, 'poolLoansInfo', 'poolLoansInfo(address):(uint256,uint256,address,uint256,uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo.poolSize),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.loansCount),
        ethereum.Value.fromAddress(expectedInfo.maxBorrower),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.pendingInflator),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.pendingInterestFactor)
    ])
}

// mock getPoolPricesInfo contract calls
export function mockGetPoolPricesInfo(pool: Address, expectedInfo: PoolPricesInfo): void {
    createMockedFunction(poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!, 'poolPricesInfo', 'poolPricesInfo(address):(uint256,uint256,uint256,uint256,uint256,uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo.hpb),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.hpbIndex),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.htp),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.htpIndex),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.lup),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.lupIndex)
    ])
}

// mock getPoolReserves contract calls
export function mockGetPoolReserves(pool: Address, expectedInfo: ReservesInfo): void {
    createMockedFunction(poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!, 'poolReservesInfo', 'poolReservesInfo(address):(uint256,uint256,uint256,uint256,uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo.reserves),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.claimableReserves),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.claimableReservesRemaining),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.auctionPrice),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.timeRemaining)
    ])
}

// mock getPoolUtilizationInfo contract calls
export function mockGetPoolUtilizationInfo(pool: Address, expectedInfo: PoolUtilizationInfo): void {
    createMockedFunction(poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!, 'poolUtilizationInfo', 'poolUtilizationInfo(address):(uint256,uint256,uint256,uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo.minDebtAmount),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.collateralization),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.actualUtilization),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.targetUtilization)
    ])
}

export class PoolMockParams {
    // loans info mock params
    poolSize: BigInt
    loansCount: BigInt
    maxBorrower: Address
    pendingInflator: BigInt
    pendingInterestFactor: BigInt
    // prices info mock params
    hpb: BigInt
    hpbIndex: BigInt
    htp: BigInt
    htpIndex: BigInt
    lup: BigInt
    lupIndex: BigInt
    // reserves info mock params
    reserves: BigInt
    claimableReserves: BigInt
    claimableReservesRemaining: BigInt
    auctionPrice: BigInt
    timeRemaining: BigInt
    // utilization info mock params
    minDebtAmount: BigInt
    collateralization: BigInt
    actualUtilization: BigInt
    targetUtilization: BigInt
}
// mock all pool poolInfoUtilis contract calls
export function mockPoolInfoUtilsPoolUpdateCalls(pool: Address, params: PoolMockParams): void {
    const expectedPoolLoansInfo = new LoansInfo(
        params.poolSize,
        params.loansCount,
        params.maxBorrower,
        params.pendingInflator,
        params.pendingInterestFactor
    )
    mockGetPoolLoansInfo(pool, expectedPoolLoansInfo)

    const expectedPoolPricesInfo = new PoolPricesInfo(
        params.hpb,
        params.hpbIndex,
        params.htp,
        params.htpIndex,
        params.lup,
        params.lupIndex
    )
    mockGetPoolPricesInfo(pool, expectedPoolPricesInfo)

    const expectedPoolReservesInfo = new ReservesInfo(
        params.reserves,
        params.claimableReserves,
        params.claimableReservesRemaining,
        params.auctionPrice,
        params.timeRemaining
    )
    mockGetPoolReserves(pool, expectedPoolReservesInfo)

    const expectedPoolUtilizationInfo = new PoolUtilizationInfo(
        params.minDebtAmount,
        params.collateralization,
        params.actualUtilization,
        params.targetUtilization
    )
    mockGetPoolUtilizationInfo(pool, expectedPoolUtilizationInfo)
}
