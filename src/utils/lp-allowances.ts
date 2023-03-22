import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { LPAllowance, LPAllowances } from "../../generated/schema";

export function getAllowanceId(poolId: Bytes, lenderId: Bytes, spenderId: Bytes): Bytes {
  return poolId.concat(Bytes.fromUTF8('|' + lenderId.toString() + '|' + spenderId.toString()))
}

export function loadOrCreateAllowances(poolId: Bytes, lenderId: Bytes, spenderId: Bytes): LPAllowances {
  let id = getAllowanceId(poolId, lenderId, spenderId)
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
  // TODO: create LPAllowance entities, iterate and add/update array
}

export function revokeAllowances(entity: LPAllowances, indexes: Array<BigInt>): void {
  // TODO: iterate and remove from array
}