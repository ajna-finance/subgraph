import { BigInt, BigDecimal, Bytes, Address, log } from '@graphprotocol/graph-ts'

import { ONE_BI, ZERO_BD, ZERO_BI } from './constants'

// converts a BigDecimal RAY to a BigInt
export function bigDecimalRayToBigInt(value: BigDecimal): BigInt {
    return BigInt.fromString(value.times(bigDecimalExp27()).toString())
}

export function bigDecimalExp18(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000')
}

export function bigDecimalExp27(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000000000000')
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
      bd = bd.times(BigDecimal.fromString('10'))
    }
    return bd
}

// returns 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
    if (amount1.equals(ZERO_BD)) {
        return ZERO_BD
    } else {
        return amount0.div(amount1)
    }
}

// converts a ray to a decimal
export function rayToDecimal(ray: BigInt): BigDecimal {
    return ray.toBigDecimal().div(bigDecimalExp27())
}

// convert an 18 decimal int to a decimal
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

// import prices from '../../prices.json'
// export function indexToPrice(index: BigInt): BigDecimal {
//     const bucketIndex = MAX_BUCKET_INDEX - index;
//     if (bucketIndex < MIN_BUCKET_INDEX || bucketIndex > MAX_BUCKET_INDEX) {
//       throw new Error('ERR_BUCKET_INDEX_OUT_OF_BOUNDS');
//     }
// }

// export function priceToIndex(price: BigDecimal): BigInt {