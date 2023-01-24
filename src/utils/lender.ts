import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Lender } from "../../generated/schema"

import { ZERO_BI } from "./constants"


// TODO: add support for list of pools to which a lender has deposits
export function loadOrCreateLender(lenderId: Bytes): Lender {
    let lender = Lender.load(lenderId)
    if (lender == null) {
      // create new lender if lender hasn't already been loaded
      lender = new Lender(lenderId) as Lender

      lender.bucketIndexes = []
      lender.totalDeposits = ZERO_BI
      lender.totalLPB      = ZERO_BI
      lender.txCount       = ZERO_BI
    }

    return lender
}