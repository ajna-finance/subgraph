import { BigInt, Address, BigDecimal, TypedMap } from '@graphprotocol/graph-ts'

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')

// BigInt constants
export const ZERO_BI          = BigInt.zero()
export const ONE_BI           = BigInt.fromI32(1)
export const TEN_BI           = BigInt.fromI32(10)
export const ONE_PERCENT_BI   = BigInt.fromString("10000000000000000") // 0.01 * 1e18
export const THREE_PERCENT_BI = BigInt.fromString("30000000000000000") // 0.03 * 1e18
export const FIVE_PERCENT_BI  = BigInt.fromString("50000000000000000") // 0.05 * 1e18
export const HALF_WAD_BI      = BigInt.fromString("500000000000000000")
export const ONE_WAD_BI       = BigInt.fromString("1000000000000000000")

// BigDecimal constants
export const ZERO_BD = BigDecimal.zero()
export const EXP_18_BD = BigDecimal.fromString('1000000000000000000')
export const ONE_BD = BigDecimal.fromString('1')
export const NEG_ONE_BD = BigDecimal.fromString('-1')

// max price of the pool is 1_004_968_987.606512354182109771 * 1e18
export const MAX_PRICE = BigDecimal.fromString(`${1_004_968_987.606512354182109771}`)
export const MAX_PRICE_INDEX = 0
export const MAX_PRICE_BI = BigInt.fromString('1004968987606512354182109771')
export const MIN_BUCKET_INDEX = -3232;
export const MAX_BUCKET_INDEX = 4156;

// Pool addresses per network
export const poolInfoUtilsAddressTable = new TypedMap<string, Address>()
poolInfoUtilsAddressTable.set('mainnet', Address.fromString('0x154FFf344f426F99E328bacf70f4Eb632210ecdc'))
poolInfoUtilsAddressTable.set('polygon', Address.fromString('0xA9Ada58DD3c820b30D3bf5B490226F2ef92107bA'))
poolInfoUtilsAddressTable.set('goerli', Address.fromString('0xBB61407715cDf92b2784E9d2F1675c4B8505cBd8'))
poolInfoUtilsAddressTable.set('mumbai', Address.fromString('0x39250241CC84Dadb1cDFE3A1a717631e2aA603eB'))
poolInfoUtilsAddressTable.set('ganache', Address.fromString('0x4f05DA51eAAB00e5812c54e370fB95D4C9c51F21'))
export const positionManagerAddressTable = new TypedMap<string, Address>()
positionManagerAddressTable.set('goerli', Address.fromString('0x23E2EFF19bd50BfCF0364B7dCA01004D5cce41f9'))
positionManagerAddressTable.set('ganache', Address.fromString('0x6c5c7fD98415168ada1930d44447790959097482'))

// GrantFund constants
export const CHALLENGE_PERIOD_LENGTH    = BigInt.fromI32(50400)
export const DISTRIBUTION_PERIOD_LENGTH = BigInt.fromI32(648000)
export const FUNDING_PERIOD_LENGTH      = BigInt.fromI32(72000)
export const SCREENING_PERIOD_LENGTH    = BigInt.fromI32(525600)
