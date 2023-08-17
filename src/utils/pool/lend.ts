import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { Lend } from "../../../generated/schema"
import { PoolInfoUtils } from "../../../generated/templates/ERC20Pool/PoolInfoUtils"

import { poolInfoUtilsAddressTable, ZERO_BD, ZERO_BI } from "../constants"
import { decimalToWad, wadToDecimal } from "../convert"

// return the max of the two deposit times
export function getDepositTime(depositTime: BigInt, toLend: Lend): BigInt {
    return depositTime > toLend.depositTime ? depositTime : toLend.depositTime
}

export function getLendId(bucketId: Bytes, accountId: Bytes): Bytes {
    return bucketId.concat(Bytes.fromUTF8('|').concat(accountId))
}

export function loadOrCreateLend(bucketId: Bytes, lendId: Bytes, poolId: Bytes, lender: Bytes): Lend {
    let lend = Lend.load(lendId)
    if (lend == null) {
        // create new lend if one already been stored
        lend = new Lend(lendId) as Lend

        lend.bucket          = bucketId
        lend.depositTime     = ZERO_BI
        lend.lender          = lender
        lend.pool            = poolId
        lend.poolAddress     = poolId.toHexString()
        lend.lpb             = ZERO_BD
        lend.lpbValueInQuote = ZERO_BD
    }
    return lend
}

export function lpbValueInQuote(pool: Bytes, bucketIndex: u32, lpAmount: BigDecimal): BigDecimal {
    const poolAddress = Address.fromBytes(pool)
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)

    const quoteTokenAmount = poolInfoUtilsContract.lpToQuoteTokens(
      poolAddress,
      decimalToWad(lpAmount),
      BigInt.fromU32(bucketIndex)
    )

    return wadToDecimal(quoteTokenAmount)
}
