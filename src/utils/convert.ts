import { BigInt, BigDecimal, ethereum } from '@graphprotocol/graph-ts'

import { ONE_BI, ZERO_BI } from './constants'

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
      bd = bd.times(BigDecimal.fromString('10'))
    }
    return bd
  }

// TODO: may want to hardcode this to 18
export function wadToDecimal(wad: BigInt, exchangeDecimals: BigInt): BigDecimal {
    if (exchangeDecimals == ZERO_BI) {
      return wad.toBigDecimal()
    }
    return wad.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
  }
  