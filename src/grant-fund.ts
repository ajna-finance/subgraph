import { Address, BigInt, Bytes, ethereum, log } from '@graphprotocol/graph-ts'

import {
  DelegateRewardClaimed as DelegateRewardClaimedEvent,
  FundTreasury as FundTreasuryEvent,
  FundedSlateUpdated as FundedSlateUpdatedEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent,
  DistributionPeriodStarted as DistributionPeriodStartedEvent,
  VoteCast as VoteCastEvent
} from "../generated/GrantFund/GrantFund"
import {
  DelegateRewardClaimed,
  DistributionPeriod,
  FundTreasury,
  FundedSlate,
  FundedSlateUpdated,
  FundingVote,
  Proposal,
  ProposalCreated,
  ProposalExecuted,
  ProposalParams,
  DistributionPeriodStarted,
  ScreeningVote,
  VoteCast
} from "../generated/schema"

import { ZERO_ADDRESS, ZERO_BD } from './utils/constants'
import { addressArrayToBytesArray, addressToBytes, bigIntToBytes, bytesToBigInt, wadToDecimal } from "./utils/convert"
import { getProposalParamsId, getProposalsInSlate, loadOrCreateProposal, removeProposalFromList } from './utils/grants/proposal'
import { getCurrentDistributionId, getCurrentStage, loadOrCreateDistributionPeriod } from './utils/grants/distribution'
import { getDistributionPeriodVoteId, getFundingStageVotingPower, getFundingVoteId, getScreeningStageVotingPower, getScreeningVoteId, loadOrCreateDistributionPeriodVote, loadOrCreateVoter } from './utils/grants/voter'
import { loadOrCreateGrantFund } from './utils/grants/fund'

export function handleDelegateRewardClaimed(
  event: DelegateRewardClaimedEvent
): void {
  const delegateRewardClaimed = new DelegateRewardClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  delegateRewardClaimed.delegateeAddress_ = event.params.delegateeAddress
  delegateRewardClaimed.rewardClaimed_    = event.params.rewardClaimed

  delegateRewardClaimed.blockNumber     = event.block.number
  delegateRewardClaimed.blockTimestamp  = event.block.timestamp
  delegateRewardClaimed.transactionHash = event.transaction.hash

  const rewardsClaimed = wadToDecimal(event.params.rewardClaimed)

  // update DistributionPeriod entity
  const distributionId = bigIntToBytes(getCurrentDistributionId())
  const distributionPeriod = loadOrCreateDistributionPeriod(distributionId)
  distributionPeriod.delegationRewardsClaimed = distributionPeriod.delegationRewardsClaimed.plus(rewardsClaimed)

  // update GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)
  grantFund.treasury = grantFund.treasury.minus(rewardsClaimed)
  grantFund.totalDelegationRewardsClaimed = grantFund.totalDelegationRewardsClaimed.plus(rewardsClaimed)

  delegateRewardClaimed.distribution = distributionId

  // save entities to the store
  grantFund.save()
  delegateRewardClaimed.save()
  distributionPeriod.save()
}

