import { Address, BigDecimal, BigInt, Bytes, ethereum, dataSource, log } from "@graphprotocol/graph-ts"
import { assert, createMockedFunction } from "matchstick-as"

import { handlePoolCreated } from "../../src/erc-20-pool-factory"
import { createPoolCreatedEvent } from "./erc-20-pool-factory-utils"

import { BucketInfo, getBucketId } from "../../src/utils/bucket"
import { addressToBytes, wadToDecimal } from "../../src/utils/convert"
import { grantFundAddressTable, positionManagerAddressTable, poolInfoUtilsAddressTable, ZERO_BI, ONE_BI } from "../../src/utils/constants"
import { BurnInfo, DebtInfo, LoansInfo, PoolPricesInfo, PoolUtilizationInfo, ReservesInfo } from "../../src/utils/pool"
import { AuctionInfo, AuctionStatus } from "../../src/utils/liquidation"
import { BorrowerInfo } from "../../src/utils/loan"

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
    lpb: BigInt
    lpbValueInQuote: BigInt
}
export function assertLendUpdate(params: LendUpdatedParams): void {
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
    debt: BigInt
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
    reserveAuctionPrice: BigInt
    reserveAuctionTimeRemaining: BigInt
    // utilization info
    minDebtAmount: BigInt
    collateralization: BigInt
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
        "debt",
        `${wadToDecimal(params.debt)}`
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
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "reserveAuctionPrice",
        `${wadToDecimal(params.reserveAuctionPrice)}`
    )
    assert.fieldEquals(
        "Pool",
        `${params.poolAddress}`,
        "reserveAuctionTimeRemaining",
        `${params.reserveAuctionTimeRemaining}`
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
        "collateralization",
        `${wadToDecimal(params.collateralization)}`
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

/*********************************/
/*** Grant Fund Mock Functions ***/
/*********************************/

// Mocks a contract function call to findMechanismOfProposal for testing purposes
// @param proposalId: The ID of the proposal
// @param expectedMechanism: The expected mechanism of the proposal
export function mockFindMechanismOfProposal(proposalId: BigInt, expectedMechanism: BigInt): void {
    createMockedFunction(
      grantFundAddressTable.get(dataSource.network())!,
      'findMechanismOfProposal',
      'findMechanismOfProposal(uint256):(uint8)'
    )
    .withArgs([ethereum.Value.fromUnsignedBigInt(proposalId)])
    .returns([ethereum.Value.fromUnsignedBigInt(expectedMechanism)]);
  }

// mock burnInfo contract calls
export function mockGetDistributionId(grantFund: Address, expectedDistributionId: BigInt): void {
    createMockedFunction(grantFund, 'getDistributionId', 'getDistributionId():(uint24)')
        .withArgs([])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedDistributionId),
        ])
}

/*******************************/
/*** Position Mock Functions ***/
/*******************************/

export function mockGetTokenName(tokenContract: Address, expectedName: String): void {
    createMockedFunction(
        tokenContract,
        'name',
        'name():(string)'
    )
    .withArgs([])
    .returns([
        ethereum.Value.fromString(expectedName),
    ])
}

export function mockGetTokenSymbol(tokenContract: Address, expectedSymbol: String): void {
    createMockedFunction(
        tokenContract,
        'symbol',
        'symbol():(string)'
    )
    .withArgs([])
    .returns([
        ethereum.Value.fromString(expectedSymbol),
    ])
}

export function mockGetPoolKey(tokenId: BigInt, expectedPoolAddress: Address): void {
    createMockedFunction(
        positionManagerAddressTable.get(dataSource.network())!,
        'poolKey',
        'poolKey(uint256):(address)'
    )
    .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
    .returns([
        ethereum.Value.fromAddress(expectedPoolAddress),
    ])
}

/***************************/
/*** Pool Mock Functions ***/
/***************************/

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
    handlePoolCreated(newPoolCreatedEvent)
}

export function mockGetBorrowerInfo(pool: Address, borrower: Address, expectedInfo: BorrowerInfo): void {
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'borrowerInfo', 'borrowerInfo(address,address):(uint256,uint256,uint256)')
    .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromAddress(borrower)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(expectedInfo.debt),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.collateral),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.t0Np)
    ])
}

