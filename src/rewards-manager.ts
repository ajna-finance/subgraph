import {
  ClaimRewards as ClaimRewardsEvent,
  Stake as StakeEvent,
  Unstake as UnstakeEvent,
  UpdateExchangeRates as UpdateExchangeRatesEvent
} from "../generated/RewardsManager/RewardsManager"
import {
  ClaimRewards,
  Stake,
  Unstake,
  UpdateExchangeRates
} from "../generated/schema"

export function handleClaimRewards(event: ClaimRewardsEvent): void {
  let entity = new ClaimRewards(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.ajnaPool = event.params.ajnaPool
  entity.tokenId = event.params.tokenId
  entity.epochsClaimed = event.params.epochsClaimed
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStake(event: StakeEvent): void {
  let entity = new Stake(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.ajnaPool = event.params.ajnaPool
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUnstake(event: UnstakeEvent): void {
  let entity = new Unstake(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.ajnaPool = event.params.ajnaPool
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateExchangeRates(
  event: UpdateExchangeRatesEvent
): void {
  let entity = new UpdateExchangeRates(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.caller = event.params.caller
  entity.ajnaPool = event.params.ajnaPool
  entity.indexesUpdated = event.params.indexesUpdated
  entity.rewardsClaimed = event.params.rewardsClaimed

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