export function handleFundTreasury(event: FundTreasuryEvent): void {
  const fundTreasury = new FundTreasury(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  fundTreasury.amount = event.params.amount
  fundTreasury.treasuryBalance = event.params.treasuryBalance

  fundTreasury.blockNumber = event.block.number
  fundTreasury.blockTimestamp = event.block.timestamp
  fundTreasury.transactionHash = event.transaction.hash

  // update GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)
  // TODO: simply set this to treasuryBalance?
  grantFund.treasury = grantFund.treasury.plus(wadToDecimal(event.params.amount))

  // save entities to the store
  grantFund.save()
  fundTreasury.save()
}

export function handleFundedSlateUpdated(event: FundedSlateUpdatedEvent): void {
  const fundedSlateUpdated = new FundedSlateUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  fundedSlateUpdated.distributionId_ = event.params.distributionId
  fundedSlateUpdated.fundedSlateHash_ = event.params.fundedSlateHash

  fundedSlateUpdated.blockNumber = event.block.number
  fundedSlateUpdated.blockTimestamp = event.block.timestamp
  fundedSlateUpdated.transactionHash = event.transaction.hash

  // update DistributionPeriod entity
  const distributionId = bigIntToBytes(event.params.distributionId)
  const distributionPeriod = loadOrCreateDistributionPeriod(distributionId)
  distributionPeriod.topSlate = event.params.fundedSlateHash

  // create FundedSlate entity
  const fundedSlate = new FundedSlate(distributionId) as FundedSlate
  fundedSlate.distribution = distributionId
  fundedSlate.updateBlock = event.block.number

  // get the list of proposals in the slate
  const proposalsInSlate = getProposalsInSlate(fundedSlateUpdated.distributionId_)
  const proposals = fundedSlate.proposals
  for (let i = 0; i < proposalsInSlate.length; i++) {
    const proposalId = proposalsInSlate[i]
    proposals.push(bigIntToBytes(proposalId))
  }
  fundedSlate.proposals = proposals

  // save entities to the store
  distributionPeriod.save()
  fundedSlate.save()
  fundedSlateUpdated.save()
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  const proposalCreated = new ProposalCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
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

  // create Proposal entity
  const proposalId = bigIntToBytes(event.params.proposalId)
  const proposal = new Proposal(proposalId) as Proposal
  proposal.description  = event.params.description
  proposal.distribution = Bytes.empty()
  proposal.executed     = false
  proposal.successful   = false
  proposal.screeningVotesReceived = ZERO_BD
  proposal.fundingVotesReceived = ZERO_BD
  proposal.params = []

  let totalTokensRequested = ZERO_BD

  // create ProposalParams entities for each separate proposal param
  for (let i = 0; i < event.params.targets.length; i++) {
    const proposalParamsId = getProposalParamsId(proposalId, i)
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
    else {
      proposalParams.recipient = ZERO_ADDRESS
      proposalParams.tokensRequested = ZERO_BD
    }

    // add proposalParams information to proposal
    proposal.params = proposal.params.concat([proposalParams.id])
    proposal.totalTokensRequested = totalTokensRequested

    // save each proposalParams entity to the store
    proposalParams.save()
  }

  proposalCreated.proposal = proposal.id

  // load GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)

  // update distribution entity
  const distributionId = getCurrentDistributionId()
  const distributionPeriod = loadOrCreateDistributionPeriod(bigIntToBytes(distributionId))
  if (distributionPeriod != null) {
    distributionPeriod.proposals = distributionPeriod.proposals.concat([proposal.id])
    distributionPeriod.totalTokensRequested = distributionPeriod.totalTokensRequested.plus(proposal.totalTokensRequested)
    distributionPeriod.save()
  }

  // record proposals distributionId
  proposal.distribution = distributionPeriod.id

  // record proposal in GrantFund entity
  grantFund.standardProposals = grantFund.standardProposals.concat([proposal.id])

  // save entities to the store
  grantFund.save()
  distributionPeriod.save()
  proposal.save()
  proposalCreated.save()
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  const proposalExecuted = new ProposalExecuted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  proposalExecuted.proposalId = event.params.proposalId

  proposalExecuted.blockNumber = event.block.number
  proposalExecuted.blockTimestamp = event.block.timestamp
  proposalExecuted.transactionHash = event.transaction.hash

  // update proposal entity
  const proposal = Proposal.load(bigIntToBytes(event.params.proposalId)) as Proposal
  if (proposal != null) {
    proposal.executed = true
    proposal.successful = true

    // record proposal in GrantFund entity
    const grantFund = loadOrCreateGrantFund(event.address)
    grantFund.standardProposalsExecuted = grantFund.standardProposalsExecuted.concat([proposal.id])
    grantFund.standardProposals = removeProposalFromList(proposal.id, grantFund.standardProposals)

    // save entities to the store
    grantFund.save()
    proposal.save()
  }
  proposalExecuted.save()
}

export function handleDistributionPeriodStarted(
  event: DistributionPeriodStartedEvent
): void {
  const distributionStarted = new DistributionPeriodStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  const distributionId = bigIntToBytes(event.params.distributionId)
  distributionStarted.distribution = distributionId
  distributionStarted.startBlock = event.params.startBlock
  distributionStarted.endBlock = event.params.endBlock

  distributionStarted.blockNumber = event.block.number
  distributionStarted.blockTimestamp = event.block.timestamp
  distributionStarted.transactionHash = event.transaction.hash

  // create DistributionPeriod entities
  const distributionPeriod = new DistributionPeriod(distributionId) as DistributionPeriod

  distributionPeriod.startBlock = distributionStarted.startBlock
  distributionPeriod.endBlock = distributionStarted.endBlock
  distributionPeriod.topSlate = null
  distributionPeriod.delegationRewardsClaimed = ZERO_BD
  distributionPeriod.totalTokensRequested = ZERO_BD
  distributionPeriod.fundingVotesCast = ZERO_BD
  distributionPeriod.fundingVotePowerUsed = ZERO_BD
  distributionPeriod.screeningVotesCast = ZERO_BD
  distributionPeriod.proposals = []
  distributionPeriod.slatesSubmitted = []

  // update GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)
  grantFund.distributionPeriods = grantFund.distributionPeriods.concat([distributionPeriod.id])

  // save entities to store
  distributionPeriod.save()
  distributionStarted.save()
  grantFund.save()
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

  // load voter entity
  const voter = loadOrCreateVoter(addressToBytes(event.params.voter))

  // update proposal entity
  const proposalId = bigIntToBytes(event.params.proposalId)
  const proposal = Proposal.load(proposalId) as Proposal
  if (proposal != null) {
    // TODO: need to be able to access the distributionId at that block height or call getDistributionIdAtBlock()?
    // load distribution entity
    const distributionId = bigIntToBytes(getCurrentDistributionId())
    const distributionPeriod = DistributionPeriod.load(distributionId) as DistributionPeriod

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
        distributionPeriodVote.screeningStageVotingPower = getScreeningStageVotingPower(bytesToBigInt(distributionId), Address.fromBytes(voter.id))
      }

      // add additional screening votes to voter's distributionPeriodVote entity
      distributionPeriodVote.screeningVotes = distributionPeriodVote.screeningVotes.concat([screeningVote.id])

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
        distributionPeriodVote.fundingStageVotingPower = getFundingStageVotingPower(bytesToBigInt(distributionId), Address.fromBytes(voter.id))
      }

      // save fundingVote to the store
      fundingVote.save()
    }

    voter.distributionPeriodVotes = voter.distributionPeriodVotes.concat([distributionPeriodVote.id])

    // save entities to the store
    distributionPeriod.save()
    distributionPeriodVote.save()
    proposal.save()
  }

  // save entities to the store
  voteCast.save()
  voter.save()
}
