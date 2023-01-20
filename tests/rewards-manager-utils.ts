import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ClaimRewards,
  Stake,
  Unstake,
  UpdateExchangeRates
} from "../generated/RewardsManager/RewardsManager"

export function createClaimRewardsEvent(
  owner: Address,
  ajnaPool: Address,
  tokenId: BigInt,
  epochsClaimed: Array<BigInt>,
  amount: BigInt
): ClaimRewards {
  let claimRewardsEvent = changetype<ClaimRewards>(newMockEvent())

  claimRewardsEvent.parameters = new Array()

  claimRewardsEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  claimRewardsEvent.parameters.push(
    new ethereum.EventParam("ajnaPool", ethereum.Value.fromAddress(ajnaPool))
  )
  claimRewardsEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  claimRewardsEvent.parameters.push(
    new ethereum.EventParam(
      "epochsClaimed",
      ethereum.Value.fromUnsignedBigIntArray(epochsClaimed)
    )
  )
  claimRewardsEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return claimRewardsEvent
}

export function createStakeEvent(
  owner: Address,
  ajnaPool: Address,
  tokenId: BigInt
): Stake {
  let stakeEvent = changetype<Stake>(newMockEvent())

  stakeEvent.parameters = new Array()

  stakeEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  stakeEvent.parameters.push(
    new ethereum.EventParam("ajnaPool", ethereum.Value.fromAddress(ajnaPool))
  )
  stakeEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return stakeEvent
}

export function createUnstakeEvent(
  owner: Address,
  ajnaPool: Address,
  tokenId: BigInt
): Unstake {
  let unstakeEvent = changetype<Unstake>(newMockEvent())

  unstakeEvent.parameters = new Array()

  unstakeEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam("ajnaPool", ethereum.Value.fromAddress(ajnaPool))
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return unstakeEvent
}

export function createUpdateExchangeRatesEvent(
  caller: Address,
  ajnaPool: Address,
  indexesUpdated: Array<BigInt>,
  rewardsClaimed: BigInt
): UpdateExchangeRates {
  let updateExchangeRatesEvent = changetype<UpdateExchangeRates>(newMockEvent())

  updateExchangeRatesEvent.parameters = new Array()

  updateExchangeRatesEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  updateExchangeRatesEvent.parameters.push(
    new ethereum.EventParam("ajnaPool", ethereum.Value.fromAddress(ajnaPool))
  )
  updateExchangeRatesEvent.parameters.push(
    new ethereum.EventParam(
      "indexesUpdated",
      ethereum.Value.fromUnsignedBigIntArray(indexesUpdated)
    )
  )
  updateExchangeRatesEvent.parameters.push(
    new ethereum.EventParam(
      "rewardsClaimed",
      ethereum.Value.fromUnsignedBigInt(rewardsClaimed)
    )
  )

  return updateExchangeRatesEvent
}
