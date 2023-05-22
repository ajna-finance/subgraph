import { BigInt, BigDecimal, Bytes, Address, log } from '@graphprotocol/graph-ts'

import { EXP_18_BD, MAX_BUCKET_INDEX, MIN_BUCKET_INDEX, ONE_BI, ZERO_BD, ZERO_BI } from './constants'
import { prices } from './prices'

/**************************/
/*** To Bytes Functions ***/
/**************************/

// use Address.fromBytes() to convert bytes to an Address

export function addressToBytes(address: Address): Bytes {
    // return address.map<Bytes>((b: Bytes) => b)
    return Bytes.fromHexString(address.toHexString()) as Bytes
}

export function addressArrayToBytesArray(addresses: Address[]): Bytes[] {
    const retval: Bytes[] = [];
    for (let i=0; i<addresses.length; ++i) {
      retval.push(addressToBytes(addresses[i]))
    }
    return retval
}

  export function bigIntToBytes(bi: BigInt): Bytes {
    return Bytes.fromByteArray(Bytes.fromBigInt(bi))
}

/***************************/
/*** To BigInt Functions ***/
/***************************/

export function bytesToBigInt(bytes: Bytes): BigInt {
    return BigInt.fromUnsignedBytes(bytes)
}

// converts a BigDecimal to a BigInt scaled to WAD precision
export function decimalToWad(value: BigDecimal): BigInt {
    return BigInt.fromString(value.times(EXP_18_BD).toString())
}

/****************************/
/*** To Decimal Functions ***/
/****************************/

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
      bd = bd.times(BigDecimal.fromString('10'))
    }
    return bd
}

// convert an 18 decimal int to a decimal
export function wadToDecimal(wad: BigInt): BigDecimal {
    return wad.toBigDecimal().div(EXP_18_BD)
}

/***************************/
/*** To Number Functions ***/
/***************************/

export function bigIntArrayToIntArray(indexes: BigInt[]): i32[] {
    const retval: i32[] = [];
    for (let i=0; i<indexes.length; ++i) {
      retval.push(indexes[i].toU32())
    }
    return retval
}

export function indexToPrice(index: u32): BigDecimal {
    const bucketIndex = MAX_BUCKET_INDEX - index;
    assert(bucketIndex >= MIN_BUCKET_INDEX && bucketIndex <= MAX_BUCKET_INDEX, 'Invalid bucket index')
    return wadToDecimal(BigInt.fromString(prices[index]));
}

// export function priceToIndex(price: BigDecimal): BigInt {
