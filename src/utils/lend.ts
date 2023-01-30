import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Bucket, Lend } from "../../generated/schema"

import { ZERO_BI } from "./constants"


export function getLendId(bucketId: Bytes, accountId: Bytes): Bytes {
    return bucketId.concat(Bytes.fromUTF8('|').concat(accountId))
}

export function loadOrCreateLend(bucketId: Bytes, lendId: Bytes, poolId: Bytes): Lend {
    let lend = Lend.load(lendId)
    if (lend == null) {
        // create new lend if one already been stored
        lend = new Lend(lendId) as Lend

        lend.bucket          = bucketId
        lend.pool            = poolId
        lend.poolAddress     = poolId.toHexString()
        lend.deposit         = ZERO_BI
        lend.lpb             = ZERO_BI
        lend.lpbValueInQuote = ZERO_BI
    }
    return lend
}
