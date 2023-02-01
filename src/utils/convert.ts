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

// returns 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
    if (amount1.equals(ZERO_BD)) {
        return ZERO_BD
    } else {
        return amount0.div(amount1)
    }
}

export function rayToDecimal(ray: BigInt): BigDecimal {
    return ray.toBigDecimal().div(bigDecimalExp27())
}

export function wadToDecimal(wad: BigInt): BigDecimal {
    return wad.toBigDecimal().div(bigDecimalExp18())
}

export function wadToRay(wad: BigDecimal): BigDecimal {
    return wad.times(bigDecimalExp18())
}
  
export function addressToBytes(address: Address): Bytes {
    // return address.map<Bytes>((b: Bytes) => b)
    return Bytes.fromHexString(address.toHexString()) as Bytes
}
