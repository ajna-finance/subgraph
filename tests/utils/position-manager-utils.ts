import { assert, newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  Approval,
  ApprovalForAll,
  Burn,
  MemorializePosition,
  Mint,
  MoveLiquidity,
  RedeemPosition,
  Transfer
} from "../../generated/PositionManager/PositionManager"
import { mockGetPoolKey, mockGetTokenName, mockGetTokenSymbol } from "./common"
import { handleMint } from "../../src/mappings/position-manager"
import { bigIntToBytes } from "../../src/utils/convert"

export function createApprovalEvent(
  owner: Address,
  approved: Address,
  tokenId: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromAddress(approved))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return approvalEvent
}

export function createApprovalForAllEvent(
  owner: Address,
  operator: Address,
  approved: boolean
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = new Array()

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return approvalForAllEvent
}

export function createBurnEvent(lender: Address, tokenId: BigInt): Burn {
  let burnEvent = changetype<Burn>(newMockEvent())

  burnEvent.parameters = new Array()

  burnEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  burnEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return burnEvent
}

export function createMemorializePositionEvent(
  lender: Address,
  tokenId: BigInt,
  indexes: Array<BigInt>
): MemorializePosition {
  let memorializePositionEvent = changetype<MemorializePosition>(newMockEvent())

  memorializePositionEvent.parameters = new Array()

  memorializePositionEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  memorializePositionEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  memorializePositionEvent.parameters.push(
    new ethereum.EventParam(
      "indexes",
      ethereum.Value.fromUnsignedBigIntArray(indexes)
    )
  )

  return memorializePositionEvent
}

export function createMintEvent(
  lender: Address,
  pool: Address,
  tokenId: BigInt
): Mint {
  let mintEvent = changetype<Mint>(newMockEvent())

  mintEvent.parameters = new Array()

  mintEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  mintEvent.parameters.push(
    new ethereum.EventParam("pool", ethereum.Value.fromAddress(pool))
  )
  mintEvent.parameters.push(
    new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId))
  )

  return mintEvent
}

export function createMoveLiquidityEvent(
  lender: Address,
  tokenId: BigInt,
  fromIndex: BigInt,
  toIndex: BigInt,
  lpRedeemedFrom: BigInt,
  lpAwardedTo: BigInt
): MoveLiquidity {
  let moveLiquidityEvent = changetype<MoveLiquidity>(newMockEvent())

  moveLiquidityEvent.parameters = new Array()

  moveLiquidityEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  moveLiquidityEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  moveLiquidityEvent.parameters.push(
    new ethereum.EventParam("fromIndex", ethereum.Value.fromUnsignedBigInt(fromIndex))
  )
  moveLiquidityEvent.parameters.push(
    new ethereum.EventParam("toIndex", ethereum.Value.fromUnsignedBigInt(toIndex))
  )
  moveLiquidityEvent.parameters.push(
    new ethereum.EventParam("lpRedeemedFrom", ethereum.Value.fromUnsignedBigInt(lpRedeemedFrom))
  )
  moveLiquidityEvent.parameters.push(
    new ethereum.EventParam("lpAwardedTo", ethereum.Value.fromUnsignedBigInt(lpAwardedTo))
  )


  return moveLiquidityEvent
}

export function createRedeemPositionEvent(
  lender: Address,
  tokenId: BigInt,
  indexes: Array<BigInt>
): RedeemPosition {
  let redeemPositionEvent = changetype<RedeemPosition>(newMockEvent())

  redeemPositionEvent.parameters = new Array()

  redeemPositionEvent.parameters.push(
    new ethereum.EventParam("lender", ethereum.Value.fromAddress(lender))
  )
  redeemPositionEvent.parameters.push(
    new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId))
  )
  redeemPositionEvent.parameters.push(
    new ethereum.EventParam("indexes", ethereum.Value.fromUnsignedBigIntArray(indexes))
  )

  return redeemPositionEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  tokenId: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId))
  )

  return transferEvent
}

  /*************************/
  /*** Utility Functions ***/
  /*************************/

// mock contract calls and create event
export function mintPosition(lender: Address, pool: Address, tokenId: BigInt, tokenContractAddress: Address): void {
  mockGetPoolKey(tokenId, pool)
  mockGetTokenName(tokenContractAddress, "unknown")
  mockGetTokenSymbol(tokenContractAddress, "N/A")

  const newMintEvent = createMintEvent(lender, pool, tokenId)
  handleMint(newMintEvent)
}

export function assertPosition(lender: Address, pool: Address, tokenId: BigInt, tokenContractAddress: Address): void {
  const expectedTokenId = bigIntToBytes(tokenId).toHexString()

  // check position attributes
  assert.fieldEquals(
    "Position",
    `${expectedTokenId}`,
    "owner",
    `${lender.toHexString()}`
  )
  assert.fieldEquals(
    "Position",
    `${expectedTokenId}`,
    "pool",
    `${pool.toHexString()}`
  )
  assert.fieldEquals(
    "Position",
    `${expectedTokenId}`,
    "token",
    `${tokenContractAddress.toHexString()}`
  )
}
