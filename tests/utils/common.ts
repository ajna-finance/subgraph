import { Address, BigInt, Bytes, ethereum, dataSource, log, BigDecimal } from "@graphprotocol/graph-ts"
import { assert, createMockedFunction } from "matchstick-as"

import { handlePoolCreated } from "../../src/erc-20-pool-factory"
import { handlePoolCreated as handleERC721PoolCreated } from "../../src/erc-721-pool-factory"

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
import { handleAddQuoteToken } from "../../src/erc-721-pool"

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

/*********************************/
/*** Grant Fund Mock Functions ***/
/*********************************/

// mock burnInfo contract calls
export function mockGetDistributionId(grantFund: Address, expectedDistributionId: BigInt): void {
    createMockedFunction(grantFund, 'getDistributionId', 'getDistributionId():(uint24)')
        .withArgs([])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedDistributionId),
        ])
}

export function mockGetVotesScreening(grantFund: Address, distributionId: BigInt, voter: Address, expectedVotes: BigInt): void {
    createMockedFunction(grantFund, 'getVotesScreening', 'getVotesScreening(uint24,address):(uint256)')
        .withArgs([
            ethereum.Value.fromUnsignedBigInt(distributionId),
            ethereum.Value.fromAddress(voter)
        ])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedVotes),
        ])
}

export function mockGetVotesFunding(grantFund: Address, distributionId: BigInt, voter: Address, expectedVotes: BigInt): void {
    createMockedFunction(grantFund, 'getVotesFunding', 'getVotesFunding(uint24,address):(uint256)')
        .withArgs([
            ethereum.Value.fromUnsignedBigInt(distributionId),
            ethereum.Value.fromAddress(voter)
        ])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedVotes),
        ])
}

export function mockGetTreasury(grantFund: Address, expectedTreasury: BigInt): void {
    createMockedFunction(grantFund, 'treasury', 'treasury():(uint256)')
        .withArgs([])
        .returns([
            ethereum.Value.fromUnsignedBigInt(expectedTreasury),
        ])
}

export function mockGetFundedProposalSlate(grantFund: Address, slateHash: Bytes, expectedProposals: Array<BigInt>): void {
    createMockedFunction(grantFund, 'getFundedProposalSlate', 'getFundedProposalSlate(bytes32):(uint256[])')
        .withArgs([
            ethereum.Value.fromFixedBytes(slateHash)
        ])
        .returns([
            ethereum.Value.fromUnsignedBigIntArray(expectedProposals),
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

export function mockGetBorrowerInfo(pool: Address, borrower: Address, expectedInfo: BorrowerInfo): void {
  createMockedFunction(pool, 'borrowerInfo', 'borrowerInfo(address):(uint256,uint256,uint256)')
    .withArgs([ethereum.Value.fromAddress(borrower)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(expectedInfo.t0debt),
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

export function mockGetRatesAndFees(pool: Address, expectedLenderInterestMargin: BigInt, borrowRate: BigInt): void {
  // return Maths.max(Maths.wdiv(interestRate_, 52 * 1e18), 0.0005 * 1e18);
  const expectedBorrowFeeRate = wmin(wdiv(borrowRate, BigInt.fromString("52000000000000000000")), BigInt.fromString("500000000000000"));
  // return Maths.min(Maths.wdiv(interestRate_, 365 * 1e18), 0.1 * 1e18);
  const expectedDepositFeeRate = wmin(wdiv(borrowRate, BigInt.fromString("365000000000000000000")), BigInt.fromString("100000000000000000"));
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'lenderInterestMargin', 'lenderInterestMargin(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedLenderInterestMargin)])
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'borrowFeeRate', 'borrowFeeRate(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedBorrowFeeRate)])
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'unutilizedDepositFeeRate', 'unutilizedDepositFeeRate(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(pool)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedDepositFeeRate)])
}

// mock getLPBValueInQuote contract calls
export function mockGetLPBValueInQuote(pool: Address, lpb: BigInt, bucketIndex: BigInt, expectedValue: BigInt): void {
    createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 'lpToQuoteTokens', 'lpToQuoteTokens(address,uint256,uint256):(uint256)')
        .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromUnsignedBigInt(lpb), ethereum.Value.fromUnsignedBigInt(bucketIndex)])
        .returns([ethereum.Value.fromUnsignedBigInt(expectedValue)])
}

export function mockGetLenderInfo(pool: Address, bucketIndex: BigInt, lender: Address, expectedLPB: BigInt, expectedDepositTime: BigInt): void {
    createMockedFunction(pool, 'lenderInfo', 'lenderInfo(uint256,address):(uint256,uint256)')
        .withArgs([ethereum.Value.fromUnsignedBigInt(bucketIndex), ethereum.Value.fromAddress(lender)])
        .returns([
        ethereum.Value.fromUnsignedBigInt(expectedLPB),
        ethereum.Value.fromUnsignedBigInt(expectedDepositTime)
        ])
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
export function mockGetAuctionInfo(borrower: Address, pool: Address, expectedInfo: AuctionInfo): void {
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

export function mockGetERC721TokenInfo(token: Address, expectedName: string, expectedSymbol: string): void {
    createMockedFunction(token, 'name', 'name():(string)')
        .withArgs([])
        .returns([ethereum.Value.fromString(expectedName)])
    createMockedFunction(token, 'symbol', 'symbol():(string)')
        .withArgs([])
        .returns([ethereum.Value.fromString(expectedSymbol)])
}

export function mockDepositUpToIndex(pool: Address, index: BigInt, expectedInfo: BigInt): void {
  createMockedFunction(pool, 'depositUpToIndex', 'depositUpToIndex(uint256):(uint256)')
      .withArgs([ethereum.Value.fromUnsignedBigInt(index)])
      .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo)
      ])
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

    mockGetRatesAndFees(
      pool, 
      BigInt.fromString("850000000000000000"), // 0.85 * 1e18
      BigInt.fromString("50000000000000000"),  // 0.05 * 1e18
    )

    mockDepositUpToIndex(pool, params.lupIndex, wmul(params.poolSize, params.actualUtilization))
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

/*************************/
/*** Utility Functions ***/
/*************************/

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
