import { BigInt, BigDecimal, Bytes, Address, log } from '@graphprotocol/graph-ts'

import { ONE_BI, ZERO_BD, ZERO_BI } from './constants'

// converts a BigDecimal WAD to a BigInt
export function bigDecimalWadToBigInt(value: BigDecimal): BigInt {
    return BigInt.fromString(value.times(bigDecimalExp18()).toString())
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

export function bigIntArrayToIntArray(indexes: BigInt[]): i32[] {
  const retval: i32[] = [];
  for (let i=0; i<indexes.length; ++i) {
    retval.push(indexes[i].toU32())
  }
  return retval
}

export function addressArrayToBytesArray(addresses: Address[]): Bytes[] {
  const retval: Bytes[] = [];
  for (let i=0; i<addresses.length; ++i) {
    retval.push(addressToBytes(addresses[i]))
  }
  return retval
}

// import prices from '../../prices.json'
// export function indexToPrice(index: BigInt): BigDecimal {
//     const bucketIndex = MAX_BUCKET_INDEX - index;
//     if (bucketIndex < MIN_BUCKET_INDEX || bucketIndex > MAX_BUCKET_INDEX) {
//       throw new Error('ERR_BUCKET_INDEX_OUT_OF_BOUNDS');
//     }
// }

// export function priceToIndex(price: BigDecimal): BigInt {