import { PoolCreated as PoolCreatedEvent } from "../generated/ERC20PoolFactory/ERC20PoolFactory"
import { ERC20Pool } from "../generated/ERC20Pool/ERC20Pool"
import { PoolCreated, Token } from "../generated/schema"
import { ERC20PoolFactory, Pool } from "../generated/schema"

import {
  ERC20_FACTORY_ADDRESS,
  MAX_PRICE,
  MAX_PRICE_INDEX,
  ONE_BI,
  ZERO_BI,
  ZERO_BD,
  ONE_WAD_BD,
  ZERO_ADDRESS,
  ONE_BD
} from "./utils/constants"
import { addressToBytes, wadToDecimal } from "./utils/convert"
import { getTokenDecimals, getTokenName, getTokenSymbol, getTokenTotalSupply } from "./utils/token"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool_ = event.params.pool_

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // record factory information
  let factory = ERC20PoolFactory.load(ERC20_FACTORY_ADDRESS)
  if (factory == null) {
    // create new factory
    factory = new ERC20PoolFactory(ERC20_FACTORY_ADDRESS) as ERC20PoolFactory
    factory.poolCount = ZERO_BI
    factory.pools     = []
    factory.txCount   = ZERO_BI
  }

  // increment pool count
  factory.poolCount = factory.poolCount.plus(ONE_BI)
  factory.txCount   = factory.txCount.plus(ONE_BI)

  // instantiate pool contract
  const poolContract = ERC20Pool.bind(event.params.pool_)

  // get pool initial interest rate
  const interestRateResults = poolContract.interestRateInfo()

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

  // TODO: look into: https://thegraph.com/docs/en/developing/creating-a-subgraph/#data-source-templates-for-dynamically-created-contracts
  // record pool information
  const pool = new Pool(event.params.pool_) as Pool
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.collateralToken = collateralToken.id
  pool.quoteToken = quoteToken.id
  pool.currentDebt = ZERO_BD
  pool.feeRate = wadToDecimal(interestRateResults.value1)
  pool.inflator = ONE_BD //ONE_WAD_BD
  pool.inflatorUpdate = event.block.timestamp
  pool.interestRate = wadToDecimal(interestRateResults.value0)
  pool.pledgedCollateral = ZERO_BD
  pool.totalInterestEarned = ZERO_BD // updated on ReserveAuction
  pool.txCount = ZERO_BI

  // pool loans information
  pool.poolSize = ZERO_BD
  pool.loansCount = ZERO_BI
  pool.maxBorrower = ZERO_ADDRESS
  pool.pendingInflator = ONE_WAD_BD
  pool.pendingInterestFactor = ZERO_BD

  // pool prices information
  pool.hpb = ZERO_BD
  pool.hpbIndex = ZERO_BI
  pool.htp = ZERO_BD
  pool.htpIndex = ZERO_BI
  pool.lup = MAX_PRICE
  pool.lupIndex = MAX_PRICE_INDEX

  // reserve auction information
  pool.reserves = ZERO_BD
  pool.claimableReserves = ZERO_BD
  pool.claimableReservesRemaining = ZERO_BD
  pool.reserveAuctionPrice = ZERO_BD
  pool.reserveAuctionTimeRemaining = ZERO_BI
  pool.burnEpoch = ZERO_BI
  pool.totalAjnaBurned = ZERO_BD

  // utilization information
  pool.minDebtAmount = ZERO_BD
  pool.collateralization = ONE_WAD_BD
  pool.actualUtilization = ZERO_BD
  pool.targetUtilization = ONE_WAD_BD

  // liquidation information
  pool.totalBondEscrowed = ZERO_BD
  pool.liquidationAuctions = []
  pool.liquidationAuctionsHead = addressToBytes(ZERO_ADDRESS)

  // add pool reference to factories' list of pools
  factory.pools = factory.pools.concat([pool.id])

  // save entities to the store
  collateralToken.save()
  quoteToken.save()
  factory.save()
  pool.save()
  poolCreated.save()
}
