import { Address, Bytes } from "@graphprotocol/graph-ts"
import { PoolFactory, Token } from "../../../generated/schema"

import { ZERO_BI } from "../constants"

export function loadOrCreateFactory(address: Address, poolType: string): PoolFactory {
  let factory = PoolFactory.load(address)
  if (factory == null) {
    // create new account if account hasn't already been stored
    factory = new PoolFactory(address) as PoolFactory
    factory.poolType = poolType
    factory.poolCount = ZERO_BI
    factory.pools     = []
    factory.txCount   = ZERO_BI
  }

  return factory
}