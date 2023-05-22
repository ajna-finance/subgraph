import { Address, Bytes } from "@graphprotocol/graph-ts"
import { LPTransferorList, Pool } from "../../generated/schema";

export function getTransferorId(poolId: Bytes, lenderId: Bytes): Bytes {
  return poolId.concat(Bytes.fromUTF8('|' + lenderId.toString()));
}

export function loadOrCreateTransferors(poolId: Bytes, lenderId: Bytes): LPTransferorList {
  let id = getTransferorId(poolId, lenderId)
  let entity = LPTransferorList.load(id)
  if (entity == null) {
    entity = new LPTransferorList(id) as LPTransferorList
    entity.pool = poolId
    entity.lender = lenderId
    entity.transferors = []
  }
  return entity;
}

export function approveTransferors(entity: LPTransferorList, transferorsApproved: Address[]): void {
  // iterate through newly-approved transferors, pushing each transfer if not already there
  const entityTransferors = entity.transferors
  for (var i=0; i<transferorsApproved.length; ++i) {
    const approved = transferorsApproved[i]
    if (entityTransferors.indexOf(approved) == -1)
      entityTransferors.push(approved)
  }
  entity.transferors = entityTransferors
}

export function revokeTransferors(entity: LPTransferorList, transferorsRevoked: Address[]): void {
  // iterate through, removing each revoked transferor
  const entityTransferors = entity.transferors
  for (var i=0; i<transferorsRevoked.length; ++i) {
    const revoked = transferorsRevoked[i]
    const indexToRemove = entityTransferors.indexOf(revoked)
    if (indexToRemove != -1)
      entityTransferors.splice(indexToRemove, 1)
  }
  entity.transferors = entityTransferors
}