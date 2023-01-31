import { BigInt, BigDecimal, Bytes, Address, log } from '@graphprotocol/graph-ts'

import { ONE_BI, ZERO_BD, ZERO_BI } from './constants'

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
      bd = bd.times(BigDecimal.fromString('10'))
    }
    return bd
}

export function bigDecimalExp18(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000')
}

export function bigDecimalExp27(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000000000000')
}

// return 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
    if (amount1.equals(ZERO_BD)) {
        return ZERO_BD
    } else {
        return amount0.div(amount1)
    }
}

export function rayToDecimal(ray: BigInt): BigDecimal {
    return safeDiv(ray.toBigDecimal(), bigDecimalExp27())
}

// TODO: use raw .div instead of safeDiv
export function wadToDecimal(wad: BigInt): BigDecimal {
    return safeDiv(wad.toBigDecimal(), bigDecimalExp18())
}
  
export function addressToBytes(address: Address): Bytes {
    // return address.map<Bytes>((b: Bytes) => b)
    return Bytes.fromHexString(address.toHexString()) as Bytes
}