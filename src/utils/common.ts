import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { PoolInfoUtils } from '../../generated/templates/ERC20Pool/PoolInfoUtils'

import { ZERO_BD, poolInfoUtilsNetworkLookUpTable } from "./constants"
import { bigDecimalWadToBigInt, wadToDecimal } from "./convert"

export function lpbValueInQuote(pool: Bytes, bucketIndex: u32, lpAmount: BigDecimal): BigDecimal {
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)

    const quoteTokenAmount = poolInfoUtilsContract.lpsToQuoteTokens(
      poolAddress, 
      bigDecimalWadToBigInt(lpAmount), 
      BigInt.fromU32(bucketIndex)
    )

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
