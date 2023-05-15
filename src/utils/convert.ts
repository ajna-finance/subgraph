import { BigInt, BigDecimal, Bytes, Address, log } from '@graphprotocol/graph-ts'

import { EXP_18_BD, MAX_BUCKET_INDEX, MIN_BUCKET_INDEX, ONE_BI, ZERO_BD, ZERO_BI } from './constants'
import { prices} from './prices'

/****************************/
/*** To Address Functions ***/
/****************************/

export function bytesToAddress(bytes: Bytes): Address {
    return Address.fromHexString(bytes.toHexString()) as Address
}

/**************************/
/*** To Bytes Functions ***/
/**************************/

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

// converts a BigDecimal WAD to a BigInt
export function bigDecimalWadToBigInt(value: BigDecimal): BigInt {
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

// TODO: move this to a separate math library
// returns 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
    if (amount1.equals(ZERO_BD)) {
        return ZERO_BD
    } else {
        return amount0.div(amount1)
    }
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
    if (bucketIndex < MIN_BUCKET_INDEX || bucketIndex > MAX_BUCKET_INDEX) {
      throw new Error('ERR_BUCKET_INDEX_OUT_OF_BOUNDS');
    }

    return BigDecimal.fromString(prices[index]);
}

// export function priceToIndex(price: BigDecimal): BigInt {
