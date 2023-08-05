import { BigDecimal, BigInt, Bytes, Address, dataSource, bigInt } from '@graphprotocol/graph-ts'

import { LiquidationAuction, Pool, ReserveAuction, Token } from "../../../generated/schema"
import { ERC20Pool } from '../../../generated/templates/ERC20Pool/ERC20Pool'
import { PoolInfoUtils } from '../../../generated/templates/ERC20Pool/PoolInfoUtils'

import { poolInfoUtilsAddressTable, TEN_BI, ZERO_BD, ZERO_BI } from "../constants"
import { decimalToWad, wadToDecimal } from '../convert'
import { getTokenBalance } from '../token-erc20'
import { wmul, wdiv, wmin } from '../math'

export function getPoolAddress(poolId: Bytes): Address {
  return Address.fromBytes(poolId)
}

export class LenderInfo {
  lpBalance: BigInt
  depositTime: BigInt
  constructor(lpBalance: BigInt, depositTime: BigInt) {
    this.lpBalance = lpBalance
    this.depositTime = depositTime
  }
}
export function getLenderInfo(poolId: Bytes, bucketIndex: BigInt, lender: Address): LenderInfo {
  const poolContract = ERC20Pool.bind(Address.fromBytes(poolId))
  const lenderInfoResult = poolContract.lenderInfo(bucketIndex, lender)

  return new LenderInfo(
    lenderInfoResult.value0,
    lenderInfoResult.value1
  )
}

// retrieve the current pool MOMP by calling PoolInfoUtils.momp()
export function getMomp(poolId: Bytes): BigDecimal {
  const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
  const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
  const pool = Pool.load(poolId)
  return wadToDecimal(poolInfoUtilsContract.momp(Address.fromBytes(poolId)))
}

export class RatesAndFees {
  lenderInterestMargin: BigInt
  borrowFeeRate: BigInt
  depositFeeRate: BigInt
  constructor(lenderInterestMargin: BigInt, borrowFeeRate: BigInt, depositFeeRate: BigInt) {
    this.lenderInterestMargin = lenderInterestMargin
    this.borrowFeeRate = borrowFeeRate
    this.depositFeeRate = depositFeeRate
  }
}

export function getRatesAndFees(poolId: Bytes): RatesAndFees {
  const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
  const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
  const poolAddress = Address.fromBytes(poolId)

  const lim = poolInfoUtilsContract.lenderInterestMargin(poolAddress)
  const bfr = poolInfoUtilsContract.borrowFeeRate(poolAddress)
  const dfr = poolInfoUtilsContract.unutilizedDepositFeeRate(poolAddress)
  return new RatesAndFees(lim, bfr, dfr);
}

export function calculateLendRate(
  poolAddress: Address, 
  borrowRate: BigInt, 
  lenderInterestMargin: BigInt, 
  poolPricesInfo: PoolPricesInfo, 
  debt: BigInt
): BigDecimal {
  const meaningfulPriceIndex = max(poolPricesInfo.lupIndex.toU32(), poolPricesInfo.htpIndex.toU32())
  const meaningfulDeposit = depositUpToIndex(poolAddress, meaningfulPriceIndex)
  if (meaningfulDeposit.equals(ZERO_BI)) return ZERO_BD
  const utilization = wdiv(debt, meaningfulDeposit)
  return wadToDecimal(wmul(wmul(borrowRate,lenderInterestMargin), utilization))
}

export class LoansInfo {
    poolSize: BigInt
    loansCount: BigInt
    maxBorrower: Address
    pendingInflator: BigInt
    pendingInterestFactor: BigInt
    constructor(poolSize: BigInt, loansCount: BigInt, maxBorrower: Address, pendingInflator: BigInt, pendingInterestFactor: BigInt) {
        this.poolSize = poolSize
        this.loansCount = loansCount
        this.maxBorrower = maxBorrower
        this.pendingInflator = pendingInflator
        this.pendingInterestFactor = pendingInterestFactor
    }
}
export function getPoolLoansInfo(pool: Pool): LoansInfo {
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
    const loansInfoResult = poolInfoUtilsContract.poolLoansInfo(Address.fromBytes(pool.id))

    const loansInfo = new LoansInfo(
        loansInfoResult.value0,
        loansInfoResult.value1,
        loansInfoResult.value2,
        loansInfoResult.value3,
        loansInfoResult.value4
    )
    return loansInfo
}

