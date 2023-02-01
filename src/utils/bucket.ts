import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Bucket } from "../../generated/schema"

import { ONE_BD, ONE_BI, ONE_RAY_BD, ZERO_BD, ZERO_BI } from "./constants"
import { bigDecimalExp18, wadToRay } from "./convert"

function calculateExchangeRate(collateral: BigDecimal, deposit: BigDecimal, lpb: BigDecimal, price: BigDecimal): BigDecimal {
    return wadToRay(deposit)
        .plus(price.times(collateral))
        .times(bigDecimalExp18())
        .div(lpb)
}

export function getBucketId(pool: Bytes, index: BigInt): Bytes {
    return pool.concat(Bytes.fromUTF8('#' + index.toString()))
}

export function loadOrCreateBucket(poolId: Bytes, bucketId: Bytes, index: BigInt): Bucket {
    let bucket = Bucket.load(bucketId)
    if (bucket == null) {
      // create new bucket if bucket hasn't already been loaded
      bucket = new Bucket(bucketId) as Bucket

      bucket.bucketIndex = index
      bucket.poolAddress = poolId.toHexString()
      bucket.collateral = ZERO_BD
      bucket.deposit = ZERO_BD
      bucket.exchangeRate = ONE_RAY_BD
      bucket.lpb = ZERO_BD
    }
    return bucket
}