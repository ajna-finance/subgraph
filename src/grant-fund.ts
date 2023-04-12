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
  FundTreasury,
  FundedSlateUpdated,
  Proposal,
  ProposalCreated,
  ProposalExecuted,
  ProposalParams,
  QuarterlyDistributionStarted,
  VoteCast
} from "../generated/schema"

import { ZERO_BD } from './utils/constants'
import { addressArrayToBytesArray, bigIntToBytes } from "./utils/convert"
import { getMechanismOfProposal, getProposalParamsId } from './utils/grants/proposal'
import { getCurrentDistributionId } from './utils/grants/distribution'

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
  let entity = new VoteCast(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.voter = event.params.voter
  entity.proposalId = event.params.proposalId
  entity.support = event.params.support
  entity.weight = event.params.weight
  entity.reason = event.params.reason

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
