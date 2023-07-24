import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { DistributionPeriodVote, FundingVote, Voter } from "../../../generated/schema"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

import { ZERO_BD, ZERO_BI } from "../constants"
import { wadToDecimal } from "../convert"

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

export function getFundingVotesByProposalId(distributionPeriodVote: DistributionPeriodVote, proposalId: Bytes): Bytes[] {
    const filteredVotes: Bytes[] = [];
    const fundingVotes = distributionPeriodVote.fundingVotes;

    for (let i = 0; i < fundingVotes.length; i++) {
        const proposal = loadOrCreateFundingVote(fundingVotes[i]).proposal;
        if (proposal === proposalId) {
            filteredVotes.push(fundingVotes[i]);
        }
    }
    return filteredVotes;
}

// calculate the amount of funding voting power used on an individual FundingVote
export function getFundingVotingPowerUsed(distributionPeriodVote: DistributionPeriodVote, proposalId: Bytes): BigDecimal {
    const votes = getFundingVotesByProposalId(distributionPeriodVote, proposalId);

    // accumulate the squared votes from each separate vote on the proposal
    const squaredAmount: BigDecimal[] = [];
    for (let i = 0; i < votes.length; i++) {
        const vote = loadOrCreateFundingVote(votes[i]);
        squaredAmount.push(vote.votesCast.times(vote.votesCast));
    }

    // sum the squared amounts
    let sum = ZERO_BD;
    for (let i = 0; i < squaredAmount.length; i++) {
        sum = sum.plus(squaredAmount[i]);
    }

    return sum;
}

export function loadOrCreateFundingVote(fundingVoteId: Bytes): FundingVote {
    let fundingVote = FundingVote.load(fundingVoteId)
    if (fundingVote == null) {
        // create new fundingVote if one hasn't already been stored
        fundingVote = new FundingVote(fundingVoteId) as FundingVote
        fundingVote.distribution = Bytes.empty()
        fundingVote.voter = Bytes.empty()
        fundingVote.proposal = Bytes.empty()
        fundingVote.votesCast = ZERO_BD
        fundingVote.votingPowerUsed = ZERO_BD
        fundingVote.blockNumber = ZERO_BI
    }
    return fundingVote
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
        distributionPeriodVotes.initialFundingStageVotingPower = ZERO_BD
        distributionPeriodVotes.remainingFundingStageVotingPower = ZERO_BD
        distributionPeriodVotes.screeningVotes = []
        distributionPeriodVotes.fundingVotes = []
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
