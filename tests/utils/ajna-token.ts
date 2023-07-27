import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  AjnaTokenApproval,
  DelegateChanged,
  DelegateVotesChanged,
  AjnaTokenTransfer
} from "../../generated/AjnaToken/AjnaToken"

export function createDelegateChangedEvent(
  delegator: Address,
  fromDelegate: Address,
  toDelegate: Address
): DelegateChanged {
  let delegateChangedEvent = changetype<DelegateChanged>(newMockEvent())

  delegateChangedEvent.parameters = new Array()

  delegateChangedEvent.parameters.push(
    new ethereum.EventParam("delegator", ethereum.Value.fromAddress(delegator))
  )
  delegateChangedEvent.parameters.push(
    new ethereum.EventParam(
      "fromDelegate",
      ethereum.Value.fromAddress(fromDelegate)
    )
  )
  delegateChangedEvent.parameters.push(
    new ethereum.EventParam(
      "toDelegate",
      ethereum.Value.fromAddress(toDelegate)
    )
  )

  return delegateChangedEvent
}

export function createDelegateVotesChangedEvent(
  delegate: Address,
  previousBalance: BigInt,
  newBalance: BigInt
): DelegateVotesChanged {
  let delegateVotesChangedEvent = changetype<DelegateVotesChanged>(
    newMockEvent()
  )

  delegateVotesChangedEvent.parameters = new Array()

  delegateVotesChangedEvent.parameters.push(
    new ethereum.EventParam("delegate", ethereum.Value.fromAddress(delegate))
  )
  delegateVotesChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousBalance",
      ethereum.Value.fromUnsignedBigInt(previousBalance)
    )
  )
  delegateVotesChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newBalance",
      ethereum.Value.fromUnsignedBigInt(newBalance)
    )
  )

  return delegateVotesChangedEvent
}