export class PoolPricesInfo {
    hpb: BigInt
    hpbIndex: BigInt
    htp: BigInt
    htpIndex: BigInt
    lup: BigInt
    lupIndex: BigInt
    constructor(hpb: BigInt, hpbIndex: BigInt, htp: BigInt, htpIndex: BigInt, lup: BigInt, lupIndex: BigInt) {
        this.hpb = hpb
        this.hpbIndex = hpbIndex
        this.htp = htp
        this.htpIndex = htpIndex
        this.lup = lup
        this.lupIndex = lupIndex
    }
}
export function getPoolPricesInfo(pool: Pool): PoolPricesInfo {
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
    const pricesInfoResult = poolInfoUtilsContract.poolPricesInfo(Address.fromBytes(pool.id))

    const pricesInfo = new PoolPricesInfo(
        pricesInfoResult.value0,
        pricesInfoResult.value1,
        pricesInfoResult.value2,
        pricesInfoResult.value3,
        pricesInfoResult.value4,
        pricesInfoResult.value5
    )
    return pricesInfo
}

export class ReservesInfo {
    reserves: BigInt
    claimableReserves: BigInt
    claimableReservesRemaining: BigInt
    reserveAuctionPrice: BigInt
    reserveAuctionTimeRemaining: BigInt
    constructor(reserves: BigInt, claimableReserves: BigInt, claimableReservesRemaining: BigInt, reserveAuctionPrice: BigInt, reserveAuctionTimeRemaining: BigInt) {
        this.reserves = reserves
        this.claimableReserves = claimableReserves
        this.claimableReservesRemaining = claimableReservesRemaining
        this.reserveAuctionPrice = reserveAuctionPrice
        this.reserveAuctionTimeRemaining = reserveAuctionTimeRemaining
    }
}
export function getPoolReservesInfo(pool: Pool): ReservesInfo {
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
    const reservesInfoResult = poolInfoUtilsContract.poolReservesInfo(Address.fromBytes(pool.id))

    const reservesInfo = new ReservesInfo(
        reservesInfoResult.value0,
        reservesInfoResult.value1,
        reservesInfoResult.value2,
        reservesInfoResult.value3,
        reservesInfoResult.value4
    )
    return reservesInfo
}

export class PoolUtilizationInfo {
    minDebtAmount: BigInt
    collateralization: BigInt
    actualUtilization: BigInt
    targetUtilization: BigInt
    constructor(minDebtAmount: BigInt, collateralization: BigInt, actualUtilization: BigInt, targetUtilization: BigInt) {
        this.minDebtAmount = minDebtAmount
        this.collateralization = collateralization
        this.actualUtilization = actualUtilization
        this.targetUtilization = targetUtilization
    }
}
export function getPoolUtilizationInfo(pool: Pool): PoolUtilizationInfo {
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
    const poolUtilizationInfoResult = poolInfoUtilsContract.poolUtilizationInfo(Address.fromBytes(pool.id))

    const poolUtilizationInfo = new PoolUtilizationInfo(
        poolUtilizationInfoResult.value0,
        poolUtilizationInfoResult.value1,
        poolUtilizationInfoResult.value2,
        poolUtilizationInfoResult.value3
    )
    return poolUtilizationInfo
}

// TODO: investigate multicall for faster rpc
// TODO: investigate checking blockHeight to avoid duplicate calls on same block
export function updatePool(pool: Pool): void {
    // update pool loan information
    const poolLoansInfo = getPoolLoansInfo(pool)
    pool.poolSize       = wadToDecimal(poolLoansInfo.poolSize)
    pool.loansCount     = poolLoansInfo.loansCount
    pool.maxBorrower    = poolLoansInfo.maxBorrower
    pool.inflator       = wadToDecimal(poolLoansInfo.pendingInflator)
    
    // update amount of debt in pool
    const debtInfo = getDebtInfo(pool)
    pool.t0debt = wadToDecimal(wdiv(debtInfo.pendingDebt, poolLoansInfo.pendingInflator))

    // update pool prices information
    const poolPricesInfo = getPoolPricesInfo(pool)
    pool.hpb = wadToDecimal(poolPricesInfo.hpb)
    pool.hpbIndex = poolPricesInfo.hpbIndex.toU32()
    pool.htp = wadToDecimal(poolPricesInfo.htp)
    pool.htpIndex = poolPricesInfo.htpIndex.toU32()
    pool.lup = wadToDecimal(poolPricesInfo.lup)
    pool.lupIndex = poolPricesInfo.lupIndex.toU32()
    pool.momp = getMomp(pool.id)

    // update reserve auction information
    const poolReservesInfo = getPoolReservesInfo(pool)
    pool.reserves = wadToDecimal(poolReservesInfo.reserves)
    pool.claimableReserves = wadToDecimal(poolReservesInfo.claimableReserves)
    pool.claimableReservesRemaining = wadToDecimal(poolReservesInfo.claimableReservesRemaining)

    // update pool utilization information
    const poolUtilizationInfo = getPoolUtilizationInfo(pool)
    pool.minDebtAmount     = wadToDecimal(poolUtilizationInfo.minDebtAmount)
    pool.actualUtilization = wadToDecimal(poolUtilizationInfo.actualUtilization)
    pool.targetUtilization = wadToDecimal(poolUtilizationInfo.targetUtilization)

    // update pool token balances
    const poolAddress = Address.fromBytes(pool.id)
    let token = Token.load(pool.quoteToken)!
    let scaleFactor = TEN_BI.pow(18 - token.decimals as u8)
    let unnormalizedTokenBalance = getTokenBalance(Address.fromBytes(pool.quoteToken), poolAddress)
    pool.quoteTokenBalance = wadToDecimal(unnormalizedTokenBalance.times(scaleFactor))
    token = Token.load(pool.collateralToken)!
    scaleFactor = TEN_BI.pow(18 - token.decimals as u8)
    unnormalizedTokenBalance = getTokenBalance(Address.fromBytes(pool.collateralToken), poolAddress)
    pool.collateralBalance = wadToDecimal(unnormalizedTokenBalance.times(scaleFactor))

    // update lend rate and borrow fee, which change irrespective of borrow rate
    const ratesAndFees = getRatesAndFees(poolAddress)
    pool.lendRate = calculateLendRate(
      poolAddress,
      decimalToWad(pool.borrowRate), 
      ratesAndFees.lenderInterestMargin, 
      poolPricesInfo,
      debtInfo.pendingDebt)
    pool.borrowFeeRate = wadToDecimal(ratesAndFees.borrowFeeRate)
}

