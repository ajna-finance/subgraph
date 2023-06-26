import { BigInt, Address, BigDecimal, TypedMap } from '@graphprotocol/graph-ts'

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')

// BigInt constants
export const ZERO_BI         = BigInt.zero()
export const ONE_BI          = BigInt.fromI32(1)
export const TEN_BI          = BigInt.fromI32(10)
export const ONE_PERCENT_BI  = BigInt.fromString("10000000000000000") // 0.01 * 1e18
export const FIVE_PERCENT_BI = BigInt.fromString("50000000000000000") // 0.05 * 1e18
export const HALF_WAD_BI     = BigInt.fromString("500000000000000000")
export const ONE_WAD_BI      = BigInt.fromString("1000000000000000000")

// BigDecimal constants
export const ZERO_BD = BigDecimal.zero()
export const EXP_18_BD = BigDecimal.fromString('1000000000000000000')
export const ONE_BD = BigDecimal.fromString('1')

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = BigDecimal.fromString(`${1_004_968_987.606512354182109771}`)
export const MAX_PRICE_INDEX = 0
export const MAX_PRICE_BI = BigInt.fromString('1004968987606512354182109771')
export const MIN_BUCKET_INDEX = -3232;
export const MAX_BUCKET_INDEX = 4156;

// Pool addresses per network
export const erc20FactoryAddressTable = new TypedMap<string, Address>()
erc20FactoryAddressTable.set('goerli', Address.fromString('0xb54FE3ee12926e63FF4A5163766fb93eDbADd5f3'))
erc20FactoryAddressTable.set('ganache', Address.fromString('0xD86c4A8b172170Da0d5C0C1F12455bA80Eaa42AD'))
export const poolInfoUtilsAddressTable = new TypedMap<string, Address>()
poolInfoUtilsAddressTable.set('goerli', Address.fromString('0x28ef92e694d1044917981837b21e5eA994931c71'))
poolInfoUtilsAddressTable.set('ganache', Address.fromString('0x4f05DA51eAAB00e5812c54e370fB95D4C9c51F21'))
export const positionManagerAddressTable = new TypedMap<string, Address>()
positionManagerAddressTable.set('goerli', Address.fromString('0x31E3B448cAFF35e9eEb232053f4d5e76776a1C83'))
positionManagerAddressTable.set('ganache', Address.fromString('0x6c5c7fD98415168ada1930d44447790959097482'))
export const grantFundAddressTable = new TypedMap<string, Address>()
grantFundAddressTable.set('goerli', Address.fromString('0xd364766E1D431e0bb99705c8eb0e6665C3b32eB5'))
grantFundAddressTable.set('ganache', Address.fromString('0xE340B87CEd1af1AbE1CE8D617c84B7f168e3b18b'))

// GrantFund constants
export const CHALLENGE_PERIOD_LENGTH    = BigInt.fromI32(50400)
export const DISTRIBUTION_PERIOD_LENGTH = BigInt.fromI32(648000)
export const FUNDING_PERIOD_LENGTH      = BigInt.fromI32(72000)
export const MAX_EFM_PROPOSAL_LENGTH    = BigInt.fromI32(216000)
