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
  // TODO: iterate through, pushing each transfer if not already there
  // entity.transferors = entity.transferors.concat(transferorsApproved);
}

export function revokeTransferors(entity: LPTransferors, transferorsRevoked: Address[]): void {
  // TODO: iterate through, removing each transferor
  // const index = entity.transferors.indexOf(transferor)
  // if (index != -1)
  //   entity.transferors = entity.transferors.slice(index, 1)
}