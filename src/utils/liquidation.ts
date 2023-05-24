import { Address, BigDecimal, BigInt, Bytes, Value, dataSource } from "@graphprotocol/graph-ts"

import { LiquidationAuction, Kick, Loan, Pool } from "../../generated/schema"
import { ERC20Pool } from '../../generated/templates/ERC20Pool/ERC20Pool'

import { wadToDecimal } from "./convert"
import { ONE_BI, ZERO_BD, poolInfoUtilsNetworkLookUpTable } from "./constants"
import { PoolInfoUtils } from "../../generated/templates/ERC20Pool/PoolInfoUtils"

export function getLiquidationAuctionId(poolId: Bytes, loanId: Bytes, kickBlock: BigInt): Bytes {
    return poolId.concat(Bytes.fromUTF8('|' + loanId.toString() + '|' + kickBlock.toString()))
}

export function getBucketTakeLPAwardedId(transactionHash: Bytes, logIndex: BigInt): Bytes {
    // assume that the logIndex is always one greater given the order of emitted events
    // should handle case where multiple BucketTakes are performed in a single multicall TX
    return transactionHash.concatI32(logIndex.toI32())
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
        liquidationAuction.auctionPrice        = ZERO_BD // FIXME: not exposed by contracts
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

export function updateLiquidationAuction(
  liquidationAuction: LiquidationAuction, 
  auctionInfo: AuctionInfo, 
  auctionStatus: AuctionStatus,
  isSettle: bool = false): void {
    if (!isSettle) {
      liquidationAuction.auctionPrice = wadToDecimal(auctionStatus.price)
      liquidationAuction.kickTime     = auctionInfo.kickTime
    }

    liquidationAuction.collateralRemaining = wadToDecimal(auctionStatus.collateral)
    liquidationAuction.debtRemaining       = wadToDecimal(auctionStatus.debtToCover)
    liquidationAuction.bondSize            = wadToDecimal(auctionInfo.bondSize)
    liquidationAuction.bondFactor          = wadToDecimal(auctionInfo.bondFactor)
    liquidationAuction.neutralPrice        = wadToDecimal(auctionInfo.neutralPrice)
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
    const poolInfoUtilsAddress = poolInfoUtilsNetworkLookUpTable.get(dataSource.network())!
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