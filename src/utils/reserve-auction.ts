import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Pool, ReserveAuction } from "../../generated/schema"
import { ONE_BI, ZERO_BD, ZERO_BI } from "./constants"
import { bigDecimalExp18 } from "./convert"

export function getReserveAuctionId(poolId: Bytes, burnEpoch: BigInt): Bytes {
    return poolId.concat(Bytes.fromUTF8('|' + burnEpoch.toHexString()))
}

export function loadOrCreateReserveAuction(poolId: Bytes, reserveAuctionId: Bytes): ReserveAuction {
    let reserveAuction = ReserveAuction.load(reserveAuctionId)
    if (reserveAuction == null) {
        // create new reserveAuction if it has not already been loaded
        reserveAuction = new ReserveAuction(reserveAuctionId) as ReserveAuction

        // set initial values
        reserveAuction.burnEpoch = ONE_BI
        reserveAuction.ajnaBurnedAcrossAllTakes = ZERO_BD
        reserveAuction.kickerAward = ZERO_BD
        reserveAuction.kickTime = ZERO_BI
        reserveAuction.reserveAuctionTakes = []
        reserveAuction.pool = poolId

        reserveAuction.kicker = Bytes.empty()
    }
    return reserveAuction
}

// TODO: check calculation of pool claimable reserves
export function reserveAuctionKickerReward(pool: Pool): BigDecimal {
    // kicker award = claimableReserves * 0.01 * 1e18
    // stored as a decimal converted from wad
    return BigDecimal.fromString(`${pool.claimableReserves}`)
        .times(BigDecimal.fromString("10000000000000000"))  // 1%
        .div(bigDecimalExp18())
}
