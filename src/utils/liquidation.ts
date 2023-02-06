import { Bytes } from "@graphprotocol/graph-ts"
import { LiquidationAuction, Kick, Loan } from "../../generated/schema"

import { wadToDecimal } from "./convert"

export function getLiquidationAuctionId(pool: Bytes, loanId: Bytes): Bytes {
    return pool.concat(Bytes.fromUTF8('|' + loanId.toString()))
}

export function loadOrCreateLiquidationAuction(poolId: Bytes, liquidationAuctionId: Bytes, kick: Kick, loan: Loan): LiquidationAuction {
    let liquidationAuction = LiquidationAuction.load(liquidationAuctionId)
    if (liquidationAuction == null) {
        // create new liquidationAuction if liquidationAuction hasn't already been loaded
        liquidationAuction = new LiquidationAuction(liquidationAuctionId) as LiquidationAuction

        liquidationAuction.pool = poolId
        liquidationAuction.borrower = loan.borrower
        liquidationAuction.loan = loan.id
        liquidationAuction.kicker = kick.kicker
        liquidationAuction.kick = kick.id
        liquidationAuction.kickTime = kick.blockTimestamp
        liquidationAuction.bondSize = wadToDecimal(kick.bond)

    }
    return liquidationAuction
}
