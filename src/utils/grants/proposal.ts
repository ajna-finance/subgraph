import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { Proposal, ProposalParams } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../constants"
import { bytesToBigInt } from "../convert"

export function getProposalParamsId(proposalId: Bytes, paramIndex: number, distributionId: BigInt): Bytes {
    return proposalId.concat(Bytes.fromUTF8(paramIndex.toString() + distributionId.toString()))
}

export function getMechanismOfProposal(proposalId: Bytes): BigInt {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const distributionIdResult = grantFundContract.findMechanismOfProposal(bytesToBigInt(proposalId))

    return BigInt.fromI32(distributionIdResult)
}
