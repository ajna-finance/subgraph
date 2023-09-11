import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { Bucket, Lend, PositionLend } from "../../../generated/schema"
import { PoolInfoUtils } from '../../../generated/templates/ERC20Pool/PoolInfoUtils'

import { poolInfoUtilsAddressTable, ONE_BD, ZERO_BD } from "../constants"
import { indexToPrice, wadToDecimal } from "../convert"

export function getBucketId(pool: Bytes, index: u32): Bytes {
    return pool.concat(Bytes.fromUTF8('#' + index.toString()))
}

export class BucketInfo {
    index: u32
    price: BigDecimal
    quoteTokens: BigInt // deposit + interest
    collateral: BigInt
    lpb: BigInt
    scale: BigInt
    exchangeRate: BigInt
    constructor(index: u32, price: BigDecimal, quoteTokens: BigInt, collateral: BigInt, lpb: BigInt, scale: BigInt, exchangeRate: BigInt) {
        this.index = index
        this.price = price
        this.quoteTokens = quoteTokens
        this.collateral = collateral
        this.lpb = lpb
        this.scale = scale
        this.exchangeRate = exchangeRate
    }
}
export function getBucketInfo(pool: Bytes, index: u32): BucketInfo {
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
    const bucketInfoResult = poolInfoUtilsContract.bucketInfo(poolAddress, BigInt.fromU32(index))

    const bucketInfo = new BucketInfo(
        index,
        bucketInfoResult.value0.toBigDecimal(),
        bucketInfoResult.value1,
        bucketInfoResult.value2,
        bucketInfoResult.value3,
        bucketInfoResult.value4,
        bucketInfoResult.value5
    )

    return bucketInfo
}

export function loadOrCreateBucket(poolId: Bytes, bucketId: Bytes, index: u32): Bucket {
    let bucket = Bucket.load(bucketId)
    if (bucket == null) {
      // create new bucket if bucket hasn't already been loaded
      bucket = new Bucket(bucketId) as Bucket

      bucket.bucketIndex   = index
      bucket.bucketPrice   = indexToPrice(index)
      bucket.poolAddress   = poolId.toHexString()
      bucket.pool          = poolId
      bucket.collateral    = ZERO_BD
      bucket.deposit       = ZERO_BD
      bucket.exchangeRate  = ONE_BD
      bucket.lpb           = ZERO_BD
      bucket.lends         = []
      bucket.positionLends = []
    }
    return bucket
}

export function updateBucket(bucket: Bucket, bucketInfo: BucketInfo): void {
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)
}

export function updateBucketLends(bucket: Bucket, lend: Lend): void {
    // get current index of lend in bucket's list of lends
    const index = bucket.lends.indexOf(lend.id)
    if (lend.lpb != ZERO_BD && index == -1) {
        bucket.lends = bucket.lends.concat([lend.id])
    } else if (lend.lpb == ZERO_BD && index != -1) {
        bucket.lends.splice(index, 1)
    }
}
