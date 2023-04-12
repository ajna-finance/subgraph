import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { Proposal, ProposalParams } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../constants"

export function getProposalIdFromBigInt(proposalId: BigInt): Bytes {
    return Bytes.fromUTF8(proposalId.toString())
}

export function getProposalIdFromBytes(proposalId: Bytes): BigInt {
    return BigInt.fromString(proposalId.toString())
}

export function getProposalParamsId(proposalId: Bytes, paramIndex: number, distributionId: BigInt): Bytes {
    return proposalId.concat(Bytes.fromUTF8(paramIndex.toString() + distributionId.toString()))
}

export function getMechanismOfProposal(proposalId: Bytes): BigInt {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const distributionIdResult = grantFundContract.findMechanismOfProposal(getProposalIdFromBytes(proposalId))

    return BigInt.fromI32(distributionIdResult)
}