// mock getBucketInfo contract calls
export function mockGetBucketInfo(pool: Address, bucketIndex: BigInt, expectedInfo: BucketInfo): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'bucketInfo', 'bucketInfo(address,uint256):(uint256,uint256,uint256,uint256,uint256,uint256)')
        .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromUnsignedBigInt(bucketIndex)])
        .returns([
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(123456789)),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.quoteTokens),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.collateral),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.lpb),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.scale),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.exchangeRate)
        ])
}

export function mockGetDebtInfo(pool: Address, expectInfo: DebtInfo): void {
    createMockedFunction(pool, 'debtInfo', 'debtInfo():(uint256,uint256,uint256,uint256)')
        .returns([
          ethereum.Value.fromUnsignedBigInt(expectInfo.pendingDebt),
          ethereum.Value.fromUnsignedBigInt(expectInfo.accruedDebt),
          ethereum.Value.fromUnsignedBigInt(expectInfo.liquidationDebt),
          ethereum.Value.fromUnsignedBigInt(expectInfo.t0Debt2ToCollateral)
        ])
}

export function mockGetLenderInterestMargin(pool: Address, expectedValue: BigInt): void {
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'lenderInterestMargin', 'lenderInterestMargin(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedValue)])
}

// mock getLPBValueInQuote contract calls
export function mockGetLPBValueInQuote(pool: Address, lpb: BigInt, bucketIndex: BigInt, expectedValue: BigInt): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'lpToQuoteTokens', 'lpToQuoteTokens(address,uint256,uint256):(uint256)')
        .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromUnsignedBigInt(lpb), ethereum.Value.fromUnsignedBigInt(bucketIndex)])
        .returns([ethereum.Value.fromUnsignedBigInt(expectedValue)])
}

// mock getPoolLoansInfo contract calls
export function mockGetPoolLoansInfo(pool: Address, expectedInfo: LoansInfo): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'poolLoansInfo', 'poolLoansInfo(address):(uint256,uint256,address,uint256,uint256)')
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
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'poolPricesInfo', 'poolPricesInfo(address):(uint256,uint256,uint256,uint256,uint256,uint256)')
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

// mock getMomp contract calls
export function mockGetPoolMomp(pool: Address, expectedInfo: BigInt): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'momp', 'momp(address):(uint256)')
        .withArgs([ethereum.Value.fromAddress(pool)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(expectedInfo)
        ])
}

// mock getPoolReserves contract calls
export function mockGetPoolReserves(pool: Address, expectedInfo: ReservesInfo): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'poolReservesInfo', 'poolReservesInfo(address):(uint256,uint256,uint256,uint256,uint256)')
        .withArgs([ethereum.Value.fromAddress(pool)])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedInfo.reserves),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.claimableReserves),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.claimableReservesRemaining),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.reserveAuctionPrice),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.reserveAuctionTimeRemaining)
        ])
}

// mock getPoolUtilizationInfo contract calls
export function mockGetPoolUtilizationInfo(pool: Address, expectedInfo: PoolUtilizationInfo): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'poolUtilizationInfo', 'poolUtilizationInfo(address):(uint256,uint256,uint256,uint256)')
        .withArgs([ethereum.Value.fromAddress(pool)])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedInfo.minDebtAmount),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.collateralization),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.actualUtilization),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.targetUtilization)
        ])
}

// mock auctionInfo contract calls
export function mockGetAuctionInfoERC20Pool(borrower: Address, pool: Address, expectedInfo: AuctionInfo): void {
    createMockedFunction(pool, 'auctionInfo', 'auctionInfo(address):(address,uint256,uint256,uint256,uint256,uint256,address,address,address,bool)')
        .withArgs([ethereum.Value.fromAddress(borrower)])
        .returns([
            ethereum.Value.fromAddress(expectedInfo.kicker),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.bondFactor),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.bondSize),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.kickTime),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.kickMomp),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.neutralPrice),
            ethereum.Value.fromAddress(expectedInfo.head),
            ethereum.Value.fromAddress(expectedInfo.next),
            ethereum.Value.fromAddress(expectedInfo.prev),
            ethereum.Value.fromBoolean(expectedInfo.alreadyTaken)
        ])
}

// mock auctionStatus poolInfoUtils calls
export function mockGetAuctionStatus(pool: Address, borrower: Address, expectedInfo: AuctionStatus): void {
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 
  'auctionStatus', 'auctionStatus(address,address):(uint256,uint256,uint256,bool,uint256,uint256)')
  .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromAddress(borrower)])
  .returns([
      ethereum.Value.fromUnsignedBigInt(expectedInfo.kickTime),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.collateral),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.debtToCover),
      ethereum.Value.fromBoolean(expectedInfo.isCollateralized),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.price),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.neutralPrice)
  ])
}

