import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { DistributionPeriodVote, Voter } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../constants"
import { wadToDecimal } from "../convert"

export function getDistributionPeriodVoteId(distributionPeriodId: Bytes, voterId: Bytes): Bytes {
    return voterId
        .concat(Bytes.fromUTF8('|')
        .concat(distributionPeriodId))
}

export function getExtraordinaryVoteId(proposalId: Bytes, voterId: Bytes, logIndex: BigInt): Bytes {
    return proposalId
        .concat(Bytes.fromUTF8('extraordinary'))
        .concat(voterId)
}

export function getFundingVoteId(proposalId: Bytes, voterId: Bytes, logIndex: BigInt): Bytes {
    return proposalId
        .concat(Bytes.fromUTF8('funding'))
        .concat(voterId)
        .concat(Bytes.fromUTF8(logIndex.toString()))
}

export function getScreeningVoteId(proposalId: Bytes, voterId: Bytes, logIndex: BigInt): Bytes {
    return proposalId
        .concat(Bytes.fromUTF8('screening'))
        .concat(voterId)
        .concat(Bytes.fromUTF8(logIndex.toString()))
}

export function loadOrCreateVoter(voterId: Bytes): Voter {
    let voter = Voter.load(voterId)
    if (voter == null) {
        // create new voter if one hasn't already been stored
        voter = new Voter(voterId) as Voter

    }
    return voter
}

export function loadOrCreateDistributionPeriodVote(distributionPeriodId: Bytes, voterId: Bytes): DistributionPeriodVote {
    const distributionPeriodVotesId = getDistributionPeriodVoteId(distributionPeriodId, voterId)
    let distributionPeriodVotes = DistributionPeriodVote.load(distributionPeriodVotesId)
    if (distributionPeriodVotes == null) {
        // create new distributionPeriodVotes if one hasn't already been stored
        distributionPeriodVotes = new DistributionPeriodVote(distributionPeriodVotesId) as DistributionPeriodVote
        distributionPeriodVotes.distribution = distributionPeriodId
        distributionPeriodVotes.screeningStageVotingPower = ZERO_BD
        distributionPeriodVotes.fundingStageVotingPower = ZERO_BD
        distributionPeriodVotes.screeningVotes = []
        distributionPeriodVotes.fundingVotes = []
    }
    return distributionPeriodVotes
}

/**********************/
/*** Contract Calls ***/
/**********************/

export function getFundingStageVotingPower(distributionId: BigInt, voter: Address): BigDecimal {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const votingPower = grantFundContract.getVotesFunding(distributionId.toI32(), voter)

    return wadToDecimal(votingPower)
}

export function getScreeningStageVotingPower(distributionId: BigInt, voter: Address): BigDecimal {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const votingPower = grantFundContract.getVotesScreening(distributionId.toI32(), voter)

    return wadToDecimal(votingPower)
}
