import { Address, BigInt, Bytes, dataSource, store } from "@graphprotocol/graph-ts"

import { Position, Token } from "../../generated/schema"
import { ONE_BI, ZERO_BI, positionManagerAddressTable } from "../utils/constants"
import { addressToBytes } from "../utils/convert"
import { getTokenName, getTokenSymbol } from "./token-erc721"
import { PositionManager } from "../../generated/PositionManager/PositionManager"
import { bigIntToBytes } from "../utils/convert"

export function loadOrCreateLPToken(tokenAddress: Address): Token {
  const id = addressToBytes(tokenAddress)
  let token = Token.load(id)
  if (token == null) {
    // create new token if token hasn't already been stored
    token = new Token(id) as Token
    token.name        = getTokenName(tokenAddress)
    token.decimals    = 0
    token.symbol      = getTokenSymbol(tokenAddress)
    token.txCount     = ZERO_BI
    token.isERC721    = true
    token.poolCount   = ONE_BI
    token.totalSupply = ONE_BI
  }

  return token
}

export function loadOrCreatePosition(tokenId: BigInt): Position {
  const byteTokenId = bigIntToBytes(tokenId)
  let position = Position.load(byteTokenId)
  if (position == null) {
    position = new Position(byteTokenId) as Position
    position.tokenId = tokenId
    position.indexes = []
    position.owner = Bytes.empty()
    position.pool = Bytes.empty()
    position.token = Bytes.empty()
  }
  return position
}

export function deletePosition(tokenId: BigInt): void {
  store.remove('Position', bigIntToBytes(tokenId).toHexString())
}

export function getPoolForToken(tokenId: BigInt): Address {
  const positionManagerAddress = positionManagerAddressTable.get(dataSource.network())!
  const positionManagerContract = PositionManager.bind(positionManagerAddress);
  return positionManagerContract.poolKey(tokenId)
}