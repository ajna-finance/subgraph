import { Address, BigDecimal, BigInt, Bytes, ethereum, dataSource } from "@graphprotocol/graph-ts"
import { assert, createMockedFunction } from "matchstick-as"

import { handlePoolCreated } from "../../src/erc-20-pool-factory"
import { createPoolCreatedEvent } from "./erc-20-pool-factory-utils"

import { BucketInfo, getBucketId } from "../../src/utils/bucket"
import { addressToBytes, rayToDecimal, wadToDecimal } from "../../src/utils/convert"
import { poolInfoUtilsNetworkLookUpTable } from "../../src/utils/constants"

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
    totalDeposits: BigInt
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
        "totalDeposits",
        `${wadToDecimal(params.totalDeposits)}`
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

// mock getPoolReserves contract calls
export function mockGetPoolReserves(poolAddress: Address, token: Address, expectedValue: BigInt): void {
    createMockedFunction(token, 'balanceOf', 'balanceOf(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(poolAddress)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedValue)])
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

export function mockUpdatePoolContractCalls(pool: Address): void {

}