// mock currentBurnEpoch contract calls
export function mockGetCurrentBurnEpoch(pool: Address, expectedEpoch: BigInt): void {
    createMockedFunction(pool, 'currentBurnEpoch', 'currentBurnEpoch():(uint256)')
        .withArgs([])
        .returns([ethereum.Value.fromUnsignedBigInt(expectedEpoch)])
}

// mock burnInfo contract calls
export function mockGetBurnInfo(pool: Address, burnEpoch: BigInt, expectedInfo: BurnInfo): void {
    createMockedFunction(pool, 'burnInfo', 'burnInfo(uint256):(uint256,uint256,uint256)')
        .withArgs([ethereum.Value.fromUnsignedBigInt(burnEpoch)])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedInfo.timestamp),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.totalInterest),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.totalBurned)
        ])
}

export function mockGetTokenInfo(token: Address, expectedName: string, expectedSymbol: string, expectedDecimals: BigInt, expectedTotalSupply: BigInt): void {
    createMockedFunction(token, 'name', 'name():(string)')
        .withArgs([])
        .returns([ethereum.Value.fromString(expectedName)])
    createMockedFunction(token, 'symbol', 'symbol():(string)')
        .withArgs([])
        .returns([ethereum.Value.fromString(expectedSymbol)])
    createMockedFunction(token, 'decimals', 'decimals():(uint8)')
        .withArgs([])
        .returns([ethereum.Value.fromUnsignedBigInt(expectedDecimals)])
    createMockedFunction(token, 'totalSupply', 'totalSupply():(uint256)')
        .withArgs([])
        .returns([ethereum.Value.fromUnsignedBigInt(expectedTotalSupply)])
}

export class PoolMockParams {
    // loans info mock params
    poolSize: BigInt
    debt: BigInt
    loansCount: BigInt
    maxBorrower: Address
    inflator: BigInt
    // prices info mock params
    hpb: BigInt
    hpbIndex: BigInt
    htp: BigInt
    htpIndex: BigInt
    lup: BigInt
    lupIndex: BigInt
    momp: BigInt
    // reserves info mock params
    reserves: BigInt
    claimableReserves: BigInt
    claimableReservesRemaining: BigInt
    currentBurnEpoch: BigInt
    reserveAuctionPrice: BigInt
    reserveAuctionTimeRemaining: BigInt
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
        params.inflator,
        ONE_BI
    )
    mockGetPoolLoansInfo(pool, expectedPoolLoansInfo)

    const expectedPoolDebtInfo = new DebtInfo(params.debt, ZERO_BI, ZERO_BI, ZERO_BI)
    mockGetDebtInfo(pool, expectedPoolDebtInfo)

    const expectedPoolPricesInfo = new PoolPricesInfo(
        params.hpb,
        params.hpbIndex,
        params.htp,
        params.htpIndex,
        params.lup,
        params.lupIndex
    )
    mockGetPoolPricesInfo(pool, expectedPoolPricesInfo)

    mockGetPoolMomp(pool, params.momp)

    const expectedPoolReservesInfo = new ReservesInfo(
        params.reserves,
        params.claimableReserves,
        params.claimableReservesRemaining,
        params.reserveAuctionPrice,
        params.reserveAuctionTimeRemaining
    )
    mockGetPoolReserves(pool, expectedPoolReservesInfo)

    const expectedPoolUtilizationInfo = new PoolUtilizationInfo(
        params.minDebtAmount,
        params.collateralization,
        params.actualUtilization,
        params.targetUtilization
    )
    mockGetPoolUtilizationInfo(pool, expectedPoolUtilizationInfo)

    mockGetLenderInterestMargin(pool, BigInt.fromString("850000000000000000")) // 0.85 * 1e18
}

/****************************/
/*** Token Mock Functions ***/
/****************************/

export function mockTokenBalance(tokenAddress: Address, address: Address, expectedBalance: BigInt): void {
  createMockedFunction(tokenAddress, 'balanceOf', 'balanceOf(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(address)])
      .returns([
          ethereum.Value.fromUnsignedBigInt(expectedBalance),
      ])
}
