import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts'

import { ERC20 } from '../../generated/ERC20PoolFactory/ERC20'
import { Pool } from "../../generated/schema"

export function getPoolReserves(pool: Pool): BigInt {
    const contractQuoteToken = ERC20.bind(Address.fromBytes(pool.quoteToken))
    const contractQuoteBalance = contractQuoteToken.balanceOf(Address.fromBytes(pool.id))

    // current reserves contractQuoteBalance + poolDebt - pool.depositSize() - bondsEscrowed - unclaimedReserves
    return contractQuoteBalance
                .plus(pool.currentDebt)
                .minus(pool.totalDeposits)
                // .minus(pool.bondsEscrowed)
                // .minus(pool.unclaimedReserves)
}

export function getPoolAddress(poolId: Bytes): Address {
    return Address.fromBytes(poolId)
}