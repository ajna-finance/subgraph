import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  Burn as BurnEvent,
  MemorializePosition as MemorializePositionEvent,
  Mint as MintEvent,
  MoveLiquidity as MoveLiquidityEvent,
  RedeemPosition as RedeemPositionEvent,
  Transfer as TransferEvent
} from "../generated/PositionManager/PositionManager"
import {
  Approval,
  ApprovalForAll,
  Burn,
  Lend,
  MemorializePosition,
  Mint,
  MoveLiquidity,
  RedeemPosition,
  Transfer
} from "../generated/schema"
import { getBucketId } from "./utils/bucket"
import { lpbValueInQuote } from "./utils/common"
import { ZERO_BD } from "./utils/constants"
import { bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { getLendId, loadOrCreateLend } from "./utils/lend"
import { getPoolForToken, loadOrCreateLPToken } from "./utils/position"

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.approved = event.params.approved
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.operator = event.params.operator
  entity.approved = event.params.approved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBurn(event: BurnEvent): void {
  let entity = new Burn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMemorializePosition(
  event: MemorializePositionEvent
): void {
  let entity = new MemorializePosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.tokenId = event.params.tokenId
  entity.indexes = bigIntArrayToIntArray(event.params.indexes)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMint(event: MintEvent): void {
  let entity = new Mint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.pool = event.params.pool
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMoveLiquidity(event: MoveLiquidityEvent): void {
  let entity = new MoveLiquidity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.tokenId = event.params.tokenId
  entity.pool = getPoolForToken(entity.tokenId)
  entity.fromIndex = event.params.fromIndex.toU32()
  entity.toIndex = event.params.toIndex.toU32()

  const bucketIdFrom = getBucketId(entity.pool, entity.fromIndex)
  const lendIdFrom   = getLendId(bucketIdFrom, entity.lender)
  const lendFrom     = loadOrCreateLend(bucketIdFrom, lendIdFrom, entity.pool, entity.lender)
  const bucketIdTo   = getBucketId(entity.pool, entity.toIndex)
  const lendIdTo     = getLendId(bucketIdTo, entity.lender)
  const lendTo       = loadOrCreateLend(bucketIdTo, lendIdTo, entity.pool, entity.lender)
  // FIXME: determine how much liquidity was moved
  // lendTo.lpb               = ???
  // lendTo.lpbValueInQuote   = lpbValueInQuote(entity.pool, entity.toIndex, lendTo.lpb)
  lendFrom.lpb             = ZERO_BD
  lendFrom.lpbValueInQuote = ZERO_BD
  lendFrom.save()
  lendTo.save()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRedeemPosition(event: RedeemPositionEvent): void {
  let entity = new RedeemPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lender = event.params.lender
  entity.tokenId = event.params.tokenId
  entity.pool = getPoolForToken(entity.tokenId)
  entity.indexes = bigIntArrayToIntArray(event.params.indexes)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  const entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.tokenId = event.params.tokenId
  entity.pool = getPoolForToken(entity.tokenId)

  const token = loadOrCreateLPToken(event.address)
  entity.token = token.id

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  token.save();
  entity.save()
}
