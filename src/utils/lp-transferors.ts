import { Address, Bytes } from "@graphprotocol/graph-ts"
import { LPTransferors, Pool } from "../../generated/schema";

export function getTransferorId(poolId: Bytes, lenderId: Bytes): Bytes {
  return poolId.concat(Bytes.fromUTF8('|' + lenderId.toString()));
}

export function loadOrCreateTransferors(poolId: Bytes, lenderId: Bytes): LPTransferors {
  let id = getTransferorId(poolId, lenderId)
  let entity = LPTransferors.load(id)
  if (entity == null) {
    entity = new LPTransferors(id) as LPTransferors
    entity.pool = poolId
    entity.lender = lenderId
    entity.transferors = []
  }
  return entity;
}

export function approveTransferors(entity: LPTransferors, transferorsApproved: Address[]): void {
  // iterate through newly-approved transferors, pushing each transfer if not already there
  for (var i=0; i<transferorsApproved.length; ++i) {
    const approved = transferorsApproved[i]
    if (entity.transferors.indexOf(approved) == -1)
      entity.transferors.push(approved)
  }
}

export function revokeTransferors(entity: LPTransferors, transferorsRevoked: Address[]): void {
  // iterate through, removing each revoked transferor
  for (var i=0; i<transferorsRevoked.length; ++i) {
    const revoked = transferorsRevoked[i]
    const indexToRemove = entity.transferors.indexOf(revoked)
    if (indexToRemove != -1)
      entity.transferors.splice(indexToRemove, 1)
  }
}