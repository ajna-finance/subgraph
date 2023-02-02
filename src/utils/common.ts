import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { Bucket, Lend } from "../../generated/schema"
import { PoolInfoUtils } from '../../generated/ERC20Pool/PoolInfoUtils'

import { poolInfoUtilsNetworkLookUpTable } from "./constants"
import { wadToDecimal } from "./convert"

export function lpbValueInQuote(pool: Bytes, bucket: Bucket, lend: Lend): BigDecimal {
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
    const poolInfoUtils = PoolInfoUtils.bind(poolInfoUtilsAddress)

    log.info('lpbValueInQuote: poolAddress: {}, bucketIndex: {}, lend.lpb: {}', [poolAddress.toHexString(), bucket.bucketIndex.toString(), lend.lpb.toString()])
    log.info('lpb decimal: lend.lpb: {}', [BigInt.fromString(lend.lpb.toString()).toString()])

    const quoteTokenAmount = poolInfoUtils.lpsToQuoteTokens(poolAddress, BigInt.fromString(lend.lpb.toString()), bucket.bucketIndex)
    return wadToDecimal(quoteTokenAmount)
}

export function encumberance(debt: BigInt, price: BigInt): BigInt {
    return debt.div(price)
}

export function collateralization(debt: BigDecimal, encumberedCollateral: BigDecimal): BigDecimal {
    return debt.div(encumberedCollateral)
}
