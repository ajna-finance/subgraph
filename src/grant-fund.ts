import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts'

import {
  DelegateRewardClaimed as DelegateRewardClaimedEvent,
  FundTreasury as FundTreasuryEvent,
  FundedSlateUpdated as FundedSlateUpdatedEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent,
  QuarterlyDistributionStarted as QuarterlyDistributionStartedEvent,
  VoteCast as VoteCastEvent
} from "../generated/GrantFund/GrantFund"
import {
  DelegateRewardClaimed,
  DistributionPeriod,
  DistributionPeriodVote,
  FundTreasury,
  FundedSlateUpdated,
  FundingVote,
  Proposal,
  ProposalCreated,
  ProposalExecuted,
  ProposalParams,
  QuarterlyDistributionStarted,
  ScreeningVote,
  VoteCast
} from "../generated/schema"

import { ZERO_BD } from './utils/constants'
import { addressArrayToBytesArray, addressToBytes, bigIntToBytes, bytesToAddress, bytesToBigInt, wadToDecimal } from "./utils/convert"
import { getMechanismOfProposal, getProposalParamsId } from './utils/grants/proposal'
import { getCurrentDistributionId, getCurrentStage } from './utils/grants/distribution'
import { getDistributionPeriodVoteId, getFundingStageVotingPower, getFundingVoteId, getScreeningStageVotingPower, getScreeningVoteId, loadOrCreateDistributionPeriodVote, loadOrCreateVoter } from './utils/grants/voter'

export function handleDelegateRewardClaimed(
  event: DelegateRewardClaimedEvent
): void {
  const delegateRewardClaimed = new DelegateRewardClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  delegateRewardClaimed.delegateeAddress_ = event.params.delegateeAddress_
  delegateRewardClaimed.distributionId_   = event.params.distributionId_
  delegateRewardClaimed.rewardClaimed_    = event.params.rewardClaimed_

  delegateRewardClaimed.blockNumber     = event.block.number
  delegateRewardClaimed.blockTimestamp  = event.block.timestamp
  delegateRewardClaimed.transactionHash = event.transaction.hash

  delegateRewardClaimed.save()
}

