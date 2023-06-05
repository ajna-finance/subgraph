import { Address, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"
import { Proposal, ProposalParams } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI, grantFundAddressTable } from "../constants"
import { bytesToBigInt } from "../convert"

export function getProposalParamsId(proposalId: Bytes, paramIndex: number): Bytes {
    return proposalId
        .concat(Bytes.fromUTF8('|'))
        .concat(Bytes.fromUTF8(paramIndex.toString()))
}

export function loadOrCreateProposal(proposalId: Bytes): Proposal {
    let proposal = Proposal.load(proposalId)
    if (proposal == null) {
        // create new proposal if one hasn't already been stored
        proposal = new Proposal(proposalId) as Proposal
        proposal.description  = ""
        proposal.distribution = Bytes.empty()
        proposal.isStandard   = false
        proposal.isExtraordinary = false
        proposal.executed     = false
        proposal.successful   = false
        proposal.screeningVotesReceived = ZERO_BD
        proposal.fundingVotesReceived = ZERO_BD
        proposal.extraordinaryVotesReceived = ZERO_BD
        proposal.totalTokensRequested = ZERO_BD
        proposal.params = []
    }
    return proposal
}

export function removeProposalFromList(proposalId: Bytes, proposalList: Array<Bytes>): Array<Bytes> {
    const proposalListCopy = proposalList
    const index = proposalListCopy.indexOf(proposalId)
    if (index > -1) {
        proposalListCopy.splice(index, 1)
    }
    return proposalListCopy
}

/**********************/
/*** Contract Calls ***/
/**********************/

export function getMechanismOfProposal(proposalId: Bytes): BigInt {
    const grantFundAddress  = grantFundAddressTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const findMechanismOfProposalResult = grantFundContract.findMechanismOfProposal(bytesToBigInt(proposalId))

    return BigInt.fromI32(findMechanismOfProposalResult)
}


export function getProposalsInSlate(distributionId: BigInt): Array<BigInt> {
    const grantFundAddress  = grantFundAddressTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const getProposalsInSlateResult = grantFundContract.getTopTenProposals(distributionId.toI32())

    return getProposalsInSlateResult
}
