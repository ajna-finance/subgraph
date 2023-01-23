import { BigInt, Address } from '@graphprotocol/graph-ts'

import { wadToDecimal } from './convert'

// address of the factory deployed to Goerli
export const ERC20_FACTORY_ADDRESS = Address.fromString('0xbF332da94B818AC7972484997100c8cBB400b991')

export const ZERO_BI = BigInt.zero()

export const ONE_BI = BigInt.fromI32(1)

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = wadToDecimal(BigInt.fromI64(1_004_968_987606512354182109771), BigInt.fromI32(18))