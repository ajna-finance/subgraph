import { BigInt, Address, BigDecimal, TypedMap } from '@graphprotocol/graph-ts'

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')

// BigInt constants
export const ZERO_BI          = BigInt.zero()
export const ONE_BI           = BigInt.fromI32(1)
export const TWO_BI           = BigInt.fromI32(2)
export const TEN_BI           = BigInt.fromI32(10)
export const ONE_PERCENT_BI   = BigInt.fromString("10000000000000000") // 0.01 * 1e18
export const THREE_PERCENT_BI = BigInt.fromString("30000000000000000") // 0.03 * 1e18
export const FIVE_PERCENT_BI  = BigInt.fromString("50000000000000000") // 0.05 * 1e18
export const HALF_WAD_BI      = BigInt.fromString("500000000000000000")
export const ONE_WAD_BI       = BigInt.fromString("1000000000000000000")
export const NEG_ONE_BI       = BigInt.fromString('-1')

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
poolInfoUtilsAddressTable.set('mainnet', Address.fromString('0x30c5eF2997d6a882DE52c4ec01B6D0a5e5B4fAAE'))
poolInfoUtilsAddressTable.set('arbitrum-one', Address.fromString('0x08432Bb9A4D302450fFAaFD647A0A121D3a143cC'))
poolInfoUtilsAddressTable.set('base', Address.fromString('0x1358e3be37C191Eb5B842F673fcB5C79Cc4F6644'))
poolInfoUtilsAddressTable.set('matic', Address.fromString('0x68C75c041BC36AFdce7cae2578BEe31a24888885'))
poolInfoUtilsAddressTable.set('optimism', Address.fromString('0x6293C850837d617DE66ddf7d8744E2BDbD913A90'))
poolInfoUtilsAddressTable.set('goerli', Address.fromString('0xdE8D83e069F552fbf3EE5bF04E8C4fa53a097ee5'))
poolInfoUtilsAddressTable.set('ganache', Address.fromString('0x6c5c7fD98415168ada1930d44447790959097482'))
export const poolInfoUtilsMulticallAddressTable = new TypedMap<string, Address>()
poolInfoUtilsMulticallAddressTable.set('mainnet', Address.fromString('0xe4e553243264f2bF7C135F1eC3a8c09078731227'))
poolInfoUtilsMulticallAddressTable.set('arbitrum-one', Address.fromString('0x54835857382f9617D8f031d5fF535BED0904ECFB'))
poolInfoUtilsMulticallAddressTable.set('base', Address.fromString('0x372F9c6A49a4E68e47459Eed6e6452c0823956b6'))
poolInfoUtilsMulticallAddressTable.set('matic', Address.fromString('0xf4E41CC3dd4627B7CD5d43ceEe09eD24d5FB9Ec4'))
poolInfoUtilsMulticallAddressTable.set('optimism', Address.fromString('0x52DA47c2d656dBB656FEd421010FfFA6f7354B71'))
poolInfoUtilsMulticallAddressTable.set('goerli', Address.fromString('0x63feF8659ECdC4F909ddFB55a8B701957115B906'))
poolInfoUtilsMulticallAddressTable.set('ganache', Address.fromString('0x6548dF23A854f72335902e58a1e59B50bb3f11F1'))
export const positionManagerAddressTable = new TypedMap<string, Address>()
positionManagerAddressTable.set('mainnet', Address.fromString('0x87B0F458d8F1ACD28A83A748bFFbE24bD6B701B1'))
positionManagerAddressTable.set('arbitrum-one', Address.fromString('0xfD83174bebA9eB582EB67e11df7a234B25612dDa'))
positionManagerAddressTable.set('base', Address.fromString('0xA650Fad48AA4F9cF3a5858460563B2227d6BD4E7'))
positionManagerAddressTable.set('matic', Address.fromString('0x4f5c573115c8F66F046Ab3328e44Ebc4335A584e'))
positionManagerAddressTable.set('optimism', Address.fromString('0x80A21A780f1300aa37Df1CCA0F96981FBc2785BD'))
positionManagerAddressTable.set('goerli', Address.fromString('0x7b6C6917ACA28BA790837d41e5aA4A49c9Ad4570'))
positionManagerAddressTable.set('ganache', Address.fromString('0xdF7403003a16c49ebA5883bB5890d474794cea5a'))

// GrantFund constants
export const CHALLENGE_PERIOD_LENGTH    = BigInt.fromI32(50400)
export const DISTRIBUTION_PERIOD_LENGTH = BigInt.fromI32(648000)
export const FUNDING_PERIOD_LENGTH      = BigInt.fromI32(72000)
export const SCREENING_PERIOD_LENGTH    = BigInt.fromI32(525600)
