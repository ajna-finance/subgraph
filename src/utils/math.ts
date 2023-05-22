import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

import { HALF_WAD_BI, ONE_WAD_BI, ZERO_BD, ZERO_BI } from './constants'

// returns 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(ZERO_BD)) {
      return ZERO_BD
  } else {
      return amount0.div(amount1)
  }
}

// multiply two WADs and return a BigInt in WAD precision
export function wmul(lhs: BigInt, rhs: BigInt): BigInt {
  return lhs.times(rhs).plus(HALF_WAD_BI).div(ONE_WAD_BI)
}

// divide two WADs and return a BigInt in WAD precision, return 0 if denominator is zero
export function wdiv(lhs: BigInt, rhs: BigInt): BigInt {
  if (rhs.equals(ZERO_BI)) return ZERO_BI
  return lhs.times(ONE_WAD_BI).plus(rhs.div(BigInt.fromU32(2))).div(rhs)
}