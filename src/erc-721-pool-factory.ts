import { PoolCreated as PoolCreatedEvent } from "../generated/ERC721PoolFactory/ERC721PoolFactory"
import { ERC721Token, Pool, PoolCreated, Token } from "../generated/schema"
import { ERC721Pool } from "../generated/templates"
import { ERC721Pool as ERC721PoolContract } from "../generated/templates/ERC721Pool/ERC721Pool"

import {
  MAX_PRICE,
  MAX_PRICE_INDEX,
  ONE_BI,
  ZERO_BI,
  ZERO_BD,
  ZERO_ADDRESS,
  ONE_BD
} from "./utils/constants"
import { addressToBytes, wadToDecimal } from "./utils/convert"
import { loadOrCreateFactory } from "./utils/pool/pool-factory"
import { getRatesAndFees } from "./utils/pool/pool"
import { getTokenName as getTokenNameERC721, getTokenSymbol as getTokenSymbolERC721} from "./utils/token-erc721"
import { getTokenDecimals, getTokenName, getTokenSymbol, getTokenTotalSupply } from "./utils/token-erc20"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool = event.params.pool_
  poolCreated.poolType = "ERC721"
  poolCreated.factory = event.address;

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // record factory information
  let factory = loadOrCreateFactory(event.address, "ERC721")
  factory.poolCount = factory.poolCount.plus(ONE_BI)
  factory.txCount   = factory.txCount.plus(ONE_BI)

  // instantiate pool contract
  const poolContract = ERC721PoolContract.bind(event.params.pool_)

  // get pool initial interest rate
  const interestRateResults = poolContract.interestRateInfo()
  const ratesAndFees        = getRatesAndFees(event.params.pool_)

  // create Token entites associated with the pool
  const collateralTokenAddress      = poolContract.collateralAddress()
  const collateralTokenAddressBytes = addressToBytes(collateralTokenAddress)
  const quoteTokenAddress      = poolContract.quoteTokenAddress()
  const quoteTokenAddressBytes = addressToBytes(quoteTokenAddress)

  // TODO: record subset hash and tokenIds allowed information
  // THIS DOESN't CURRENTLY SEEM TO BE POSSIBLE WITH THE EXISTING SET OF CONTRACTS

  // record token information
  let collateralToken = ERC721Token.load(collateralTokenAddressBytes)
  if (collateralToken == null) {
    // create new token if it doesn't exist already
    collateralToken = new ERC721Token(collateralTokenAddressBytes) as ERC721Token
    collateralToken.name = getTokenNameERC721(collateralTokenAddress)
    collateralToken.symbol = getTokenSymbolERC721(collateralTokenAddress)
    collateralToken.txCount = ZERO_BI
    collateralToken.poolCount = ONE_BI
  }
  else {
    collateralToken.poolCount = collateralToken.poolCount.plus(ONE_BI)
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
    quoteToken.tokenType = "ERC20"
    quoteToken.poolCount = ONE_BI
  }
  else {
    quoteToken.poolCount = quoteToken.poolCount.plus(ONE_BI)
  }

  // create pool entity
  const pool = new Pool(event.params.pool_) as Pool // create pool entity
  ERC721Pool.create(event.params.pool_) // create pool template

  // record pool information
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.collateralToken = collateralToken.id
  pool.quoteToken = quoteToken.id
  pool.t0debt = ZERO_BD
  pool.inflator = ONE_BD
  pool.borrowRate = wadToDecimal(interestRateResults.value0)
  pool.lendRate = ZERO_BD
  pool.borrowFeeRate = wadToDecimal(ratesAndFees.borrowFeeRate)
  pool.depositFeeRate = wadToDecimal(ratesAndFees.depositFeeRate)
  pool.pledgedCollateral = ZERO_BD
  pool.totalInterestEarned = ZERO_BD // updated on ReserveAuction
  pool.txCount = ZERO_BI
  // TODO: add support subset pools
  pool.poolType = "Collection"
  pool.tokenIdsPledged = []

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
  pool.burnEpoch = ZERO_BI
  pool.totalAjnaBurned = ZERO_BD
  pool.reserveAuctions = []

  // utilization information
  pool.minDebtAmount = ZERO_BD
  pool.actualUtilization = ZERO_BD
  pool.targetUtilization = ONE_BD

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
