import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { PoolInfoUtils } from '../../generated/templates/ERC20Pool/PoolInfoUtils'

import { ONE_BD, ZERO_BD, poolInfoUtilsAddressTable } from "./constants"
import { decimalToWad, wadToDecimal } from "./convert"

export function lpbValueInQuote(pool: Bytes, bucketIndex: u32, lpAmount: BigDecimal): BigDecimal {
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)

    const quoteTokenAmount = poolInfoUtilsContract.lpToQuoteTokens(
      poolAddress, 
      decimalToWad(lpAmount), 
      BigInt.fromU32(bucketIndex)
    )

    return wadToDecimal(quoteTokenAmount)
}

export function collateralizationAtLup(debt: BigDecimal, collateral: BigDecimal, lup: BigDecimal): BigDecimal {
    if (debt > ZERO_BD && lup > ZERO_BD) {
      return collateral.times(lup).div(debt)
    } else {
      return ONE_BD
    }
}

export function thresholdPrice(debt: BigDecimal, collateral: BigDecimal): BigDecimal {
    if (collateral > ZERO_BD) {
      return debt.div(collateral)
    } else {
      return ZERO_BD;
    }
}
