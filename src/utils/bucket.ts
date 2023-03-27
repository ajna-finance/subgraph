import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { Bucket } from "../../generated/schema"
import { PoolInfoUtils } from '../../generated/templates/ERC20Pool/PoolInfoUtils'

import { poolInfoUtilsNetworkLookUpTable, ONE_BD, ONE_BI, ZERO_BD, ZERO_BI, ONE_WAD_BD } from "./constants"
import { wadToDecimal } from "./convert"

export function getBucketId(pool: Bytes, index: BigInt): Bytes {
    return pool.concat(Bytes.fromUTF8('#' + index.toString()))
}

export class BucketInfo {
    index: BigInt
    quoteTokens: BigInt // deposit + interest
    collateral: BigInt
    lpb: BigInt
    scale: BigInt
    exchangeRate: BigInt
    constructor(index: BigInt, quoteTokens: BigInt, collateral: BigInt, lpb: BigInt, scale: BigInt, exchangeRate: BigInt) {
        this.index = index
        this.quoteTokens = quoteTokens
        this.collateral = collateral
        this.lpb = lpb
        this.scale = scale
        this.exchangeRate = exchangeRate
    }
}
export function getBucketInfo(pool: Bytes, index: BigInt): BucketInfo {
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress) // TODO: what should this bind to?
    const bucketInfoResult = poolInfoUtilsContract.bucketInfo(poolAddress, index)

    const bucketInfo = new BucketInfo(
        bucketInfoResult.value0,
        bucketInfoResult.value1,
        bucketInfoResult.value2,
        bucketInfoResult.value3,
        bucketInfoResult.value4,
        bucketInfoResult.value5
    )

    return bucketInfo
}

export function loadOrCreateBucket(poolId: Bytes, bucketId: Bytes, index: BigInt): Bucket {
    let bucket = Bucket.load(bucketId)
    if (bucket == null) {
      // create new bucket if bucket hasn't already been loaded
      bucket = new Bucket(bucketId) as Bucket

      bucket.bucketIndex  = index
      bucket.poolAddress  = poolId.toHexString()
      bucket.collateral   = ZERO_BD
      bucket.deposit      = ZERO_BD
      bucket.exchangeRate = ONE_WAD_BD
      bucket.lpb          = ZERO_BD
    }
    return bucket
}

export function updateBucket(bucket: Bucket, bucketInfo: BucketInfo): void {
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)
}
