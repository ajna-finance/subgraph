import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Lend } from "../../generated/schema"

import { ZERO_BD, ZERO_BI } from "./constants"


export function getLendId(bucketId: Bytes, accountId: Bytes): Bytes {
    return bucketId.concat(Bytes.fromUTF8('|').concat(accountId))
}

export function loadOrCreateLend(bucketId: Bytes, lendId: Bytes, poolId: Bytes, lender: Bytes): Lend {
    let lend = Lend.load(lendId)
    if (lend == null) {
        // create new lend if one already been stored
        lend = new Lend(lendId) as Lend

        lend.bucket          = bucketId
        lend.lender          = lender
        lend.pool            = poolId
        lend.poolAddress     = poolId.toHexString()
        lend.deposit         = ZERO_BD
        lend.lpb             = ZERO_BD
        lend.lpbValueInQuote = ZERO_BD
    }
    return lend
}
