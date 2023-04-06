import {
  ClaimRewards as ClaimRewardsEvent,
  MoveStakedLiquidity as MoveStakedLiquidityEvent,
  Stake as StakeEvent,
  Unstake as UnstakeEvent,
  UpdateExchangeRates as UpdateExchangeRatesEvent
} from "../generated/RewardsManager/RewardsManager"
import {
  ClaimRewards,
  MoveStakedLiquidity,
  Stake,
  Unstake,
  UpdateExchangeRates
} from "../generated/schema"
import { bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"

export function handleClaimRewards(event: ClaimRewardsEvent): void {
  let entity = new ClaimRewards(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.ajnaPool = event.params.ajnaPool
  entity.tokenId = event.params.tokenId
  entity.epochsClaimed = event.params.epochsClaimed
  entity.amount = wadToDecimal(event.params.amount)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMoveStakedLiquidity(event: MoveStakedLiquidityEvent): void {
  let entity = new MoveStakedLiquidity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.tokenId     = event.params.tokenId
  entity.fromIndexes = bigIntArrayToIntArray(event.params.fromIndexes)
  entity.toIndexes   = bigIntArrayToIntArray(event.params.toIndexes)

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
