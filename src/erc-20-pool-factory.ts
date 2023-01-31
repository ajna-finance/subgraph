import { Bytes } from "@graphprotocol/graph-ts"

import { PoolCreated as PoolCreatedEvent } from "../generated/ERC20PoolFactory/ERC20PoolFactory"
import { ERC20Pool } from "../generated/ERC20Pool/ERC20Pool"
import { PoolCreated } from "../generated/schema"
import { ERC20PoolFactory, Pool } from "../generated/schema"

import { ERC20_FACTORY_ADDRESS, MAX_PRICE, ONE_BI, ZERO_BI, ZERO_BD, ONE_WAD_BD } from "./utils/constants"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  let newPool = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  newPool.pool_ = event.params.pool_

  newPool.blockNumber = event.block.number
  newPool.blockTimestamp = event.block.timestamp
  newPool.transactionHash = event.transaction.hash

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

  // record pool information
  const pool = new Pool(event.params.pool_) as Pool
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.collateralToken = Bytes.fromHexString(poolContract.collateralAddress().toHexString())
  pool.quoteToken = Bytes.fromHexString(poolContract.quoteTokenAddress().toHexString())
  pool.currentDebt = ZERO_BI
  pool.currentReserves = ZERO_BI
  pool.inflator = ONE_WAD_BD
  pool.inflatorUpdate = event.block.timestamp
  pool.htp = ZERO_BD
  pool.lup = MAX_PRICE
  pool.totalDeposits = ZERO_BI
  pool.targetUtilization = ONE_WAD_BD
  pool.txCount = ZERO_BI

  // add pool reference to factories' list of pools
  factory.pools = factory.pools.concat([pool.id])

  // save entities to the store
  factory.save()
  newPool.save()
  pool.save()
}
