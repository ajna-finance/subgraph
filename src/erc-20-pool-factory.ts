import { Bytes } from "@graphprotocol/graph-ts"

import { PoolCreated as PoolCreatedEvent } from "../generated/ERC20PoolFactory/ERC20PoolFactory"
import { ERC20Pool } from "../generated/ERC20Pool/ERC20Pool"
import { PoolCreated } from "../generated/schema"
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
  ONE_WAD_BI,
  ONE_BD
} from "./utils/constants"

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

  // TODO: look into: https://thegraph.com/docs/en/developing/creating-a-subgraph/#data-source-templates-for-dynamically-created-contracts
  // record pool information
  const pool = new Pool(event.params.pool_) as Pool
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.collateralToken = Bytes.fromHexString(poolContract.collateralAddress().toHexString())
  pool.quoteToken = Bytes.fromHexString(poolContract.quoteTokenAddress().toHexString())
  pool.currentDebt = ZERO_BD
  pool.feeRate = ZERO_BD
  pool.inflator = ONE_BD //ONE_WAD_BD
  pool.inflatorUpdate = event.block.timestamp
  pool.pledgedCollateral = ZERO_BD
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

  // utilization information
  pool.minDebtAmount = ZERO_BD
  pool.collateralization = ONE_WAD_BD
  pool.actualUtilization = ZERO_BD
  pool.targetUtilization = ONE_WAD_BD

  // add pool reference to factories' list of pools
  factory.pools = factory.pools.concat([pool.id])

  // save entities to the store
  factory.save()
  newPool.save()
  pool.save()
}
