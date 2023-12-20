import { Bytes } from "@graphprotocol/graph-ts"
import {
  DelegateChanged as DelegateChangedEvent,
  DelegateVotesChanged as DelegateVotesChangedEvent,
  AjnaTokenTransfer as AjnaTokenTransferEvent,
} from "../../generated/AjnaToken/AjnaToken"
import {
  Account,
  DelegateChanged,
  DelegateVotesChanged,
} from "../../generated/schema"
import { loadOrCreateAccount } from "../utils/account"
import { addressToBytes, wadToDecimal } from "../utils/convert"
import { addDelegator, removeDelegator } from "../utils/grants/voter"
import { getTokenBalance } from "../utils/token-erc20"

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
  entity.save()

  // update Account.delegatedTo to point to the new voting delegate
  const delegatorId = addressToBytes(event.params.delegator)
  const delegator = loadOrCreateAccount(delegatorId)
  const oldDelegateId = delegator.delegatedTo
  delegator.delegatedTo = addressToBytes(event.params.toDelegate)
  delegator.save()

  // if account was already delegating, remove Account.delegatedFrom on the old delegate
  if (oldDelegateId) {
    const oldDelegate = Account.load(oldDelegateId)
    if (oldDelegate != null) {
      removeDelegator(delegator, oldDelegate)
      oldDelegate.save()
    }
  }

  // update Account.delegatedFrom on the new delegate
  const delegate = loadOrCreateAccount(delegator.delegatedTo!)
  addDelegator(delegator, delegate)
  delegate.save()
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

export function handleAjnaTokenTransfer(
  event: AjnaTokenTransferEvent
): void {
  const ajnaToken = event.transaction.to!

  const fromAccount  = loadOrCreateAccount(addressToBytes(event.params.from))
  fromAccount.tokens = wadToDecimal(getTokenBalance(ajnaToken, event.params.from))
  fromAccount.save()

  const toAccount  = loadOrCreateAccount(addressToBytes(event.params.to))
  toAccount.tokens = wadToDecimal(getTokenBalance(ajnaToken, event.params.to))
  toAccount.save()
}