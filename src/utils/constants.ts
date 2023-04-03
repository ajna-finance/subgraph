import { BigInt, Address, BigDecimal, TypedMap } from '@graphprotocol/graph-ts'

import { bigDecimalExp18, bigDecimalExp27, wadToDecimal } from './convert'

// address of the factory deployed to Goerli
export const ERC20_FACTORY_ADDRESS = Address.fromString('0x9684b8eC942985b23d343cB82D2F30EdA8fD7179')

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')

// BigInt constants
export const ZERO_BI = BigInt.zero()
export const ONE_BI  = BigInt.fromI32(1)
export const ONE_RAY_BI = BigInt.fromString("1000000000000000000000000000")
export const ONE_WAD_BI = BigInt.fromString("1000000000000000000")
export const FIVE_PERCENT_BI = BigInt.fromString("50000000000000000") // 0.05 * 1e18

// BigDecimal constants
export const ZERO_BD = BigDecimal.zero()
export const ONE_BD = BigDecimal.fromString('1')
export const ONE_RAY_BD = bigDecimalExp27()
export const ONE_WAD_BD = bigDecimalExp18()
export const FIVE_PERCENT_BD = BigDecimal.fromString("50000000000000000") // 0.05 * 1e18

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = BigDecimal.fromString(`${1_004_968_987.606512354182109771}`)
export const MAX_PRICE_INDEX = 0
export const MAX_PRICE_BI = BigInt.fromString('1004968987606512354182109771')

// poolInfoUtils contract address per network
export const poolInfoUtilsNetworkLookUpTable = new TypedMap<string, Address>()
poolInfoUtilsNetworkLookUpTable.set('goerli', Address.fromString('0xEa36b2a4703182d07df9DdEe46BF97f9979F0cCf'))
