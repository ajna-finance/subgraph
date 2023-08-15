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
  VoteCast,
  DistributionPeriodVote
} from "../generated/schema"

import { NEG_ONE_BD, THREE_PERCENT_BI, ZERO_BD, ZERO_BI } from './utils/constants'
import { addressArrayToBytesArray, addressToBytes, bigIntArrayToBigDecimalArray, bigIntToBytes, bytesToBigInt, wadToDecimal } from "./utils/convert"
import { getProposalParamsId, getProposalsInSlate, loadOrCreateProposal } from './utils/grants/proposal'
import { getCurrentDistributionId, getCurrentStage, loadOrCreateDistributionPeriod } from './utils/grants/distribution'
import { getFundingStageVotingPower, getFundingVoteId, getFundingVotingPowerUsed, getScreeningVoteId, loadOrCreateDistributionPeriodVote, loadOrCreateFundingVote, loadOrCreateScreeningVote } from './utils/grants/voter'
import { getTreasury, loadOrCreateGrantFund } from './utils/grants/fund'
import { loadOrCreateAccount } from './utils/account'
import { wmul } from './utils/math'

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
  const distributionId = getCurrentDistributionId(event.address)
  const distributionPeriod = loadOrCreateDistributionPeriod(distributionId)
  distributionPeriod.delegationRewardsClaimed = distributionPeriod.delegationRewardsClaimed.plus(rewardsClaimed)

  // update GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)
  grantFund.treasury = grantFund.treasury.minus(rewardsClaimed)
  grantFund.totalDelegationRewardsClaimed = grantFund.totalDelegationRewardsClaimed.plus(rewardsClaimed)

  delegateRewardClaimed.distribution = distributionPeriod.id

  // update Account entity
  const accountId = addressToBytes(event.params.delegateeAddress)
  const account   = loadOrCreateAccount(accountId)
  account.rewardsClaimed = account.rewardsClaimed.plus(rewardsClaimed)

  // save entities to the store
  grantFund.save()
  delegateRewardClaimed.save()
  distributionPeriod.save()
  account.save()
}

