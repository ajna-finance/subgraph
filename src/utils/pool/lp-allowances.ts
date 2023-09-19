import { BigInt, Bytes, store } from "@graphprotocol/graph-ts"
import { LPAllowance, LPAllowanceList } from "../../../generated/schema";
import { wadToDecimal } from "../convert";

export function getAllowancesId(poolId: Bytes, lenderId: Bytes, spenderId: Bytes): Bytes {
  return poolId.concat(Bytes.fromUTF8('|' + lenderId.toString() + '|' + spenderId.toString()))
}

export function getAllowanceId(allowancesId: Bytes, index: BigInt): Bytes {
  return allowancesId.concat(Bytes.fromUTF8('|' + index.toString()))
}

export function loadOrCreateAllowances(poolId: Bytes, lenderId: Bytes, spenderId: Bytes): LPAllowanceList {
  let id = getAllowancesId(poolId, lenderId, spenderId)
  let entity = LPAllowanceList.load(id)
  if (entity == null) {
    entity = new LPAllowanceList(id) as LPAllowanceList
    entity.pool = poolId
    entity.lender = lenderId
    entity.spender = spenderId
    entity.allowances = []
  }
  return entity;
}

export function increaseAllowances(entity: LPAllowanceList, indexes: Array<BigInt>, amounts: Array<BigInt>): void {
  const id = entity.id;
  const entityAllowances = entity.allowances;
  for (var i=0; i<indexes.length; ++i) {
    const index = indexes[i]
    const aid = getAllowanceId(id, index)
    let allowance = LPAllowance.load(aid)
    if (allowance == null) {
      // create a new allowance if first time
      allowance = new LPAllowance(aid)
      allowance.amount = wadToDecimal(amounts[i])
      allowance.index = index.toI32()
      entityAllowances.push(aid)
    } else {
      // increase existing allowance
      allowance.amount = allowance.amount.plus(wadToDecimal(amounts[i]))
    }
    allowance.save()
  }
  entity.allowances = entityAllowances
}

export function decreaseAllowances(entity: LPAllowanceList, indexes: Array<BigInt>, amounts: Array<BigInt>): void {
  const id = entity.id;
  const entityAllowances = entity.allowances;
  for (var i=0; i<indexes.length; ++i) {
    const aid = getAllowanceId(id, indexes[i])
    const allowance = LPAllowance.load(aid)
    if (allowance != null) {
      const decrease = wadToDecimal(amounts[i])
      if (decrease.lt(allowance.amount)) {
          // decrease existing allowance
        allowance.amount = allowance.amount.minus(decrease)
        allowance.save()
      } else {
        // delete the allowance
        const indexToRemove = entityAllowances.indexOf(aid)
        if (indexToRemove != -1)
          entityAllowances.splice(indexToRemove, 1)

        // remove allowance from the store
        store.remove('LPAllowance', aid.toHexString())
      }
    }
  }
  entity.allowances = entityAllowances
}

export function revokeAllowances(entity: LPAllowanceList, indexes: Array<BigInt>): void {
  const id = entity.id;
  const entityAllowances = entity.allowances;
  for (var i=0; i<indexes.length; ++i) {
    const aid = getAllowanceId(id, indexes[i])
    const allowance = LPAllowance.load(aid)
    if (allowance != null) {
      // delete the allowance
      const indexToRemove = entityAllowances.indexOf(aid)
      if (indexToRemove != -1)
        entityAllowances.splice(indexToRemove, 1)

      // remove allowance from the store
      store.remove('LPAllowance', aid.toHexString())
    }
  }
  entity.allowances = entityAllowances
}

export function saveOrRemoveAllowances(entity: LPAllowanceList): void {
  if (entity.allowances.length == 0) {
    store.remove('LPAllowanceList', entity.id.toHexString())
  } else {
    entity.save()
  }
}

export function saveOrRemoveTranserors(entity: LPTransferorList): void {
  if (entity.transferors.length == 0) {
    store.remove('LPTransferorList', entity.id.toHexString())
  } else {
    entity.save()
  }
}