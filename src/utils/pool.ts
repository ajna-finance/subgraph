import { BigInt, Address } from '@graphprotocol/graph-ts'

import { ERC20Pool } from "../../generated/ERC20Pool/ERC20Pool"
import { Pool } from "../../generated/schema"

// export function getPoolReserves(pool: Pool): BigInt {
//     const poolContract = ERC20Pool.bind(Address.fromBytes(pool.id))

//     return pool.collateralReserve.plus(pool.quoteReserve)
// }