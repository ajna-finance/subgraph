import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Bucket, Lend } from "../../generated/schema"

import { ZERO_BI } from "./constants"

export function lpbValueInQuote(bucket: Bucket, lend: Lend): BigInt {
    // TODO: need to convert from RAY to WAD
    let quoteTokenAmount = lend.lpb.times(bucket.exchangeRate)

    if (quoteTokenAmount.gt(bucket.deposit)) {
        quoteTokenAmount = bucket.deposit
    }
    return quoteTokenAmount
}

export function encumberance(debt: BigInt, price: BigInt): BigInt {
    return debt.div(price)
}

export function collateralization(debt: BigInt, encumberedCollateral: BigInt): BigInt {
    return debt.div(encumberedCollateral)
}