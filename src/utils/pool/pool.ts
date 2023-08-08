import { BigDecimal, BigInt, Bytes, Address, dataSource } from '@graphprotocol/graph-ts'

import { ERC721Token, LiquidationAuction, Pool, ReserveAuction, Token } from "../../../generated/schema"
import { ERC20Pool } from '../../../generated/templates/ERC20Pool/ERC20Pool'
import { ERC721Pool } from '../../../generated/templates/ERC721Pool/ERC721Pool'
import { PoolInfoUtils } from '../../../generated/templates/ERC20Pool/PoolInfoUtils'

import { MAX_PRICE, MAX_PRICE_INDEX, ONE_BD, poolFactoryAddressTable, poolInfoUtilsAddressTable, TEN_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../constants"
import { addressToBytes, decimalToWad, wadToDecimal } from '../convert'
import { getTokenBalance } from '../token-erc20'
import { getTokenBalance as getERC721TokenBalance } from '../token-erc721'
import { wmul, wdiv } from '../math'
import { ERC721PoolFactory } from '../../../generated/ERC721PoolFactory/ERC721PoolFactory'

export function getPoolAddress(poolId: Bytes): Address {
  return Address.fromBytes(poolId)
}

export function getPoolSubsetHash(tokenIds: BigInt[]): Bytes {
  const erc721PoolFactoryAddress = poolFactoryAddressTable.get(dataSource.network())!
  const poolFactoryContract = ERC721PoolFactory.bind(erc721PoolFactoryAddress)

  return poolFactoryContract.getNFTSubsetHash(tokenIds)
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
export function getLenderInfoERC721Pool(poolId: Bytes, bucketIndex: BigInt, lender: Address): LenderInfo {
  const poolContract = ERC721Pool.bind(Address.fromBytes(poolId))
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

export function calculateLendRate(borrowRate: BigInt, lenderInterestMargin: BigInt, utilization: BigInt): BigDecimal {
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
    
    // TODO: NEED TO UPDATE THIS PER POOL TYPE
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
    // update quote token balances, this is common between all pool types
    const poolAddress = Address.fromBytes(pool.id)
    let token = Token.load(pool.quoteToken)!
    let scaleFactor = TEN_BI.pow(18 - token.decimals as u8)
    let unnormalizedTokenBalance = getTokenBalance(Address.fromBytes(pool.quoteToken), poolAddress)
    pool.quoteTokenBalance = wadToDecimal(unnormalizedTokenBalance.times(scaleFactor))
    // update collateral token balances
    // use the appropriate contract for querying balanceOf the pool
    if (pool.poolType == 'Fungible') {
      token = Token.load(pool.collateralToken)!
      scaleFactor = TEN_BI.pow(18 - token.decimals as u8)
      unnormalizedTokenBalance = getTokenBalance(Address.fromBytes(pool.collateralToken), poolAddress)
    }
    else {
      scaleFactor = TEN_BI.pow(18) // assume 18 decimal factor for ERC721
      unnormalizedTokenBalance = getERC721TokenBalance(Address.fromBytes(pool.collateralToken), poolAddress)
    }
    pool.collateralBalance = wadToDecimal(unnormalizedTokenBalance.times(scaleFactor))

    // update lend rate and borrow fee, which change irrespective of borrow rate
    const ratesAndFees = getRatesAndFees(poolAddress)
    pool.lendRate = calculateLendRate(
      decimalToWad(pool.borrowRate), 
      ratesAndFees.lenderInterestMargin, 
      poolUtilizationInfo.actualUtilization)
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
export function getCurrentBurnEpochERC721Pool(pool: Pool): BigInt {
  const poolContract = ERC721Pool.bind(Address.fromBytes(pool.id))
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
export function getBurnInfoERC721Pool(pool: Pool, burnEpoch: BigInt): BurnInfo {
  const poolContract = ERC721Pool.bind(Address.fromBytes(pool.id))
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
export function getDebtInfoERC721Pool(pool: Pool): DebtInfo {
  const poolContract = ERC721Pool.bind(Address.fromBytes(pool.id))
  const debtInfoResult = poolContract.debtInfo()

  return new DebtInfo(
    debtInfoResult.value0,
    debtInfoResult.value1,
    debtInfoResult.value2,
    debtInfoResult.value3
  )
}

export function isERC20Pool(pool: Pool): boolean {
  return pool.poolType == 'Fungible'
}

// TODO: use this in erc-20-pool-factory
export function loadOrCreatePool(id: Bytes): Pool {
  let pool = Pool.load(id)
  if (pool == null) {
    pool = new Pool(id) as Pool

    // pool global information
    pool.txCount = ZERO_BI
    pool.createdAtTimestamp = ZERO_BI
    pool.createdAtBlockNumber = ZERO_BI
    pool.poolType = 'NOT_SET'

    // pool token information
    pool.collateralToken = addressToBytes(ZERO_ADDRESS)
    pool.quoteToken = addressToBytes(ZERO_ADDRESS)

    // pool debt information
    pool.t0debt = ZERO_BD
    pool.inflator = ONE_BD
    pool.lendRate = ZERO_BD
    pool.pledgedCollateral = ZERO_BD

    // pool rate information
    pool.borrowRate = ZERO_BD
    pool.borrowFeeRate = ZERO_BD
    pool.depositFeeRate = ZERO_BD

    // pool loans information
    pool.poolSize = ZERO_BD
    pool.loansCount = ZERO_BI
    pool.maxBorrower = ZERO_ADDRESS
    pool.quoteTokenFlashloaned = ZERO_BD
    pool.collateralFlashloaned = ZERO_BD

    // pool prices information
    pool.hpb = ZERO_BD
    pool.hpbIndex = 0
    pool.htp = ZERO_BD
    pool.htpIndex = 0
    pool.lup = MAX_PRICE
    pool.lupIndex = MAX_PRICE_INDEX
    pool.momp = ZERO_BD

    // reserve auction information
    pool.reserves = ZERO_BD
    pool.claimableReserves = ZERO_BD
    pool.claimableReservesRemaining = ZERO_BD
    pool.burnEpoch = ZERO_BI
    pool.totalAjnaBurned = ZERO_BD
    pool.reserveAuctions = []
    pool.totalInterestEarned = ZERO_BD // updated on ReserveAuction

    // utilization information
    pool.minDebtAmount = ZERO_BD
    pool.actualUtilization = ZERO_BD
    pool.targetUtilization = ONE_BD

    // liquidation information
    pool.totalBondEscrowed = ZERO_BD
    pool.liquidationAuctions = []

    // TVL information
    pool.quoteTokenBalance = ZERO_BD
    pool.collateralBalance = ZERO_BD

    // ERC721 Pool Information
    pool.tokenIdsAllowed = []
    pool.tokenIdsPledged = []
    pool.subsetHash = Bytes.empty()

    pool.save()
  }
  return pool
}
