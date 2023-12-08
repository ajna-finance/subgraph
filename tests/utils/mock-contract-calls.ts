import { Address, BigInt, Bytes, ethereum, dataSource, log, BigDecimal } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

import { BucketInfo } from "../../src/utils/pool/bucket"
import { positionManagerAddressTable, poolInfoUtilsAddressTable, ZERO_BI, ONE_BI, poolInfoUtilsMulticallAddressTable } from '../../src/utils/constants';
import { BurnInfo, DebtInfo, LoansInfo, PoolPricesInfo, PoolUtilizationInfo, ReservesInfo, PoolDetails, RatesAndFees, PoolBalanceDetails, depositUpToIndex } from '../../src/utils/pool/pool';
import { AuctionInfo, AuctionStatus } from "../../src/utils/pool/liquidation"
import { BorrowerInfo, thresholdPrice } from '../../src/utils/pool/loan';
import { wdiv, wmin, wmul } from "../../src/utils/math"
import { addressToBytes, decimalToWad } from "../../src/utils/convert"
import { Pool } from "../../generated/schema"


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

export function mockGetTokenURI(tokenId: BigInt, expectedTokenURI: String): void {
    createMockedFunction(
        positionManagerAddressTable.get(dataSource.network())!,
        'tokenURI',
        'tokenURI(uint256):(string)'
    )
    .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
    .returns([
        ethereum.Value.fromString(expectedTokenURI),
    ])
}

export function mockGetPositionInfo(tokenId: BigInt, bucketIndex: BigInt, expectedDepositTime: BigInt, expectedLPB: BigInt): void {
    createMockedFunction(
        positionManagerAddressTable.get(dataSource.network())!,
        'getPositionInfo',
        'getPositionInfo(uint256,uint256):(uint256,uint256)'
    )
    .withArgs([
        ethereum.Value.fromUnsignedBigInt(tokenId),
        ethereum.Value.fromUnsignedBigInt(bucketIndex)
    ])
    .returns([
        ethereum.Value.fromUnsignedBigInt(expectedLPB),
        ethereum.Value.fromUnsignedBigInt(expectedDepositTime),
    ])
}

/***************************/
/*** Pool Mock Functions ***/
/***************************/

export function mockGetBorrowerInfo(pool: Address, borrower: Address, expectedInfo: BorrowerInfo): void {
  createMockedFunction(pool, 'borrowerInfo', 'borrowerInfo(address):(uint256,uint256,uint256)')
    .withArgs([ethereum.Value.fromAddress(borrower)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(expectedInfo.t0debt),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.collateral),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.t0Np),
      ethereum.Value.fromUnsignedBigInt(expectedInfo.t0ThresholdPrice)
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

// https://github.com/LimeChain/matchstick/issues/376
export function mockGetPoolDetailsMulticall(pool: Address, expectedPoolDetails: PoolDetails): void {
    const expectedPoolLoansInfo = new ethereum.Tuple();
    expectedPoolLoansInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolLoansInfo.poolSize));
    expectedPoolLoansInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolLoansInfo.loansCount));
    expectedPoolLoansInfo.push(ethereum.Value.fromAddress(expectedPoolDetails.poolLoansInfo.maxBorrower));
    expectedPoolLoansInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolLoansInfo.pendingInflator));
    expectedPoolLoansInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolLoansInfo.pendingInterestFactor));

    const expectedPoolPricesInfo = new ethereum.Tuple();
    expectedPoolPricesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolPricesInfo.hpb));
    expectedPoolPricesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolPricesInfo.hpbIndex));
    expectedPoolPricesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolPricesInfo.htp));
    expectedPoolPricesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolPricesInfo.htpIndex));
    expectedPoolPricesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolPricesInfo.lup));
    expectedPoolPricesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolPricesInfo.lupIndex));

    const expectedRatesAndFeesInfo = new ethereum.Tuple();
    expectedRatesAndFeesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.ratesAndFeesInfo.lenderInterestMargin));
    expectedRatesAndFeesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.ratesAndFeesInfo.borrowFeeRate));
    expectedRatesAndFeesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.ratesAndFeesInfo.depositFeeRate));

    const expectedPoolReservesInfo = new ethereum.Tuple();
    expectedPoolReservesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.reservesInfo.reserves));
    expectedPoolReservesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.reservesInfo.claimableReserves));
    expectedPoolReservesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.reservesInfo.claimableReservesRemaining));
    expectedPoolReservesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.reservesInfo.reserveAuctionPrice));
    expectedPoolReservesInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.reservesInfo.reserveAuctionTimeRemaining));

    const expectedPoolUtilizationInfo = new ethereum.Tuple();
    expectedPoolUtilizationInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolUtilizationInfo.minDebtAmount));
    expectedPoolUtilizationInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolUtilizationInfo.collateralization));
    expectedPoolUtilizationInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolUtilizationInfo.actualUtilization));
    expectedPoolUtilizationInfo.push(ethereum.Value.fromUnsignedBigInt(expectedPoolDetails.poolUtilizationInfo.targetUtilization));

    createMockedFunction(poolInfoUtilsMulticallAddressTable.get(dataSource.network())!, 'poolDetailsMulticall', 'poolDetailsMulticall(address):((uint256,uint256,address,uint256,uint256),(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256))')
        .withArgs([ethereum.Value.fromAddress(pool)])
        .returns([
            ethereum.Value.fromTuple(expectedPoolLoansInfo),
            ethereum.Value.fromTuple(expectedPoolPricesInfo),
            ethereum.Value.fromTuple(expectedRatesAndFeesInfo),
            ethereum.Value.fromTuple(expectedPoolReservesInfo),
            ethereum.Value.fromTuple(expectedPoolUtilizationInfo)
        ])
}

