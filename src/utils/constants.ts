import { BigInt, Address, BigDecimal } from '@graphprotocol/graph-ts'

import { bigDecimalExp18, wadToDecimal } from './convert'

// address of the factory deployed to Goerli
export const ERC20_FACTORY_ADDRESS = Address.fromString('0xbF332da94B818AC7972484997100c8cBB400b991')

export const ZERO_BD = BigDecimal.zero()
export const ZERO_BI = BigInt.zero()
export const ONE_BI  = BigInt.fromI32(1)

export const ONE_BD = BigDecimal.fromString('1')

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = BigDecimal.fromString(`${1_004_968_987.606512354182109771}`)