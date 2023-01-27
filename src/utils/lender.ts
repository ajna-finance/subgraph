import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Lender, PoolLend } from "../../generated/schema"

import { ZERO_BI } from "./constants"


export function getPoolLendId(poolId: Bytes, lenderId: Bytes): Bytes {
    return poolId.concat(Bytes.fromUTF8('#').concat(lenderId))
}

export function loadOrCreateLender(lenderId: Bytes): Lender {
    let lender = Lender.load(lenderId)
    if (lender == null) {
      // create new lender if lender hasn't already been stored
      lender = new Lender(lenderId) as Lender

      lender.loans   = []
      lender.pools   = []
      lender.txCount = ZERO_BI
    }

    return lender
}

export function loadOrCreatePoolLend(poolId: Bytes, lenderId: Bytes): PoolLend {
    const poolLendId = getPoolLendId(poolId, lenderId)
    let poolLend = PoolLend.load(poolLendId)
    if (poolLend == null) {
        // create new poolLend if one already been stored
        poolLend = new PoolLend(poolLendId) as PoolLend

        poolLend.bucketIndexes = []
        poolLend.pool          = poolId
        poolLend.totalDeposits = ZERO_BI
        poolLend.totalLPB      = ZERO_BI
    }
    return poolLend
}
