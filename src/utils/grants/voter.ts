import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Voter } from "../../../generated/schema"

import { ZERO_BD, ZERO_BI } from "../constants"

export function loadOrCreateVoter(voterId: Bytes): Voter {
    let voter = Voter.load(voterId)
    if (voter == null) {
        // create new lend if one already been stored
        voter = new Voter(voterId) as Voter

    }
    return voter
}