// https://github.com/LimeChain/matchstick/issues/376
export function mockGetPoolBalanceDetails(pool: Address, meaningfulIndex: BigInt, quoteToken: Address, collateralToken: Address, isNFT: bool, expectedPoolBalanceDetails: PoolBalanceDetails): void {
    const expectedPoolBalanceDetailsTuple = new ethereum.Tuple();
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.debt));
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.accruedDebt));
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.debtInAuction));
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.t0Debt2ToCollateral));
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.depositUpToIndex));
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.quoteTokenBalance));
    expectedPoolBalanceDetailsTuple.push(ethereum.Value.fromUnsignedBigInt(expectedPoolBalanceDetails.collateralTokenBalance));

    createMockedFunction(poolInfoUtilsMulticallAddressTable.get(dataSource.network())!, 'poolBalanceDetails', 'poolBalanceDetails(address,uint256,address,address,bool):((uint256,uint256,uint256,uint256,uint256,uint256,uint256))')
        .withArgs([
            ethereum.Value.fromAddress(pool),
            ethereum.Value.fromUnsignedBigInt(meaningfulIndex),
            ethereum.Value.fromAddress(quoteToken),
            ethereum.Value.fromAddress(collateralToken),
            ethereum.Value.fromBoolean(isNFT)
        ])
        .returns([
            ethereum.Value.fromTuple(expectedPoolBalanceDetailsTuple)
        ])
}

// mock auctionInfo contract calls
export function mockGetAuctionInfo(borrower: Address, pool: Address, expectedInfo: AuctionInfo): void {
    createMockedFunction(pool, 'auctionInfo', 'auctionInfo(address):(address,uint256,uint256,uint256,uint256,uint256,uint256,address,address,address)')
        .withArgs([ethereum.Value.fromAddress(borrower)])
        .returns([
            ethereum.Value.fromAddress(expectedInfo.kicker),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.bondFactor),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.bondSize),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.kickTime),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.referencePrice),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.neutralPrice),
            ethereum.Value.fromUnsignedBigInt(expectedInfo.thresholdPrice),
            ethereum.Value.fromAddress(expectedInfo.head),
            ethereum.Value.fromAddress(expectedInfo.next),
            ethereum.Value.fromAddress(expectedInfo.prev)
        ])
}

// mock auctionStatus poolInfoUtils calls
export function mockGetAuctionStatus(pool: Address, borrower: Address, expectedInfo: AuctionStatus): void {
  createMockedFunction(poolInfoUtilsAddressTable.get(dataSource.network())!, 
  'auctionStatus', 'auctionStatus(address,address):(uint256,uint256,uint256,bool,uint256,uint256,uint256,uint256,uint256)')
  .withArgs([ethereum.Value.fromAddress(pool), ethereum.Value.fromAddress(borrower)])
  .returns([
        ethereum.Value.fromUnsignedBigInt(expectedInfo.kickTime),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.collateral),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.debtToCover),
        ethereum.Value.fromBoolean(expectedInfo.isCollateralized),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.price),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.neutralPrice),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.referencePrice),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.thresholdPrice),
        ethereum.Value.fromUnsignedBigInt(expectedInfo.bondFactor)
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
    // collateralTokenBalance: BigInt
    // quoteTokenBalance: BigInt
    // TODO: add quoteBalance and collateralBalance
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
    const expectedPoolPricesInfo = new PoolPricesInfo(
        params.hpb,
        params.hpbIndex,
        params.htp,
        params.htpIndex,
        params.lup,
        params.lupIndex
    )
    const expectedRatesAndFeesInfo = new RatesAndFees(
        BigInt.fromString("10000000000000000"),  // 0.01 * 1e18
        BigInt.fromString("850000000000000000"), // 0.85 * 1e18
        BigInt.fromString("50000000000000000")   // 0.05 * 1e18
    )
    const expectedPoolReservesInfo = new ReservesInfo(
        params.reserves,
        params.claimableReserves,
        params.claimableReservesRemaining,
        params.reserveAuctionPrice,
        params.reserveAuctionTimeRemaining
    )
    const expectedPoolUtilizationInfo = new PoolUtilizationInfo(
        params.minDebtAmount,
        params.collateralization,
        params.actualUtilization,
        params.targetUtilization
    )

    const expectedPoolDetails = new PoolDetails(
        expectedPoolLoansInfo,
        expectedPoolPricesInfo,
        expectedRatesAndFeesInfo,
        expectedPoolReservesInfo,
        expectedPoolUtilizationInfo
    )
    mockGetPoolDetailsMulticall(pool, expectedPoolDetails)

    // load pool instance
    const poolInstance = Pool.load(addressToBytes(pool))!
    const depositUpToIndex = wmul(params.poolSize, params.actualUtilization)
    const meaningfulIndex = BigInt.fromI32(max(params.lupIndex.toI32(), params.htpIndex.toI32()))
    const isNFT = poolInstance.poolType != 'Fungible'

    mockGetPoolBalanceDetails(
        pool,
        meaningfulIndex,
        Address.fromBytes(poolInstance.quoteToken),
        Address.fromBytes(poolInstance.collateralToken),
        isNFT,
        new PoolBalanceDetails(
            params.debt,
            ZERO_BI,
            ZERO_BI,
            ZERO_BI,
            depositUpToIndex,
            decimalToWad(poolInstance.quoteTokenBalance),
            decimalToWad(poolInstance.collateralBalance)
        )
    )
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
