import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Bucket } from "../../generated/schema"

import { ONE_BD, ONE_BI, ZERO_BI } from "./constants"

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
      bucket.collateral = ZERO_BI
      bucket.deposit = ZERO_BI
      bucket.exchangeRate = ONE_BI
      bucket.lpb = ZERO_BI
    }
    return bucket
}