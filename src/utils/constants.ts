import { BigInt, Address, BigDecimal, TypedMap } from '@graphprotocol/graph-ts'

import { bigDecimalExp18, bigDecimalExp27, wadToDecimal } from './convert'

// address of the factory deployed to Goerli
export const ERC20_FACTORY_ADDRESS = Address.fromString('0xbF332da94B818AC7972484997100c8cBB400b991')

// BigInt constants
export const ZERO_BI = BigInt.zero()
export const ONE_BI  = BigInt.fromI32(1)
export const ONE_RAY_BI = BigInt.fromString("1000000000000000000000000000")

// BigDecimal constants
export const ZERO_BD = BigDecimal.zero()
export const ONE_BD = BigDecimal.fromString('1')
export const ONE_WAD_BD = bigDecimalExp18()
export const ONE_RAY_BD = bigDecimalExp27()

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = BigDecimal.fromString(`${1_004_968_987.606512354182109771}`)
export const MAX_PRICE_INDEX = BigInt.fromI32(4156)

export const poolInfoUtilsNetworkLookUpTable = new TypedMap<string, Address>()
poolInfoUtilsNetworkLookUpTable.set('goerli', Address.fromString('0x32DA971821E6d88FCcD9861EbaCF8590553A2aA8'))