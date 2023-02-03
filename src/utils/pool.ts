import { BigDecimal, BigInt, Bytes, Address, dataSource } from '@graphprotocol/graph-ts'

import { ERC20 } from '../../generated/ERC20PoolFactory/ERC20'
import { ERC20Pool } from '../../generated/ERC20Pool/ERC20Pool'
import { PoolInfoUtils } from '../../generated/ERC20Pool/PoolInfoUtils'
import { Pool } from "../../generated/schema"

import { poolInfoUtilsNetworkLookUpTable, ONE_BI } from "./constants"
import { wadToDecimal } from './convert'

export function getPoolAddress(poolId: Bytes): Address {
    return Address.fromBytes(poolId)
}

export class ReservesInfo {
    reserves: BigInt
    claimableReserves: BigInt
    claimableReservesRemaining: BigInt
    auctionPrice: BigInt
    timeRemaining: BigInt
    constructor(reserves: BigInt, claimableReserves: BigInt, claimableReservesRemaining: BigInt, auctionPrice: BigInt, timeRemaining: BigInt) {
        this.reserves = reserves
        this.claimableReserves = claimableReserves
        this.claimableReservesRemaining = claimableReservesRemaining
        this.auctionPrice = auctionPrice
        this.timeRemaining = timeRemaining
    }
}
export function getPoolReservesInfo(pool: Pool): ReservesInfo {
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
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
    poolMinDebtAmount: BigInt
    poolCollateralization: BigInt
    poolActualUtilization: BigInt
    poolTargetUtilization: BigInt
    constructor(poolMinDebtAmount: BigInt, poolCollateralization: BigInt, poolActualUtilization: BigInt, poolTargetUtilization: BigInt) {
        this.poolMinDebtAmount = poolMinDebtAmount
        this.poolCollateralization = poolCollateralization
        this.poolActualUtilization = poolActualUtilization
        this.poolTargetUtilization = poolTargetUtilization
    }
}
export function getPoolUtilizationInfo(pool: Pool): PoolUtilizationInfo {
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
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
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
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

export function updatePool(pool: Pool): void {
    // update pool prices information
    const poolPricesInfo = getPoolPricesInfo(pool)
    pool.hpb = wadToDecimal(poolPricesInfo.hpb)
    pool.hpbIndex = poolPricesInfo.hpbIndex
    pool.htp = wadToDecimal(poolPricesInfo.htp)
    pool.htpIndex = poolPricesInfo.htpIndex
    pool.lup = wadToDecimal(poolPricesInfo.lup)
    pool.lupIndex = poolPricesInfo.lupIndex

    // update reserve auction information
    const poolReservesInfo = getPoolReservesInfo(pool)
    pool.reserves = wadToDecimal(poolReservesInfo.reserves)
    pool.claimableReserves = wadToDecimal(poolReservesInfo.claimableReserves)
    pool.reserveAuctionPrice = wadToDecimal(poolReservesInfo.auctionPrice)
    pool.reserveAuctionTimeRemaining = poolReservesInfo.timeRemaining

    // update pool utilization information
    const poolUtilizationInfo = getPoolUtilizationInfo(pool)
    pool.minDebtAmount     = wadToDecimal(poolUtilizationInfo.poolMinDebtAmount)
    pool.collateralization = wadToDecimal(poolUtilizationInfo.poolCollateralization)
    pool.actualUtilization = wadToDecimal(poolUtilizationInfo.poolActualUtilization)
    pool.targetUtilization = wadToDecimal(poolUtilizationInfo.poolTargetUtilization)

    // update pool transaction counter
    pool.txCount = pool.txCount.plus(ONE_BI)
}
