import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  DelegateRewardClaimed,
  FundTreasury,
  FundedSlateUpdated,
  ProposalCreated,
  ProposalExecuted,
  DistributionPeriodStarted,
  VoteCast
} from "../../generated/GrantFund/GrantFund"

export function createDelegateRewardClaimedEvent(
  delegateeAddress_: Address,
  distributionId_: BigInt,
  rewardClaimed_: BigInt
): DelegateRewardClaimed {
  let delegateRewardClaimedEvent = changetype<DelegateRewardClaimed>(
    newMockEvent()
  )

  delegateRewardClaimedEvent.parameters = new Array()

  delegateRewardClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "delegateeAddress_",
      ethereum.Value.fromAddress(delegateeAddress_)
    )
  )
  delegateRewardClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "distributionId_",
      ethereum.Value.fromUnsignedBigInt(distributionId_)
    )
  )
  delegateRewardClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardClaimed_",
      ethereum.Value.fromUnsignedBigInt(rewardClaimed_)
    )
  )

  return delegateRewardClaimedEvent
}

export function createFundTreasuryEvent(
  amount: BigInt,
  treasuryBalance: BigInt
): FundTreasury {
  let fundTreasuryEvent = changetype<FundTreasury>(newMockEvent())

  fundTreasuryEvent.parameters = new Array()

  fundTreasuryEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  fundTreasuryEvent.parameters.push(
    new ethereum.EventParam(
      "treasuryBalance",
      ethereum.Value.fromUnsignedBigInt(treasuryBalance)
    )
  )

  return fundTreasuryEvent
}

export function createFundedSlateUpdatedEvent(
  distributionId_: BigInt,
  fundedSlateHash_: Bytes
): FundedSlateUpdated {
  let fundedSlateUpdatedEvent = changetype<FundedSlateUpdated>(newMockEvent())

  fundedSlateUpdatedEvent.parameters = new Array()

  fundedSlateUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "distributionId_",
      ethereum.Value.fromUnsignedBigInt(distributionId_)
    )
  )
  fundedSlateUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "fundedSlateHash_",
      ethereum.Value.fromFixedBytes(fundedSlateHash_)
    )
  )

  return fundedSlateUpdatedEvent
}

export function createProposalCreatedEvent(
  proposalId: BigInt,
  proposer: Address,
  targets: Array<Address>,
  values: Array<BigInt>,
  signatures: Array<string>,
  calldatas: Array<Bytes>,
  startBlock: BigInt,
  endBlock: BigInt,
  description: string
): ProposalCreated {
  let proposalCreatedEvent = changetype<ProposalCreated>(newMockEvent())

  proposalCreatedEvent.parameters = new Array()

  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam("proposer", ethereum.Value.fromAddress(proposer))
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam("targets", ethereum.Value.fromAddressArray(targets))
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "values",
      ethereum.Value.fromUnsignedBigIntArray(values)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "signatures",
      ethereum.Value.fromStringArray(signatures)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "calldatas",
      ethereum.Value.fromBytesArray(calldatas)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "startBlock",
      ethereum.Value.fromUnsignedBigInt(startBlock)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "endBlock",
      ethereum.Value.fromUnsignedBigInt(endBlock)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "description",
      ethereum.Value.fromString(description)
    )
  )

  return proposalCreatedEvent
}

export function createProposalExecutedEvent(
  proposalId: BigInt
): ProposalExecuted {
  let proposalExecutedEvent = changetype<ProposalExecuted>(newMockEvent())

  proposalExecutedEvent.parameters = new Array()

  proposalExecutedEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )

  return proposalExecutedEvent
}

export function createDistributionPeriodStartedEvent(
  distributionId_: BigInt,
  startBlock_: BigInt,
  endBlock_: BigInt
): DistributionPeriodStarted {
  let DistributionPeriodStartedEvent = changetype<
    DistributionPeriodStarted
  >(newMockEvent())

  DistributionPeriodStartedEvent.parameters = new Array()

  DistributionPeriodStartedEvent.parameters.push(
    new ethereum.EventParam(
      "distributionId_",
      ethereum.Value.fromUnsignedBigInt(distributionId_)
    )
  )
  DistributionPeriodStartedEvent.parameters.push(
    new ethereum.EventParam(
      "startBlock_",
      ethereum.Value.fromUnsignedBigInt(startBlock_)
    )
  )
  DistributionPeriodStartedEvent.parameters.push(
    new ethereum.EventParam(
      "endBlock_",
      ethereum.Value.fromUnsignedBigInt(endBlock_)
    )
  )

  return DistributionPeriodStartedEvent
}

export function createVoteCastEvent(
  voter: Address,
  proposalId: BigInt,
  support: i32,
  weight: BigInt,
  reason: string,
  blockNumber: BigInt
): VoteCast {
  let voteCastEvent = changetype<VoteCast>(newMockEvent())

  voteCastEvent.parameters = new Array()

  voteCastEvent.parameters.push(
    new ethereum.EventParam("voter", ethereum.Value.fromAddress(voter))
  )
  voteCastEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )
  voteCastEvent.parameters.push(
    new ethereum.EventParam(
      "support",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(support))
    )
  )
  voteCastEvent.parameters.push(
    new ethereum.EventParam("weight", ethereum.Value.fromUnsignedBigInt(weight))
  )
  voteCastEvent.parameters.push(
    new ethereum.EventParam("reason", ethereum.Value.fromString(reason))
  )

  voteCastEvent.block.number = blockNumber

  return voteCastEvent
}
