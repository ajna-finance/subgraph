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

export function setAllowances(entity: LPAllowances, indexes: Array<BigInt>, amounts: Array<BigInt>): void {
  let id = entity.id;
  for (var i=0; i<indexes.length; ++i) {
    const aid = getAllowanceId(id, indexes[i])
    let allowance = LPAllowance.load(aid)
    if (allowance == null) {
      allowance = new LPAllowance(aid)
      allowance.amount = wadToDecimal(amounts[i])
      entity.allowances.push(aid)
    } else {
      allowance.amount = wadToDecimal(amounts[i])
    }
  }
}

export function revokeAllowances(entity: LPAllowances, indexes: Array<BigInt>): void {
  let id = entity.id;
  for (var i=0; i<indexes.length; ++i) {
    const aid = getAllowanceId(id, indexes[i])
    const indexToRemove = entity.allowances.indexOf(aid)
    if (indexToRemove != -1)
      entity.allowances.splice(indexToRemove, 1)
  }
}