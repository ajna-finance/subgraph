import { Address, BigInt, Bytes, dataSource, log, store } from "@graphprotocol/graph-ts"

import { Bucket, Position, PositionLend, Token } from "../../generated/schema"
import { ONE_BI, ZERO_BD, ZERO_BI, positionManagerAddressTable } from "../utils/constants"
import { addressToBytes } from "../utils/convert"
import { getTokenName, getTokenSymbol, getTokenURI } from "./token-erc721"
import { PositionManager } from "../../generated/PositionManager/PositionManager"
import { bigIntToBytes } from "../utils/convert"

/*****************************/
/*** Constructor Functions ***/
/*****************************/

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

export function loadOrCreatePositionLend(tokenId: BigInt, bucketId: Bytes, bucketIndex: u32): PositionLend {
  const positionLendId = getPositionLendId(tokenId, BigInt.fromI32(bucketIndex))
  let positionLend = PositionLend.load(positionLendId)
  if (positionLend == null) {
    positionLend = new PositionLend(positionLendId) as PositionLend
    positionLend.bucket = bucketId
    positionLend.bucketIndex = bucketIndex
    positionLend.lpb = ZERO_BD
    positionLend.lpbValueInQuote = ZERO_BD
    positionLend.tokenId = tokenId
  }
  return positionLend
}

export function deletePosition(tokenId: BigInt): void {
  store.remove('Position', bigIntToBytes(tokenId).toHexString())
}

export function updatePositionLends(positionLend: PositionLend): void {
  // add positionLend to bucket array if necessary
  const bucket = Bucket.load(positionLend.bucket)
  if (bucket != null) {
    const existingBucketIndex = bucket.positionLends.indexOf(positionLend.id)
    if (existingBucketIndex != -1) {
      bucket.positionLends = bucket.positionLends.concat([positionLend.id])
    }
  }

  // add positionLend to position array if necessary
  const position = Position.load(bigIntToBytes(positionLend.tokenId))!
  const existingPositionIndex = position.indexes.indexOf(positionLend.id)
  if (existingPositionIndex != -1) {
    position.indexes = position.indexes.concat([positionLend.id])
  }
}

// if necessary
// remove association between PositionLend and Position and Buckets
// remove from store
export function saveOrRemovePositionLend(positionLend: PositionLend): void {
  if (positionLend.lpb.equals(ZERO_BD)) {
    // remove positionLend from bucket array
    const bucket = Bucket.load(positionLend.bucket)
    if (bucket != null) {
      const existingBucketIndex = bucket.positionLends.indexOf(positionLend.id)
      const bucketPositionLends = bucket.positionLends
      if (existingBucketIndex != -1) {
        bucketPositionLends.splice(existingBucketIndex, 1)
      }
      bucket.positionLends = bucketPositionLends
      bucket.save()
    } else {
      log.warning("Bucket {} was not found", [positionLend.bucket.toHexString()])
    }

    // remove positionLend from account array
    const position = Position.load(bigIntToBytes(positionLend.tokenId))!
    const existingPositionIndex = position.indexes.indexOf(positionLend.id)
    const positionIndexes = position.indexes
    if (existingPositionIndex != -1) {
      positionIndexes.splice(existingPositionIndex, 1)
    }
    position.indexes = positionIndexes

    // remove positionLend from store
    store.remove('PositionLend', positionLend.id.toHexString())
  } else {
    positionLend.save()
  }
}

/*******************************/
/*** Contract Call Functions ***/
/*******************************/

export function getPoolForToken(tokenId: BigInt): Address {
  const positionManagerAddress = positionManagerAddressTable.get(dataSource.network())!
  const positionManagerContract = PositionManager.bind(positionManagerAddress);
  return positionManagerContract.poolKey(tokenId)
}

export class PositionInfo {
  lpb: BigInt
  depositTime: BigInt
  constructor(lpb: BigInt, depositTime: BigInt) {
    this.lpb = lpb
    this.depositTime = depositTime
  }
}
export function getPositionInfo(tokenId: BigInt, bucketIndex: BigInt): PositionInfo {
  const positionManagerAddress = positionManagerAddressTable.get(dataSource.network())!
  const positionManagerContract = PositionManager.bind(positionManagerAddress);
  const positionInfoResult = positionManagerContract.getPositionInfo(tokenId, bucketIndex)

  return new PositionInfo(
    positionInfoResult.value0,
    positionInfoResult.value1
  )
}