export function handleFundTreasury(event: FundTreasuryEvent): void {
  let entity = new FundTreasury(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.treasuryBalance = event.params.treasuryBalance

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundedSlateUpdated(event: FundedSlateUpdatedEvent): void {
  let entity = new FundedSlateUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.distributionId_ = event.params.distributionId_
  entity.fundedSlateHash_ = event.params.fundedSlateHash_

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  const proposalCreated = new ProposalCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  proposalCreated.proposalId  = event.params.proposalId
  proposalCreated.proposer    = event.params.proposer
  proposalCreated.targets     = addressArrayToBytesArray(event.params.targets)
  proposalCreated.values      = event.params.values
  proposalCreated.signatures  = event.params.signatures
  proposalCreated.calldatas   = event.params.calldatas
  proposalCreated.startBlock  = event.params.startBlock
  proposalCreated.endBlock    = event.params.endBlock
  proposalCreated.description = event.params.description

  proposalCreated.blockNumber     = event.block.number
  proposalCreated.blockTimestamp  = event.block.timestamp
  proposalCreated.transactionHash = event.transaction.hash

  const distributionId = getCurrentDistributionId()

  // update distribution entity
  const distributionPeriod = DistributionPeriod.load(bigIntToBytes(distributionId)) as DistributionPeriod

  // create Proposal entities
  const proposalId = bigIntToBytes(event.params.proposalId)
  const proposal = new Proposal(proposalId) as Proposal
  proposal.description  = event.params.description
  proposal.distribution = distributionPeriod.id
  proposal.executed     = false
  proposal.successful   = false
  proposal.screeningVotesReceived = ZERO_BD
  proposal.fundingVotesReceived = ZERO_BD

  // set proposal funding mechanism
  const proposalFundingMechanism = getMechanismOfProposal(proposalId)
  proposal.isStandard = proposalFundingMechanism == BigInt.fromI32(0)
  proposal.isExtraordinary = proposalFundingMechanism == BigInt.fromI32(1)

  let totalTokensRequested = ZERO_BD

  // create ProposalParams entities for each separate proposal param
  for (let i = 0; i < event.params.targets.length; i++) {
    const proposalParamsId = getProposalParamsId(proposalId, i, distributionId)
    const proposalParams = new ProposalParams(proposalParamsId) as ProposalParams
    proposalParams.target = event.params.targets[i]
    proposalParams.value = event.params.values[i]
    proposalParams.calldata = event.params.calldatas[i]

    // decode the calldata to get the recipient and tokens requested
    const dataWithoutFunctionSelector = Bytes.fromUint8Array(proposalParams.calldata.subarray(3))
    const decoded = ethereum.decode('(address,uint256)', dataWithoutFunctionSelector)
    if (decoded != null) {
      proposalParams.recipient = decoded.toTuple()[0].toAddress()
      const tokensRequested = decoded.toTuple()[1].toBigInt().toBigDecimal()
      proposalParams.tokensRequested = tokensRequested
      totalTokensRequested = totalTokensRequested.plus(tokensRequested)
    }

    // add proposalParams information to proposal
    proposal.params.push(proposalParams.id)
    proposal.totalTokensRequested = totalTokensRequested

    // save each proposalParams entity to the store
    proposalParams.save()
  }

  // add proposal to distribution period
  distributionPeriod.proposals.push(proposal.id)
  distributionPeriod.totalTokensRequested = distributionPeriod.totalTokensRequested.plus(proposal.totalTokensRequested)

  // save entities to store
  proposalCreated.save()
  proposal.save()
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let entity = new ProposalExecuted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.proposalId = event.params.proposalId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleQuarterlyDistributionStarted(
  event: QuarterlyDistributionStartedEvent
): void {
  const distributionStarted = new QuarterlyDistributionStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  distributionStarted.distributionId_ = event.params.distributionId_
  distributionStarted.startBlock_ = event.params.startBlock_
  distributionStarted.endBlock_ = event.params.endBlock_

  distributionStarted.blockNumber = event.block.number
  distributionStarted.blockTimestamp = event.block.timestamp
  distributionStarted.transactionHash = event.transaction.hash

  // create DistributionPeriod entities
  const distributionPeriod = new DistributionPeriod(bigIntToBytes(distributionStarted.distributionId_)) as DistributionPeriod

  distributionPeriod.startBlock = distributionStarted.startBlock_
  distributionPeriod.endBlock = distributionStarted.endBlock_
  distributionPeriod.topSlate = Bytes.empty()
  distributionPeriod.delegationRewardsClaimed = ZERO_BD
  distributionPeriod.totalTokensRequested = ZERO_BD
  distributionPeriod.fundingVotesCast = ZERO_BD
  distributionPeriod.fundingVotePowerUsed = ZERO_BD
  distributionPeriod.screeningVotesCast = ZERO_BD
  distributionPeriod.proposals = []

  // save entities to store
  distributionPeriod.save()
  distributionStarted.save()
}

export function handleVoteCast(event: VoteCastEvent): void {
  const voteCast = new VoteCast(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  voteCast.voter = event.params.voter
  voteCast.proposalId = event.params.proposalId
  voteCast.support = event.params.support
  voteCast.weight = event.params.weight
  voteCast.reason = event.params.reason

  voteCast.blockNumber = event.block.number
  voteCast.blockTimestamp = event.block.timestamp
  voteCast.transactionHash = event.transaction.hash

  // update proposal entity
  const proposalId = bigIntToBytes(event.params.proposalId)
  const proposal = Proposal.load(proposalId) as Proposal

  if (proposal.isStandard) {

    // TODO: need to be able to access the distributionId at that block height or call getDistributionIdAtBlock()?
    // load distribution entity
    const distributionId = bigIntToBytes(getCurrentDistributionId())
    const distributionPeriod = DistributionPeriod.load(distributionId) as DistributionPeriod

    // load voter entity
    const voter = loadOrCreateVoter(addressToBytes(event.params.voter))

    // load voter's distributionPeriodVotes
    const distributionPeriodVote = loadOrCreateDistributionPeriodVote(distributionPeriod.id, voter.id)

    // check stage of proposal
    const stage = getCurrentStage(voteCast.blockNumber, distributionPeriod)

    // proposal is in screening stage
    if (stage === "SCREENING") {
      const screeningVotesCast = wadToDecimal(event.params.weight)
      proposal.screeningVotesReceived = proposal.screeningVotesReceived.plus(screeningVotesCast)
      distributionPeriod.screeningVotesCast = distributionPeriod.screeningVotesCast.plus(event.params.weight.toBigDecimal())

      // create ScreeningVote entity
      const screeningVote = new ScreeningVote(getScreeningVoteId(proposalId, voter.id, event.logIndex)) as ScreeningVote
      screeningVote.distribution = distributionId
      screeningVote.voter = voter.id
      screeningVote.proposal = proposalId
      screeningVote.votesCast = screeningVotesCast
      screeningVote.blockNumber = voteCast.blockNumber

      // update voter's distributionPeriodVote entity if it hasn't been recorded yet
      if (distributionPeriodVote.screeningStageVotingPower === ZERO_BD) {
        distributionPeriodVote.screeningStageVotingPower = getScreeningStageVotingPower(bytesToBigInt(distributionId), bytesToAddress(voter.id))
      }

      // add additional screening votes to voter's distributionPeriodVote entity
      distributionPeriodVote.screeningVotes.push(screeningVote.id)

      // save screeningVote to the store
      screeningVote.save()
    }
    else if (stage === "FUNDING") {
      // create FundingVote entity
      const fundingVote = new FundingVote(getFundingVoteId(proposalId, voter.id, event.logIndex)) as FundingVote
      fundingVote.distribution = distributionId
      fundingVote.voter = voter.id
      fundingVote.proposal = proposalId
      fundingVote.votesCast = wadToDecimal(event.params.weight)
      // fundingVote.votingPowerUsed = ZERO_BD TODO: need to calculate this
      fundingVote.blockNumber = voteCast.blockNumber

      // update voter's distributionPeriodVote entity if it hasn't been recorded yet
      if (distributionPeriodVote.screeningStageVotingPower === ZERO_BD) {
        distributionPeriodVote.fundingStageVotingPower = getFundingStageVotingPower(bytesToBigInt(distributionId), bytesToAddress(voter.id))
      }

      // save fundingVote to the store
      fundingVote.save()
    }

    // save entities to the store
    distributionPeriod.save()
    distributionPeriodVote.save()
    proposal.save()
    voter.save()
  }

  voteCast.save()
}

function handleVoteStandard(): void {

}

function handleVoteExtraordinary(): void {

}
