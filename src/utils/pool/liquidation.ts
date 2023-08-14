import { Address, BigDecimal, BigInt, Bytes, Value, dataSource } from "@graphprotocol/graph-ts"

import { LiquidationAuction, Kick, Loan, Pool, BucketTake } from "../../../generated/schema"
import { ERC20Pool } from '../../../generated/templates/ERC20Pool/ERC20Pool'
import { ERC721Pool } from "../../../generated/templates/ERC721Pool/ERC721Pool"
import { PoolInfoUtils } from "../../../generated/templates/ERC20Pool/PoolInfoUtils"

import { wadToDecimal } from "../convert"
import { ONE_BI, ZERO_ADDRESS, ZERO_BD, ZERO_BI, poolInfoUtilsAddressTable } from "../constants"

export function getLiquidationAuctionId(poolId: Bytes, loanId: Bytes, kickBlock: BigInt): Bytes {
    return poolId.concat(Bytes.fromUTF8('|' + loanId.toString() + '|' + kickBlock.toString()))
}

export function loadOrCreateLiquidationAuction(poolId: Bytes, liquidationAuctionId: Bytes, kick: Kick, loan: Loan): LiquidationAuction {
    let liquidationAuction = LiquidationAuction.load(liquidationAuctionId)
    if (liquidationAuction == null) {
        // create new liquidationAuction if liquidationAuction hasn't already been loaded
        liquidationAuction = new LiquidationAuction(liquidationAuctionId) as LiquidationAuction

        // write constant pointers
        liquidationAuction.pool     = poolId
        liquidationAuction.borrower = loan.borrower
        liquidationAuction.loan     = loan.id
        liquidationAuction.kicker   = kick.kicker
        liquidationAuction.kick     = kick.id

        // write accumulators
        liquidationAuction.lastTakePrice       = ZERO_BD // FIXME: not exposed by contracts
        liquidationAuction.collateral          = kick.collateral
        liquidationAuction.collateralRemaining = kick.collateral
        liquidationAuction.debt                = kick.debt
        liquidationAuction.debtRemaining       = kick.debt
        liquidationAuction.settled             = false

        // collections
        liquidationAuction.takes = []
        liquidationAuction.bucketTakes = []
        liquidationAuction.settles = []
    }
    return liquidationAuction
}

export function loadOrCreateBucketTake(id: Bytes): BucketTake {
  let bucketTake = BucketTake.load(id)
  if (bucketTake == null) {
    // create new account if account hasn't already been stored
    bucketTake = new BucketTake(id) as BucketTake

    bucketTake.borrower = ZERO_ADDRESS
    bucketTake.taker = ZERO_ADDRESS
    bucketTake.liquidationAuction = Bytes.fromI32(0)
    bucketTake.loan = Bytes.fromI32(0)
    bucketTake.pool = Bytes.fromI32(0)
    bucketTake.index = 0
    bucketTake.auctionPrice = ZERO_BD
    bucketTake.amount = ZERO_BD
    bucketTake.collateral = ZERO_BD
    bucketTake.bondChange = ZERO_BD
    bucketTake.isReward = false
    bucketTake.lpAwarded = Bytes.fromI32(0)
    bucketTake.blockNumber = ZERO_BI
    bucketTake.blockTimestamp = ZERO_BI
    bucketTake.transactionHash = Bytes.fromI32(0)
  }
  return bucketTake;
}

/******************************/
/*** State Update Functions ***/
/******************************/

export function updateLiquidationAuction(
  liquidationAuction: LiquidationAuction, 
  auctionInfo: AuctionInfo, 
  auctionStatus: AuctionStatus,
  isTake: bool = true,
  isSettle: bool = false): void {
    if (!isSettle) {
      if (isTake) liquidationAuction.lastTakePrice = wadToDecimal(auctionStatus.price)
      liquidationAuction.bondFactor   = wadToDecimal(auctionInfo.bondFactor)
      liquidationAuction.bondSize     = wadToDecimal(auctionInfo.bondSize)
      liquidationAuction.kickTime     = auctionInfo.kickTime
      liquidationAuction.neutralPrice = wadToDecimal(auctionInfo.neutralPrice)
    }

    liquidationAuction.collateralRemaining = wadToDecimal(auctionStatus.collateral)
    liquidationAuction.debtRemaining       = wadToDecimal(auctionStatus.debtToCover)
}

export class AuctionInfo {
    kicker: Address
    bondFactor: BigInt
    bondSize: BigInt
    kickTime: BigInt
    kickMomp: BigInt
    neutralPrice: BigInt
    head: Address
    next: Address
    prev: Address
    alreadyTaken: bool
    constructor(kicker: Address, bondFactor: BigInt, bondSize: BigInt, kickTime: BigInt, kickMomp: BigInt, neutralPrice: BigInt, head: Address, next: Address, prev: Address, alreadyTaken: bool) {
        this.kicker = kicker
        this.bondFactor = bondFactor
        this.bondSize = bondSize
        this.kickTime = kickTime
        this.kickMomp = kickMomp
        this.neutralPrice = neutralPrice
        this.head = head
        this.next = next
        this.prev = prev
        this.alreadyTaken = alreadyTaken
    }
}
export function getAuctionInfoERC20Pool(borrower: Bytes, pool: Pool): AuctionInfo {
    const poolContract = ERC20Pool.bind(Address.fromBytes(pool.id))
    const auctionInfoResult = poolContract.auctionInfo(Address.fromBytes(borrower))
    const auctionInfo = new AuctionInfo(
        auctionInfoResult.value0,
        auctionInfoResult.value1,
        auctionInfoResult.value2,
        auctionInfoResult.value3,
        auctionInfoResult.value4,
        auctionInfoResult.value5,
        auctionInfoResult.value6,
        auctionInfoResult.value7,
        auctionInfoResult.value8,
        auctionInfoResult.value9
    )
    return auctionInfo
}
export function getAuctionInfoERC721Pool(borrower: Bytes, pool: Pool): AuctionInfo {
    const poolContract = ERC721Pool.bind(Address.fromBytes(pool.id))
    const auctionInfoResult = poolContract.auctionInfo(Address.fromBytes(borrower))
    const auctionInfo = new AuctionInfo(
        auctionInfoResult.value0,
        auctionInfoResult.value1,
        auctionInfoResult.value2,
        auctionInfoResult.value3,
        auctionInfoResult.value4,
        auctionInfoResult.value5,
        auctionInfoResult.value6,
        auctionInfoResult.value7,
        auctionInfoResult.value8,
        auctionInfoResult.value9
    )
    return auctionInfo
}

export class AuctionStatus {
    kickTime: BigInt
    collateral: BigInt
    debtToCover: BigInt
    isCollateralized: bool
    price: BigInt
    neutralPrice: BigInt
    constructor(kickTime: BigInt, collateral: BigInt, debtToCover: BigInt, isCollateralized: bool, price: BigInt, neutralPrice: BigInt) {
      this.kickTime = kickTime
      this.collateral = collateral
      this.debtToCover = debtToCover
      this.isCollateralized = isCollateralized
      this.price = price
      this.neutralPrice = neutralPrice
    }
}
export function getAuctionStatus(pool: Pool, borrower: Address): AuctionStatus {
    const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
    const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
    const result = poolInfoUtilsContract.auctionStatus(Address.fromBytes(pool.id), borrower)
    return new AuctionStatus(
      result.value0,
      result.value1,
      result.value2,
      result.value3,
      result.value4,
      result.value5
    )
}
