import { Address, BigDecimal, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts"

import { Account, DistributionPeriodVote, FundingVote, ScreeningVote } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_BD, ZERO_BI } from "../constants"
import { bigIntToBytes, wadToDecimal } from "../convert"
import { loadOrCreateDistributionPeriod } from "./distribution"

export function getDistributionPeriodVoteId(distributionPeriodId: Bytes, voterId: Bytes): Bytes {
    return voterId
        .concat(Bytes.fromUTF8('|')
        .concat(distributionPeriodId))
}

export function getFundingVoteId(proposalId: Bytes, voterId: Bytes, distributionId: Bytes): Bytes {
    return proposalId
        .concat(Bytes.fromUTF8('funding'))
        .concat(voterId)
        .concat(distributionId)
}

export function getScreeningVoteId(proposalId: Bytes, voterId: Bytes, distributionId: Bytes): Bytes {
    return proposalId
        .concat(Bytes.fromUTF8('screening'))
        .concat(voterId)
        .concat(distributionId)
}

export function getFundingVotesByProposalId(distributionPeriodVote: DistributionPeriodVote, proposalId: Bytes): Bytes[] {
    const filteredVotes: Bytes[] = [];
    const fundingVotes = distributionPeriodVote.fundingVotes;

    for (let i = 0; i < fundingVotes.length; i++) {
        const proposal = loadOrCreateFundingVote(fundingVotes[i]).proposal;
        if (proposal.equals(proposalId)) {
            filteredVotes.push(fundingVotes[i]);
        }
    }
    return filteredVotes;
}

// calculate the amount of funding voting power used on an individual FundingVote
export function getFundingVotingPowerUsed(fundingVote: FundingVote): BigDecimal {
    // square the sum of votes cast on the proposal to determine the incremental voting power used
    const sum = fundingVote.totalVotesCast
    return sum.times(sum);
}

/********************/
/*** Constructors ***/
/********************/

export function loadOrCreateScreeningVote(screeningVoteId: Bytes): ScreeningVote {
    let screeningVote = ScreeningVote.load(screeningVoteId)
    if (screeningVote == null) {
        // create new screeningVote if one hasn't already been stored
        screeningVote = new ScreeningVote(screeningVoteId) as ScreeningVote
        screeningVote.distribution = Bytes.empty()
        screeningVote.voter = Bytes.empty()
        screeningVote.proposal = Bytes.empty()
        screeningVote.totalVotesCast = ZERO_BD
        screeningVote.votesCast = []
    }
    return screeningVote
}

export function loadOrCreateFundingVote(fundingVoteId: Bytes): FundingVote {
    let fundingVote = FundingVote.load(fundingVoteId)
    if (fundingVote == null) {
        // create new fundingVote if one hasn't already been stored
        fundingVote = new FundingVote(fundingVoteId) as FundingVote
        fundingVote.distribution = Bytes.empty()
        fundingVote.voter = Bytes.empty()
        fundingVote.proposal = Bytes.empty()
        fundingVote.totalVotesCast = ZERO_BD
        fundingVote.votingPowerUsed = ZERO_BD
        fundingVote.votesCast = []
    }
    return fundingVote
}

export function loadOrCreateDistributionPeriodVote(distributionId: BigInt, voterId: Bytes): DistributionPeriodVote {
    const distributionPeriodId = bigIntToBytes(distributionId)
    const distributionPeriodVotesId = getDistributionPeriodVoteId(distributionPeriodId, voterId)
    let distributionPeriodVotes = DistributionPeriodVote.load(distributionPeriodVotesId)
    if (distributionPeriodVotes == null) {
        // create new distributionPeriodVotes if one hasn't already been stored
        distributionPeriodVotes = new DistributionPeriodVote(distributionPeriodVotesId) as DistributionPeriodVote
        distributionPeriodVotes.voter = voterId
        distributionPeriodVotes.distribution = distributionPeriodId
        distributionPeriodVotes.initialFundingStageVotingPowerRecordedPostVote = ZERO_BD
        distributionPeriodVotes.remainingFundingStageVotingPower = ZERO_BD
        distributionPeriodVotes.initialScreeningStageVotingPowerRecordedPostVote = ZERO_BD
        distributionPeriodVotes.remainingScreeningStageVotingPower = ZERO_BD
        distributionPeriodVotes.screeningVotes = []
        distributionPeriodVotes.fundingVotes = []

        // add to DistributionPeriod entity
        const distributionPeriod = loadOrCreateDistributionPeriod(distributionId)
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

/*************************/
/*** Utility Functions ***/
/*************************/

export function addDelegator(delegator: Account, delegate: Account): void {
    // prevent duplicate delegatedFroms
    const index = delegate.delegatedFrom.indexOf(delegator.id)
    if (index != -1) return

    delegate.delegatedFrom = delegate.delegatedFrom.concat([delegator.id])
}

export function removeDelegator(oldDelegator: Account, delegate: Account): void {
    const removalIndex = delegate.delegatedFrom.indexOf(oldDelegator.id)
    if (removalIndex != -1) {
        delegate.delegatedFrom = delegate.delegatedFrom.splice(removalIndex, 1)
    }
}