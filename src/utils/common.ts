import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { Bucket, Lend } from "../../generated/schema"
import { PoolInfoUtils } from '../../generated/templates/ERC20Pool/PoolInfoUtils'

import { poolInfoUtilsNetworkLookUpTable } from "./constants"
import { bigDecimalWadToBigInt, wadToDecimal } from "./convert"

export function lpbValueInQuote(pool: Bytes, bucket: Bucket, lend: Lend): BigDecimal {
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)

    const quoteTokenAmount = poolInfoUtilsContract.lpsToQuoteTokens(
      poolAddress, 
      bigDecimalWadToBigInt(lend.lpb), 
      BigInt.fromU32(bucket.bucketIndex)
    )
    // TODO: Odd that we pass in the Lend to this method, but the caller is responsible for 
    // mutating.  We should either take in an LP amount instead of a Lend, or just handle 
    // the mutatation by setting lpbValueInQuote here.
    return wadToDecimal(quoteTokenAmount)
}

export function encumberance(debt: BigInt, price: BigInt): BigInt {
    return debt.div(price)
}

export function collateralization(debt: BigDecimal, encumberedCollateral: BigDecimal): BigDecimal {
    return debt.div(encumberedCollateral)
}

// TODO: check for precision loss
export function collateralizationAtLup(debt: BigDecimal, collateral: BigDecimal, lup: BigDecimal): BigDecimal {
    const encumberedCollateral = debt.div(lup)
    return debt.div(encumberedCollateral)
}

export function thresholdPrice(debt: BigDecimal, collateral: BigDecimal): BigDecimal {
    return debt.div(collateral)
}