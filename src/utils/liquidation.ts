import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { LiquidationAuction, Kick, Loan, Pool } from "../../generated/schema"
import { ERC20Pool } from '../../generated/ERC20Pool/ERC20Pool'

import { wadToDecimal } from "./convert"

export function getLiquidationAuctionId(pool: Bytes, loanId: Bytes): Bytes {
    return pool.concat(Bytes.fromUTF8('|' + loanId.toString()))
}

export function loadOrCreateLiquidationAuction(poolId: Bytes, liquidationAuctionId: Bytes, kick: Kick, loan: Loan): LiquidationAuction {
    let liquidationAuction = LiquidationAuction.load(liquidationAuctionId)
    if (liquidationAuction == null) {
        // create new liquidationAuction if liquidationAuction hasn't already been loaded
        liquidationAuction = new LiquidationAuction(liquidationAuctionId) as LiquidationAuction

        // write constant pointers
        liquidationAuction.pool = poolId
        liquidationAuction.borrower = loan.borrower
        liquidationAuction.loan = loan.id
        liquidationAuction.kicker = kick.kicker
        liquidationAuction.kick = kick.id
    }
    return liquidationAuction
}

export function updateLiquidationAuction(liquidationAuction: LiquidationAuction, auctionInfo: AuctionInfo): void {
    liquidationAuction.kickTime     = auctionInfo.kickTime
    liquidationAuction.bondSize     = wadToDecimal(auctionInfo.bondSize)
    liquidationAuction.bondFactor   = wadToDecimal(auctionInfo.bondFactor)
    liquidationAuction.neutralPrice = wadToDecimal(auctionInfo.neutralPrice)

    // TODO: determine how to handle auction queue ordering
    // add these fields to the pool schema?
    // liquidationAuction.head = auctionInfo.head
    // liquidationAuction.next = auctionInfo.next
    // liquidationAuction.prev = auctionInfo.prev
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
    constructor(kicker: Address, bondFactor: BigInt, bondSize: BigInt, kickTime: BigInt, kickMomp: BigInt, neutralPrice: BigInt, head: Address, next: Address, prev: Address) {
        this.kicker = kicker
        this.bondFactor = bondFactor
        this.bondSize = bondSize
        this.kickTime = kickTime
        this.kickMomp = kickMomp
        this.neutralPrice = neutralPrice
        this.head = head
        this.next = next
        this.prev = prev
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
        auctionInfoResult.value8
    )
    return auctionInfo
}
