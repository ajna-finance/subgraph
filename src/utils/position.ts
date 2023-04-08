import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts"

import { Token } from "../../generated/schema"
import { ONE_BI, ZERO_BI, positionManagerNetworkLookUpTable } from "../utils/constants"
import { addressToBytes } from "../utils/convert"
import { getTokenName, getTokenSymbol } from "./token-erc721"
import { PositionManager } from "../../generated/PositionManager/PositionManager"

export function loadOrCreateLPToken(tokenAddress: Address): Token {
  const id = addressToBytes(tokenAddress)
  let token = Token.load(id)
  if (token == null) {
    // create new account if account hasn't already been stored
    token = new Token(id) as Token
    token.name        = getTokenName(tokenAddress)
    token.symbol      = getTokenSymbol(tokenAddress)
    token.txCount     = ZERO_BI
    token.isERC721    = true
    token.poolCount   = ONE_BI
  }

  return token
}

export function getPoolForToken(tokenId: BigInt): Address {
  const positionManagerAddress = positionManagerNetworkLookUpTable.get(dataSource.network())!
  const positionManagerContract = PositionManager.bind(positionManagerAddress);
  return positionManagerContract.poolKey(tokenId)
}