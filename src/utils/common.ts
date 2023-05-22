import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { PoolInfoUtils } from '../../generated/templates/ERC20Pool/PoolInfoUtils'

import { ONE_BD, ZERO_BD, poolInfoUtilsNetworkLookUpTable } from "./constants"
import { decimalToWad, wadToDecimal } from "./convert"

export function lpbValueInQuote(pool: Bytes, bucketIndex: u32, lpAmount: BigDecimal): BigDecimal {
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)

    const quoteTokenAmount = poolInfoUtilsContract.lpToQuoteTokens(
      poolAddress, 
      decimalToWad(lpAmount), 
      BigInt.fromU32(bucketIndex)
    )

    return wadToDecimal(quoteTokenAmount)
}

export function collateralization(debt: BigDecimal, encumberedCollateral: BigDecimal): BigDecimal {
    return debt.div(encumberedCollateral)
}

// TODO: check for precision loss
export function collateralizationAtLup(debt: BigDecimal, collateral: BigDecimal, lup: BigDecimal): BigDecimal {
    if (debt > ZERO_BD && lup > ZERO_BD) {
      const encumberedCollateral = debt.div(lup)
      return debt.div(encumberedCollateral)
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
