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
  Position,
  RedeemPosition,
  Transfer
} from "../generated/schema"
import { getBucketId } from "./utils/bucket"
import { lpbValueInQuote } from "./utils/common"
import { ZERO_BD } from "./utils/constants"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { getLendId, loadOrCreateLend } from "./utils/lend"
import { getPoolForToken, loadOrCreateLPToken, loadOrCreatePosition } from "./utils/position"

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
  const burn = new Burn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  burn.lender = event.params.lender
  burn.tokenId = event.params.tokenId

  burn.blockNumber = event.block.number
  burn.blockTimestamp = event.block.timestamp
  burn.transactionHash = event.transaction.hash

  // delete existing position? or add a isBurned: Bool field

  burn.save()
}

export function handleMemorializePosition(
  event: MemorializePositionEvent
): void {
  const memorialize = new MemorializePosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  memorialize.lender = event.params.lender
  memorialize.tokenId = event.params.tokenId
  memorialize.indexes = bigIntArrayToIntArray(event.params.indexes)

  memorialize.blockNumber = event.block.number
  memorialize.blockTimestamp = event.block.timestamp
  memorialize.transactionHash = event.transaction.hash

  // update entities
  const position = loadOrCreatePosition(memorialize.tokenId)

  // get lend entities for each index with extant lpb
  const poolAddress = addressToBytes(getPoolForToken(memorialize.tokenId))
  const accountId = addressToBytes(memorialize.lender)
  memorialize.indexes.forEach(index => {
    const bucketId = getBucketId(poolAddress, index)
    const lendId = getLendId(bucketId, accountId)
    // TODO: verify that this correctly points to the existing lend object
    const lend = loadOrCreateLend(bucketId, lendId, poolAddress, accountId)
    position.indexes.push(lend.id)

    // save incremental lend to the store
    lend.save()
  })

  // save entities to store
  memorialize.save()
  position.save()
}

export function handleMint(event: MintEvent): void {
  const mint = new Mint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  mint.lender = event.params.lender
  mint.pool = event.params.pool
  mint.tokenId = event.params.tokenId

  mint.blockNumber = event.block.number
  mint.blockTimestamp = event.block.timestamp
  mint.transactionHash = event.transaction.hash

  // update entities
  const position = loadOrCreatePosition(mint.tokenId)
  position.owner = mint.lender
  position.pool = getPoolForToken(mint.tokenId)
  position.token = loadOrCreateLPToken(event.address).id

  // save entities to store
  mint.save()
  position.save()
}

export function handleMoveLiquidity(event: MoveLiquidityEvent): void {
  const moveLiquidity = new MoveLiquidity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  moveLiquidity.lender = event.params.lender
  moveLiquidity.tokenId = event.params.tokenId
  moveLiquidity.pool = getPoolForToken(moveLiquidity.tokenId)
  moveLiquidity.fromIndex = event.params.fromIndex.toU32()
  moveLiquidity.toIndex = event.params.toIndex.toU32()

  const bucketIdFrom = getBucketId(moveLiquidity.pool, moveLiquidity.fromIndex)
  const lendIdFrom   = getLendId(bucketIdFrom, moveLiquidity.lender)
  const lendFrom     = loadOrCreateLend(bucketIdFrom, lendIdFrom, moveLiquidity.pool, moveLiquidity.lender)
  const bucketIdTo   = getBucketId(moveLiquidity.pool, moveLiquidity.toIndex)
  const lendIdTo     = getLendId(bucketIdTo, moveLiquidity.lender)
  const lendTo       = loadOrCreateLend(bucketIdTo, lendIdTo, moveLiquidity.pool, moveLiquidity.lender)
  // FIXME: determine how much liquidity was moved
  // lendTo.lpb               = ???
  // lendTo.lpbValueInQuote   = lpbValueInQuote(moveLiquidity.pool, moveLiquidity.toIndex, lendTo.lpb)
  lendFrom.lpb             = ZERO_BD
  lendFrom.lpbValueInQuote = ZERO_BD
  lendFrom.save()
  lendTo.save()

  moveLiquidity.blockNumber = event.block.number
  moveLiquidity.blockTimestamp = event.block.timestamp
  moveLiquidity.transactionHash = event.transaction.hash

  moveLiquidity.save()
}

export function handleRedeemPosition(event: RedeemPositionEvent): void {
  const redeem = new RedeemPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  redeem.lender = event.params.lender
  redeem.tokenId = event.params.tokenId
  redeem.pool = getPoolForToken(redeem.tokenId)
  redeem.indexes = bigIntArrayToIntArray(event.params.indexes)

  redeem.blockNumber = event.block.number
  redeem.blockTimestamp = event.block.timestamp
  redeem.transactionHash = event.transaction.hash

  // update entities
  const position = loadOrCreatePosition(redeem.tokenId)

  const poolAddress = addressToBytes(getPoolForToken(redeem.tokenId))
  const accountId = addressToBytes(redeem.lender)
  redeem.indexes.forEach(index => {
    const bucketId = getBucketId(poolAddress, index)
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, poolAddress, accountId)

    // TODO: should we simply splice out redeemed lends, or do we need to maintain access for hisorical analytics?
    // remove lends from position
    const existingIndex = position.indexes.indexOf(lendId)
    if (existingIndex != -1) {
      position.indexes.splice(existingIndex, 1)
    }

    // save incremental lend to the store
    lend.save()
  })

  // save entities to store
  position.save()
  redeem.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.tokenId = event.params.tokenId
  entity.pool = getPoolForToken(entity.tokenId)

  entity.token = loadOrCreateLPToken(event.address).id

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
