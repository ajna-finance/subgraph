import { Address, BigInt, Bytes, dataSource, store } from "@graphprotocol/graph-ts"

import { Bucket, Position, PositionLend, Token } from "../../generated/schema"
import { ONE_BI, ZERO_BD, ZERO_BI, positionManagerAddressTable } from "../utils/constants"
import { addressToBytes } from "../utils/convert"
import { getTokenName, getTokenSymbol, getTokenURI } from "./token-erc721"
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
    token.tokenType   = "ERC721"
    token.poolCount   = ONE_BI
    token.totalSupply = ONE_BI
  }

  return token
}

// TODO: associate this with LPToken
export function loadOrCreatePosition(tokenId: BigInt): Position {
  const byteTokenId = bigIntToBytes(tokenId)
  const positionManagerAddress = positionManagerAddressTable.get(dataSource.network())!
  let position = Position.load(byteTokenId)
  if (position == null) {
    position = new Position(byteTokenId) as Position
    position.tokenId = tokenId
    position.indexes = []
    position.owner = Bytes.empty()
    position.pool = Bytes.empty()
    position.token = addressToBytes(positionManagerAddress)
    position.tokenURI = getTokenURI(positionManagerAddress, tokenId)
  }
  return position
}

export function getPositionLendId(tokenId: BigInt, bucketIndex: BigInt): Bytes {
  return bigIntToBytes(tokenId).concat(bigIntToBytes(bucketIndex))
}

export function loadOrCreatePositionLend(positionLendId: Bytes, bucketId: Bytes, bucketIndex: u32): PositionLend {
  let positionLend = PositionLend.load(positionLendId)
  if (positionLend == null) {
    positionLend = new PositionLend(positionLendId) as PositionLend
    positionLend.bucket = bucketId
    positionLend.bucketIndex = bucketIndex
    positionLend.lpb = ZERO_BD
    positionLend.lpbValueInQuote = ZERO_BD
  }
  return positionLend
}

export function deletePosition(tokenId: BigInt): void {
  store.remove('Position', bigIntToBytes(tokenId).toHexString())
}

export function getPoolForToken(tokenId: BigInt): Address {
  const positionManagerAddress = positionManagerAddressTable.get(dataSource.network())!
  const positionManagerContract = PositionManager.bind(positionManagerAddress);
  return positionManagerContract.poolKey(tokenId)
}