export function handleFundTreasury(event: FundTreasuryEvent): void {
  const fundTreasury = new FundTreasury(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  fundTreasury.amount = event.params.amount
  fundTreasury.treasuryBalance = wadToDecimal(event.params.treasuryBalance)

  fundTreasury.blockNumber = event.block.number
  fundTreasury.blockTimestamp = event.block.timestamp
  fundTreasury.transactionHash = event.transaction.hash

  // update GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)
  grantFund.treasury = wadToDecimal(getTreasury(event.address))

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
  const distributionPeriod = loadOrCreateDistributionPeriod(event.params.distributionId)
  distributionPeriod.topSlate = event.params.fundedSlateHash

  // create FundedSlate entity
  const fundedSlate = new FundedSlate(fundedSlateUpdated.fundedSlateHash_) as FundedSlate
  fundedSlate.distribution = distributionPeriod.id
  fundedSlate.updateBlock = event.block.number

  // get the list of proposals in the slate
  const proposalsInSlate = getProposalsInSlate(event.address, fundedSlateUpdated.fundedSlateHash_)
  const proposals: Bytes[] = []
  let totalTokensRequested = ZERO_BD
  let totalFundingVotesReceived = ZERO_BD

  for (let i = 0; i < proposalsInSlate.length; i++) {
    const proposalId = proposalsInSlate[i]
    const proposal = loadOrCreateProposal(proposalId)

    totalTokensRequested = totalTokensRequested.plus(proposal.totalTokensRequested)
    totalFundingVotesReceived = totalFundingVotesReceived.plus(proposal.fundingVotesReceived)

    // add proposal information to fundedSlate
    proposals.push(bigIntToBytes(proposalId))
  }

  // record proposal information in fundedSlate entity
  fundedSlate.totalTokensRequested = totalTokensRequested
  fundedSlate.totalFundingVotesReceived = totalFundingVotesReceived
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
  proposalCreated.values      = bigIntArrayToBigDecimalArray(event.params.values)
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
  const proposal = loadOrCreateProposal(event.params.proposalId)
  proposal.description  = event.params.description

  let totalTokensRequested = ZERO_BI

  // create ProposalParams entities for each separate proposal param
  for (let i = 0; i < event.params.targets.length; i++) {
    const proposalParamsId = getProposalParamsId(proposalId, i)
    const proposalParams = new ProposalParams(proposalParamsId) as ProposalParams
    proposalParams.target = event.params.targets[i]
    proposalParams.value = event.params.values[i]
    proposalParams.calldata = event.params.calldatas[i]

    // LINKS TO GRAPH DISCORD MESSAGES WITH SOLUTION TO DECODING CALLDATA:
    // https://discord.com/channels/438038660412342282/438070183794573313/948230275886878740
    // https://discord.com/channels/438038660412342282/438070183794573313/948241208277364756
    // decode the calldata to get the recipient and tokens requested
    const dataWithoutSelector = Bytes.fromUint8Array(proposalParams.calldata.subarray(4))
    const decoded = ethereum.decode('(address,uint256)', dataWithoutSelector)!
    proposalParams.recipient = decoded.toTuple()[0].toAddress()
    const tokensRequested = decoded.toTuple()[1].toBigInt()
    proposalParams.tokensRequested = wadToDecimal(tokensRequested)
    totalTokensRequested = totalTokensRequested.plus(tokensRequested)

    // add proposalParams information to proposal
    proposal.params = proposal.params.concat([proposalParams.id])

    // save each proposalParams entity to the store
    proposalParams.save()
  }

  proposal.totalTokensRequested = wadToDecimal(totalTokensRequested)

  proposalCreated.proposal = proposal.id

  // update distribution entity
  const distributionId = bigIntToBytes(getCurrentDistributionId(event.address))
  const distributionPeriod = DistributionPeriod.load(distributionId)!
  distributionPeriod.proposals = distributionPeriod.proposals.concat([proposal.id])

  // record proposals distributionId
  proposal.distribution = distributionPeriod.id

  // save entities to the store
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
  const proposal = loadOrCreateProposal(event.params.proposalId)
  proposal.executed = true

  const distributionPeriod = DistributionPeriod.load(proposal.distribution!)!
  distributionPeriod.totalTokensDistributed = distributionPeriod.totalTokensDistributed.plus(proposal.totalTokensRequested)

  // save entities to the store
  distributionPeriod.save()
  proposal.save()
  proposalExecuted.save()
}

export function handleDistributionPeriodStarted(
  event: DistributionPeriodStartedEvent
): void {
  const distributionStarted = new DistributionPeriodStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  distributionStarted.distribution = bigIntToBytes(event.params.distributionId)
  distributionStarted.startBlock = event.params.startBlock
  distributionStarted.endBlock = event.params.endBlock

  distributionStarted.blockNumber = event.block.number
  distributionStarted.blockTimestamp = event.block.timestamp
  distributionStarted.transactionHash = event.transaction.hash

  // create DistributionPeriod entities
  const distributionPeriod = loadOrCreateDistributionPeriod(event.params.distributionId)
  distributionPeriod.startBlock = distributionStarted.startBlock
  distributionPeriod.endBlock = distributionStarted.endBlock

  // update GrantFund entity
  const grantFund = loadOrCreateGrantFund(event.address)
  const treasury = getTreasury(event.address)
  grantFund.distributionPeriods = grantFund.distributionPeriods.concat([distributionPeriod.id])
  grantFund.treasury = wadToDecimal(treasury)

  distributionPeriod.fundsAvailable = wadToDecimal(wmul(treasury, THREE_PERCENT_BI))

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
  voteCast.weight = wadToDecimal(event.params.weight)
  voteCast.reason = event.params.reason

  voteCast.blockNumber = event.block.number
  voteCast.blockTimestamp = event.block.timestamp
  voteCast.transactionHash = event.transaction.hash

  // load voter entity
  const voter = loadOrCreateAccount(addressToBytes(event.params.voter))

  // update proposal entity
  const proposalId = bigIntToBytes(event.params.proposalId)
  const proposal = Proposal.load(proposalId) as Proposal
  if (proposal != null) {
    // load distribution entity using the distributionId from the proposal
    const distributionId = proposal.distribution!
    const distributionPeriod = DistributionPeriod.load(distributionId) as DistributionPeriod

    // load voter's distributionPeriodVotes
    const distributionPeriodVote = loadOrCreateDistributionPeriodVote(distributionPeriod.distributionId, voter.id)

    // check stage of proposal
    const stage = getCurrentStage(voteCast.blockNumber, distributionPeriod)

    // proposal is in screening stage
    if (stage === "SCREENING") {
      const screeningVotesCast = wadToDecimal(event.params.weight)
      proposal.screeningVotesReceived = proposal.screeningVotesReceived.plus(screeningVotesCast)
      distributionPeriod.screeningVotesCast = distributionPeriod.screeningVotesCast.plus(event.params.weight.toBigDecimal())

      // create ScreeningVote entity
      const screeningVote = loadOrCreateScreeningVote(getScreeningVoteId(proposalId, voter.id, distributionId))

      screeningVote.distribution = distributionId
      screeningVote.voter = voter.id
      screeningVote.proposal = proposalId
      screeningVote.totalVotesCast = screeningVote.totalVotesCast.plus(screeningVotesCast)

      // add additional screening votes to voter's distributionPeriodVote entity
      distributionPeriodVote.screeningVotes = distributionPeriodVote.screeningVotes.concat([screeningVote.id])

      // associate the VoteCast entity with the ScreeningVote
      screeningVote.votesCast.push(voteCast.id)

      // save screeningVote to the store
      screeningVote.save()
    }
    else if (stage === "FUNDING") {
      // create FundingVote entity
      const fundingVote = loadOrCreateFundingVote(getFundingVoteId(proposalId, voter.id, distributionId))

      fundingVote.distribution = distributionId
      fundingVote.voter = voter.id
      fundingVote.proposal = proposalId
      if (event.params.support == 1)
        fundingVote.totalVotesCast = fundingVote.totalVotesCast.plus(voteCast.weight)
      else
        fundingVote.totalVotesCast = fundingVote.totalVotesCast.minus(voteCast.weight)

      // save initial fundingVote information to enable usage in calculation of votingPowerUsed
      fundingVote.save()

      // add additional funding votes to voter's distributionPeriodVote entity
      distributionPeriodVote.fundingVotes = distributionPeriodVote.fundingVotes.concat([fundingVote.id])

      // calculate and record the voting power cost of this funding vote
      fundingVote.votingPowerUsed = fundingVote.votingPowerUsed.plus(getFundingVotingPowerUsed(fundingVote));
      distributionPeriod.fundingVotePowerUsed = distributionPeriod.fundingVotePowerUsed.plus(fundingVote.votingPowerUsed)

      // update voter's distributionPeriodVote entity voting power tracking if it hasn't been recorded yet
      if (distributionPeriodVote.estimatedInitialFundingStageVotingPowerForCalculatingRewards.equals(ZERO_BD)) {
        distributionPeriodVote.estimatedInitialFundingStageVotingPowerForCalculatingRewards = getFundingStageVotingPower(event.address, bytesToBigInt(distributionId), Address.fromBytes(voter.id))
        distributionPeriodVote.estimatedRemainingFundingStageVotingPowerForCalculatingRewards = distributionPeriodVote.estimatedInitialFundingStageVotingPowerForCalculatingRewards.minus(fundingVote.votingPowerUsed)
      }
      else {
        distributionPeriodVote.estimatedRemainingFundingStageVotingPowerForCalculatingRewards = getFundingStageVotingPower(event.address, bytesToBigInt(distributionId), Address.fromBytes(voter.id))
      }

      // record votes cast on the Proposal entity
      if (fundingVote.totalVotesCast > ZERO_BD) {
        proposal.fundingVotesReceived = proposal.fundingVotesReceived.plus(voteCast.weight)
        proposal.fundingVotesPositive = proposal.fundingVotesPositive.plus(voteCast.weight)
      } else {
        proposal.fundingVotesReceived = proposal.fundingVotesReceived.minus(voteCast.weight)
        proposal.fundingVotesNegative = proposal.fundingVotesNegative.minus(voteCast.weight)
      }

      // associate the VoteCast entity with the FundingVote
      fundingVote.votesCast.push(voteCast.id)

      // save fundingVote to the store
      fundingVote.save()
    }

    // check if the account has already voted in this distribution period
    if (!voter.distributionPeriodVotes.includes(distributionPeriodVote.id)) {
        // associate the distributionPeriodVote entity with the voter
      voter.distributionPeriodVotes = voter.distributionPeriodVotes.concat([distributionPeriodVote.id])
    }

    // save entities to the store
    distributionPeriod.save()
    distributionPeriodVote.save()
    proposal.save()
  }

  // save entities to the store
  voteCast.save()
  voter.save()
}
