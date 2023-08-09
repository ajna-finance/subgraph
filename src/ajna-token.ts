import {
  DelegateChanged as DelegateChangedEvent,
  DelegateVotesChanged as DelegateVotesChangedEvent,
} from "../generated/AjnaToken/AjnaToken"
import {
  DelegateChanged,
  DelegateVotesChanged,
} from "../generated/schema"
import { loadOrCreateAccount } from "./utils/account"
import { addressToBytes, bigIntToBytes, wadToDecimal } from "./utils/convert"

export function handleDelegateChanged(event: DelegateChangedEvent): void {
  let entity = new DelegateChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.delegator = event.params.delegator
  entity.fromDelegate = event.params.fromDelegate
  entity.toDelegate = event.params.toDelegate

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  // update Account.delegate to point to the new voting delegate
  const delegatorId = addressToBytes(event.params.delegator)
  const delegator = loadOrCreateAccount(delegatorId)
  delegator.delegate = addressToBytes(event.params.toDelegate)

  delegator.save()
  entity.save()
}

export function handleDelegateVotesChanged(
  event: DelegateVotesChangedEvent
): void {
  let entity = new DelegateVotesChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.delegate = event.params.delegate
  entity.previousBalance = wadToDecimal(event.params.previousBalance)
  entity.newBalance = wadToDecimal(event.params.newBalance)
  const changeInBalance = wadToDecimal(event.params.newBalance.minus(event.params.previousBalance))

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  const delegateId = addressToBytes(event.params.delegate)
  const delegate = loadOrCreateAccount(delegateId)
  delegate.tokensDelegated = delegate.tokensDelegated.plus(changeInBalance)

  delegate.save()
  entity.save()
}
