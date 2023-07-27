import { Address, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"
import { Proposal, ProposalParams } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI } from "../constants"
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
        proposal.executed     = false
        proposal.screeningVotesReceived = ZERO_BD
        proposal.fundingVotesReceived = ZERO_BD
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

export function getProposalsInSlate(grantFundAddress: Address, slateHash: Bytes): Array<BigInt> {
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const getProposalsInSlateResult = grantFundContract.getFundedProposalSlate(slateHash)

    return getProposalsInSlateResult
}
