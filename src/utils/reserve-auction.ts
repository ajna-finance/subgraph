import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Pool, ReserveAuctionProcess } from "../../generated/schema"
import { ONE_BI, ZERO_BD, ZERO_BI } from "./constants"
import { bigDecimalExp18 } from "./convert"

export function getReserveAuctionId(poolId: Bytes, burnEpoch: BigInt): Bytes {
    return poolId.concat(Bytes.fromUTF8('|' + burnEpoch.toHexString()))
}

export function loadOrCreateReserveAuctionProcess(poolId: Bytes, reserveAuctionProcessId: Bytes): ReserveAuctionProcess {
    let reserveAuctionProcess = ReserveAuctionProcess.load(reserveAuctionProcessId)
    if (reserveAuctionProcess == null) {
        // create new reserveAuctionProcess if reserveAuctionProcess hasn't already been loaded
        reserveAuctionProcess = new ReserveAuctionProcess(reserveAuctionProcessId) as ReserveAuctionProcess

        // set initial values
        reserveAuctionProcess.burnEpoch = ONE_BI
        reserveAuctionProcess.ajnaBurnedAcrossAllTakes = ZERO_BD
        reserveAuctionProcess.kickerAward = ZERO_BD
        reserveAuctionProcess.kickTime = ZERO_BI
        reserveAuctionProcess.reserveAuctionTakes = []
        reserveAuctionProcess.pool = poolId

        reserveAuctionProcess.kicker = Bytes.empty()
    }
    return reserveAuctionProcess
}

// TODO: check conversion of pool claimable reserves to decimal
export function reserveAuctionKickerReward(pool: Pool): BigDecimal {
    // kicker award = claimableReserves * 0.01 * 1e18
    // stored as a decimal converted from wad
    return BigDecimal.fromString(`${pool.claimableReserves}`)
        .times(BigDecimal.fromString("10000000000000000"))
        .div(bigDecimalExp18())
}
