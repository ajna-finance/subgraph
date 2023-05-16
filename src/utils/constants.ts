import { BigInt, Address, BigDecimal, TypedMap } from '@graphprotocol/graph-ts'

// address of the factory deployed to Goerli
export const ERC20_FACTORY_ADDRESS = Address.fromString('0x68ced2E7d257da67794B00556B31203A344d3c1e')

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')

// BigInt constants
export const ZERO_BI = BigInt.zero()
export const ONE_BI  = BigInt.fromI32(1)
export const ONE_RAY_BI = BigInt.fromString("1000000000000000000000000000")
export const ONE_WAD_BI = BigInt.fromString("1000000000000000000")
export const FIVE_PERCENT_BI = BigInt.fromString("50000000000000000") // 0.05 * 1e18
export const TEN_BI = BigInt.fromI32(10)

// BigDecimal constants
export const EXP_18_BD = BigDecimal.fromString('1000000000000000000')
export const ONE_BD = BigDecimal.fromString('1')
export const ONE_WAD_BD = EXP_18_BD
export const FIVE_PERCENT_BD = BigDecimal.fromString("50000000000000000") // 0.05 * 1e18
export const ZERO_BD = BigDecimal.zero()

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = BigDecimal.fromString(`${1_004_968_987.606512354182109771}`)
export const MAX_PRICE_INDEX = 0
export const MAX_PRICE_BI = BigInt.fromString('1004968987606512354182109771')
export const MIN_BUCKET_INDEX = -3232;
export const MAX_BUCKET_INDEX = 4156;

// poolInfoUtils contract address per network
export const poolInfoUtilsNetworkLookUpTable = new TypedMap<string, Address>()
poolInfoUtilsNetworkLookUpTable.set('goerli', Address.fromString('0x1F9F7732ff409FC0AbcAAea94634A7b41F445299'))

export const positionManagerNetworkLookUpTable = new TypedMap<string, Address>()
positionManagerNetworkLookUpTable.set('goerli', Address.fromString('0x83AB3762A4AeC9FBD4e7c01581C9495f2160630b'))

export const grantFundNetworkLookUpTable = new TypedMap<string, Address>()
grantFundNetworkLookUpTable.set('goerli', Address.fromString('0x54110a15011bcb145a8CD4f5adf108B2B6939A1e'))

// GrantFund constants
export const CHALLENGE_PERIOD_LENGTH    = BigInt.fromI32(50400)
export const DISTRIBUTION_PERIOD_LENGTH = BigInt.fromI32(648000)
export const FUNDING_PERIOD_LENGTH      = BigInt.fromI32(72000)
export const MAX_EFM_PROPOSAL_LENGTH    = BigInt.fromI32(216000)
