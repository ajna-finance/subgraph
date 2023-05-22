import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { LPAllowance, LPAllowances } from "../../generated/schema";
import { wadToDecimal } from "./convert";

export function getAllowancesId(poolId: Bytes, lenderId: Bytes, spenderId: Bytes): Bytes {
  return poolId.concat(Bytes.fromUTF8('|' + lenderId.toString() + '|' + spenderId.toString()))
}

export function getAllowanceId(allowancesId: Bytes, index: BigInt): Bytes {
  return allowancesId.concat(Bytes.fromUTF8('|' + index.toString()))
}

export function loadOrCreateAllowances(poolId: Bytes, lenderId: Bytes, spenderId: Bytes): LPAllowances {
  let id = getAllowancesId(poolId, lenderId, spenderId)
  let entity = LPAllowances.load(id)
  if (entity == null) {
    entity = new LPAllowances(id) as LPAllowances
    entity.pool = poolId
    entity.lender = lenderId
    entity.spender = spenderId
    entity.allowances = []
  }
  return entity;
}

export function increaseAllowances(entity: LPAllowances, indexes: Array<BigInt>, amounts: Array<BigInt>): void {
  const id = entity.id;
  const entityAllowances = entity.allowances;
  for (var i=0; i<indexes.length; ++i) {
    const aid = getAllowanceId(id, indexes[i])
    let allowance = LPAllowance.load(aid)
    if (allowance == null) {
      // create a new allowance if first time
      allowance = new LPAllowance(aid)
      allowance.amount = wadToDecimal(amounts[i])
      entityAllowances.push(aid)
    } else {
      // increase existing allowance
      allowance.amount = allowance.amount.plus(wadToDecimal(amounts[i]))
    }
  }
  entity.allowances = entityAllowances
}

export function decreaseAllowances(entity: LPAllowances, indexes: Array<BigInt>, amounts: Array<BigInt>): void {
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
      } else {
        // delete the allowance
        const indexToRemove = entityAllowances.indexOf(aid)
        if (indexToRemove != -1)
          entityAllowances.splice(indexToRemove, 1)
      }
    }
  }
  entity.allowances = entityAllowances
}

export function revokeAllowances(entity: LPAllowances, indexes: Array<BigInt>): void {
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
    }
  }
  entity.allowances = entityAllowances
}