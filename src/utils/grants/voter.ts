import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { DistributionPeriodVote } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_BD, ZERO_BI } from "../constants"
import { wadToDecimal } from "../convert"
import { loadOrCreateDistributionPeriod } from "./distribution"

export function getDistributionPeriodVoteId(distributionPeriodId: Bytes, voterId: Bytes): Bytes {
    return voterId
        .concat(Bytes.fromUTF8('|')
        .concat(distributionPeriodId))
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

export function loadOrCreateDistributionPeriodVote(distributionPeriodId: Bytes, voterId: Bytes): DistributionPeriodVote {
    const distributionPeriodVotesId = getDistributionPeriodVoteId(distributionPeriodId, voterId)
    let distributionPeriodVotes = DistributionPeriodVote.load(distributionPeriodVotesId)
    if (distributionPeriodVotes == null) {
        // create new distributionPeriodVotes if one hasn't already been stored
        distributionPeriodVotes = new DistributionPeriodVote(distributionPeriodVotesId) as DistributionPeriodVote
        distributionPeriodVotes.voter = voterId
        distributionPeriodVotes.distribution = distributionPeriodId
        distributionPeriodVotes.screeningStageVotingPower = ZERO_BD
        distributionPeriodVotes.fundingStageVotingPower = ZERO_BD
        distributionPeriodVotes.screeningVotes = []
        distributionPeriodVotes.fundingVotes = []

        // add to DistributionPeriod entity
        const distributionPeriod = loadOrCreateDistributionPeriod(distributionPeriodId)
        distributionPeriod.votes = distributionPeriod.votes.concat([distributionPeriodVotesId])
        distributionPeriod.save()
    }
    return distributionPeriodVotes
}

/**********************/
/*** Contract Calls ***/
/**********************/

export function getFundingStageVotingPower(grantFundAddress: Address, distributionId: BigInt, voter: Address): BigDecimal {
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const votingPower = grantFundContract.getVotesFunding(distributionId.toI32(), voter)

    return wadToDecimal(votingPower)
}

export function getScreeningStageVotingPower(grantFundAddress: Address, distributionId: BigInt, voter: Address): BigDecimal {
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const votingPower = grantFundContract.getVotesScreening(distributionId.toI32(), voter)

    return wadToDecimal(votingPower)
}
