import { PoolCreated as PoolCreatedEvent } from "../../generated/ERC20PoolFactory/ERC20PoolFactory"
import { PoolCreated, Token } from "../../generated/schema"
import { ERC20Pool } from "../../generated/templates"
import { ERC20Pool as ERC20PoolContract } from "../../generated/templates/ERC20Pool/ERC20Pool"

import { ONE_BI, ZERO_BI } from "../utils/constants"
import { addressToBytes, wadToDecimal } from "../utils/convert"
import { getTokenDecimals, getTokenName, getTokenSymbol, getTokenTotalSupply } from "../utils/token-erc20"
import { getRatesAndFees, loadOrCreatePool } from "../utils/pool/pool"
import { loadOrCreateFactory } from "../utils/pool/pool-factory"
import { Bytes } from "@graphprotocol/graph-ts"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool = event.params.pool_
  poolCreated.poolType = "ERC20"
  poolCreated.factory = event.address;

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // record factory information
  let factory = loadOrCreateFactory(event.address, "ERC20")
  factory.poolCount = factory.poolCount.plus(ONE_BI)
  factory.txCount   = factory.txCount.plus(ONE_BI)

  // instantiate pool contract
  const poolContract = ERC20PoolContract.bind(event.params.pool_)

  // get pool initial interest rate
  const interestRateResults = poolContract.interestRateInfo()
  const ratesAndFees        = getRatesAndFees(event.params.pool_)

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
    collateralToken.tokenType = "ERC20"
    collateralToken.poolCount = ONE_BI
  } else {
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
  } else {
    quoteToken.poolCount = quoteToken.poolCount.plus(ONE_BI)
  }

  // create entities
  const pool = loadOrCreatePool(event.params.pool_)
  ERC20Pool.create(event.params.pool_) // create data source template

  // record pool metadata
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.txCount = ZERO_BI

  // record pool token information
  pool.collateralToken = collateralToken.id
  pool.quoteToken = quoteToken.id

  // record pool rate information
  pool.borrowRate = wadToDecimal(interestRateResults.value0)
  pool.borrowFeeRate = wadToDecimal(ratesAndFees.borrowFeeRate)
  pool.depositFeeRate = wadToDecimal(ratesAndFees.depositFeeRate)

  // record pool type information
  pool.poolType = "Fungible"
  pool.subsetHash = Bytes.fromHexString("0x2263c4378b4920f0bef611a3ff22c506afa4745b3319c50b6d704a874990b8b2")

  // add pool reference to factories' list of pools
  factory.pools = factory.pools.concat([pool.id])

  // save entities to the store
  collateralToken.save()
  quoteToken.save()
  factory.save()
  pool.save()
  poolCreated.save()
}
