import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Pool, ReserveAuction } from "../../generated/schema"
import { EXP_18_BD, ONE_BI, ZERO_BD, ZERO_BI } from "./constants"

export function getReserveAuctionId(poolId: Bytes, burnEpoch: BigInt): Bytes {
    return poolId.concat(Bytes.fromUTF8('|' + burnEpoch.toHexString()))
}

export function loadOrCreateReserveAuction(poolId: Bytes, burnEpoch: BigInt): ReserveAuction {
    const reserveAuctionId = getReserveAuctionId(poolId, burnEpoch);
    let reserveAuction = ReserveAuction.load(reserveAuctionId)
    if (reserveAuction == null) {
        // create new reserveAuction if it has not already been loaded
        reserveAuction = new ReserveAuction(reserveAuctionId) as ReserveAuction

        // set initial values
        reserveAuction.pool = poolId
        reserveAuction.claimableReservesRemaining = ZERO_BD
        reserveAuction.auctionPrice = ZERO_BD
        reserveAuction.burnEpoch = burnEpoch
        reserveAuction.ajnaBurned = ZERO_BD
        reserveAuction.takes = []
        reserveAuction.ajnaBurned = ZERO_BD
    }
    return reserveAuction
}

// TODO: check calculation of pool claimable reserves
export function reserveAuctionKickerReward(pool: Pool): BigDecimal {
    // kicker award = claimableReserves * 0.01
    return BigDecimal.fromString(`${pool.claimableReserves}`)
        .times(BigDecimal.fromString("0.01"))
}
