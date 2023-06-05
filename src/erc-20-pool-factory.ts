import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts"
import { PoolCreated as PoolCreatedEvent } from "../generated/ERC20PoolFactory/ERC20PoolFactory"
import { PoolCreated, Token } from "../generated/schema"
import { ERC20PoolFactory, Pool } from "../generated/schema"
import { ERC20Pool } from "../generated/templates"
import { ERC20Pool as ERC20PoolContract } from "../generated/templates/ERC20Pool/ERC20Pool"

import {
  MAX_PRICE,
  MAX_PRICE_INDEX,
  ONE_BI,
  ZERO_BI,
  ZERO_BD,
  ONE_WAD_BD,
  ZERO_ADDRESS,
  ONE_BD,
  erc20FactoryAddressTable
} from "./utils/constants"
import { addressToBytes, wadToDecimal } from "./utils/convert"
import { getTokenDecimals, getTokenName, getTokenSymbol, getTokenTotalSupply } from "./utils/token-erc20"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool = event.params.pool_

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // record factory information
  const erc20factoryAddress = erc20FactoryAddressTable.get(dataSource.network())!
  let factory = ERC20PoolFactory.load(erc20factoryAddress)
  if (factory == null) {
    // create new factory
    factory = new ERC20PoolFactory(erc20factoryAddress) as ERC20PoolFactory
    factory.poolCount = ZERO_BI
    factory.pools     = []
    factory.txCount   = ZERO_BI
  }

  // increment pool count
  factory.poolCount = factory.poolCount.plus(ONE_BI)
  factory.txCount   = factory.txCount.plus(ONE_BI)

  // instantiate pool contract
  const poolContract = ERC20PoolContract.bind(event.params.pool_)

  // get pool initial interest rate
  const interestRateResults = poolContract.interestRateInfo()
  // upon pool creation, MAU=0, so NIM=0.15, and LIM=0.85
  const lenderInterestMargin = BigInt.fromString("850000000000000000")

  // create Token entites associated with the pool
  const collateralTokenAddress      = poolContract.collateralAddress()
  const collateralTokenAddressBytes = addressToBytes(collateralTokenAddress)
  const quoteTokenAddress      = poolContract.quoteTokenAddress()
  const quoteTokenAddressBytes = addressToBytes(quoteTokenAddress)

  // record token information
  let collateralToken = Token.load(collateralTokenAddressBytes)
  if (collateralToken == null) {
    // create new token if it doesn't exist already
    collateralToken = new Token(collateralTokenAddressBytes) as Token
    collateralToken.name = getTokenName(collateralTokenAddress)
    collateralToken.symbol = getTokenSymbol(collateralTokenAddress)
    collateralToken.decimals = getTokenDecimals(collateralTokenAddress)
    collateralToken.totalSupply = getTokenTotalSupply(collateralTokenAddress)
    collateralToken.txCount = ZERO_BI
    collateralToken.isERC721 = false
    collateralToken.poolCount = ONE_BI
  }
  let quoteToken = Token.load(quoteTokenAddressBytes)
  if (quoteToken == null) {
    // create new token if it doesn't exist already
    quoteToken = new Token(quoteTokenAddressBytes) as Token
    quoteToken.name = getTokenName(quoteTokenAddress)
    quoteToken.symbol = getTokenSymbol(quoteTokenAddress)
    quoteToken.decimals = getTokenDecimals(quoteTokenAddress)
    quoteToken.totalSupply = getTokenTotalSupply(quoteTokenAddress)
    quoteToken.txCount = ZERO_BI
    quoteToken.isERC721 = false
    quoteToken.poolCount = ONE_BI
  }

  // create entities
  const pool = new Pool(event.params.pool_) as Pool // create pool entity
  ERC20Pool.create(event.params.pool_) // create data source template

  // record pool information
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.collateralToken = collateralToken.id
  pool.quoteToken = quoteToken.id
  pool.debt = ZERO_BD
  pool.t0debt = ZERO_BD
  pool.feeRate = wadToDecimal(interestRateResults.value1)
  pool.inflator = ONE_BD
  pool.borrowRate = wadToDecimal(interestRateResults.value0)
  pool.lendRate = wadToDecimal(interestRateResults.value0.times(lenderInterestMargin))
  pool.pledgedCollateral = ZERO_BD
  pool.totalInterestEarned = ZERO_BD // updated on ReserveAuction
  pool.txCount = ZERO_BI

  // pool loans information
  pool.poolSize = ZERO_BD
  pool.loansCount = ZERO_BI
  pool.maxBorrower = ZERO_ADDRESS
  pool.quoteTokenFlashloaned = ZERO_BD
  pool.collateralFlashloaned = ZERO_BD

  // pool prices information
  pool.hpb = ZERO_BD
  pool.hpbIndex = 0
  pool.htp = ZERO_BD
  pool.htpIndex = 0
  pool.lup = MAX_PRICE
  pool.lupIndex = MAX_PRICE_INDEX
  pool.momp = ZERO_BD

  // reserve auction information
  pool.reserves = ZERO_BD
  pool.claimableReserves = ZERO_BD
  pool.claimableReservesRemaining = ZERO_BD
  pool.reserveAuctionPrice = ZERO_BD
  pool.reserveAuctionTimeRemaining = ZERO_BI
  pool.burnEpoch = ZERO_BI
  pool.totalAjnaBurned = ZERO_BD
  pool.reserveAuctions = []

  // utilization information
  pool.minDebtAmount = ZERO_BD
  pool.collateralization = ONE_WAD_BD
  pool.actualUtilization = ZERO_BD
  pool.targetUtilization = ONE_WAD_BD

  // liquidation information
  pool.totalBondEscrowed = ZERO_BD
  pool.liquidationAuctions = []

  // TVL information
  pool.quoteTokenBalance = ZERO_BD
  pool.collateralBalance = ZERO_BD

  // add pool reference to factories' list of pools
  factory.pools = factory.pools.concat([pool.id])

  // save entities to the store
  collateralToken.save()
  quoteToken.save()
  factory.save()
  pool.save()
  poolCreated.save()
}