// if absent, add a liquidation auction to the pool's collection of active liquidations
export function addLiquidationToPool(pool: Pool, liquidationAuction: LiquidationAuction): void {
    const liquidationAuctions = pool.liquidationAuctions
    // get current index of pool in account's list of pools
    const index = liquidationAuctions.indexOf(liquidationAuction.id)
    if (index == -1) {
        pool.liquidationAuctions = pool.liquidationAuctions.concat([liquidationAuction.id])
    }
}

// if present, remove a settled liquidation from the pool's collection of active liquidations
export function removeLiquidationFromPool(pool: Pool, liquidationAuction: LiquidationAuction): void {
    const index = pool.liquidationAuctions.indexOf(liquidationAuction.id)
    if (index != -1) {
        pool.liquidationAuctions.splice(index, 1)
    }
}

// add a claimable reserve auction to the pool's list
export function addReserveAuctionToPool(pool: Pool, reserveAuction: ReserveAuction): void {
  const reserveAuctions = pool.reserveAuctions
  // get current index of pool in account's list of pools
  const index = reserveAuctions.indexOf(reserveAuction.id)
  if (index == -1) {
    pool.reserveAuctions = pool.reserveAuctions.concat([reserveAuction.id])
  }
}

export function getCurrentBurnEpoch(pool: Pool): BigInt {
    const poolContract = ERC20Pool.bind(Address.fromBytes(pool.id))
    const ajnaBurnEpoch = poolContract.currentBurnEpoch()
    return ajnaBurnEpoch
}

export class BurnInfo {
    timestamp: BigInt
    totalInterest: BigInt
    totalBurned: BigInt
    constructor(timestamp: BigInt, totalInterest: BigInt, totalBurned: BigInt) {
        this.timestamp = timestamp
        this.totalInterest = totalInterest
        this.totalBurned = totalBurned
    }
}
export function getBurnInfo(pool: Pool, burnEpoch: BigInt): BurnInfo {
    const poolContract = ERC20Pool.bind(Address.fromBytes(pool.id))
    const burnInfoResult = poolContract.burnInfo(burnEpoch)

    const burnInfo = new BurnInfo(
        burnInfoResult.value0,
        burnInfoResult.value1,
        burnInfoResult.value2
    )
    return burnInfo
}

export class DebtInfo {
    pendingDebt: BigInt
    accruedDebt: BigInt
    liquidationDebt: BigInt
    t0Debt2ToCollateral: BigInt
    constructor(pendingDebt: BigInt, accruedDebt: BigInt, liquidationDebt: BigInt, t0Debt2ToCollateral: BigInt) {
        this.pendingDebt = pendingDebt
        this.accruedDebt = accruedDebt
        this.liquidationDebt = liquidationDebt
        this.t0Debt2ToCollateral = t0Debt2ToCollateral
    }
}
export function getDebtInfo(pool: Pool): DebtInfo {
  const poolContract = ERC20Pool.bind(Address.fromBytes(pool.id))
  const debtInfoResult = poolContract.debtInfo()

  return new DebtInfo(
    debtInfoResult.value0,
    debtInfoResult.value1,
    debtInfoResult.value2,
    debtInfoResult.value3
  )
}

export function depositUpToIndex(poolAddress: Address, index: u32): BigInt {
  const poolContract = ERC20Pool.bind(poolAddress)
  return poolContract.depositUpToIndex(BigInt.fromU32(index));
}
