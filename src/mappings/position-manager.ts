import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  Burn as BurnEvent,
  MemorializePosition as MemorializePositionEvent,
  Mint as MintEvent,
  MoveLiquidity as MoveLiquidityEvent,
  RedeemPosition as RedeemPositionEvent,
  Transfer as TransferEvent
} from "../../generated/PositionManager/PositionManager"
import {
  Approval,
  ApprovalForAll,
  Burn,
  Lend,
  MemorializePosition,
  Mint,
  MoveLiquidity,
  Pool,
  Position,
  RedeemPosition,
  Transfer
} from "../../generated/schema"
import { getBucketId } from "../utils/pool/bucket"
import { getDepositTime, lpbValueInQuote } from "../utils/pool/lend"
import { ONE_BI, ZERO_BD } from "../utils/constants"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "../utils/convert"
import { getLendId, loadOrCreateLend } from "../utils/pool/lend"
import { deletePosition, deletePositionLend, getPoolForToken, getPositionInfo, getPositionLendId, loadOrCreateLPToken, loadOrCreatePosition, loadOrCreatePositionLend, saveOrRemovePositionLend } from "../utils/position"
import { getLenderInfo } from "../utils/pool/pool"
import { getTokenURI } from "../utils/token-erc721"

export function handleApproval(event: ApprovalEvent): void {
  const approval = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  approval.owner = event.params.owner
  approval.approved = event.params.approved
  approval.tokenId = event.params.tokenId

  approval.blockNumber = event.block.number
  approval.blockTimestamp = event.block.timestamp
  approval.transactionHash = event.transaction.hash

  approval.save()
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  const approvalForAll = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  approvalForAll.owner = event.params.owner
  approvalForAll.operator = event.params.operator
  approvalForAll.approved = event.params.approved

  approvalForAll.blockNumber = event.block.number
  approvalForAll.blockTimestamp = event.block.timestamp
  approvalForAll.transactionHash = event.transaction.hash

  approvalForAll.save()
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

  deletePosition(event.params.tokenId);

  burn.save()
}

// Lends are updated in the associated `TransferLP` event
export function handleMemorializePosition(
  event: MemorializePositionEvent
): void {
  const memorialize = new MemorializePosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  memorialize.lender  = addressToBytes(event.params.lender)
  memorialize.tokenId = event.params.tokenId
  memorialize.pool    = getPoolForToken(memorialize.tokenId)
  memorialize.indexes = bigIntArrayToIntArray(event.params.indexes)

  memorialize.blockNumber = event.block.number
  memorialize.blockTimestamp = event.block.timestamp
  memorialize.transactionHash = event.transaction.hash

  // update entities
  const position = loadOrCreatePosition(memorialize.tokenId)

  // get lend entities for each index with extant lpb
  const addressNotBytes = getPoolForToken(memorialize.tokenId)
  const poolAddress = addressToBytes(addressNotBytes)
  const accountId = memorialize.lender

  log.info("handleMemorializePosition for lender {} token {}" , [accountId.toHexString(), memorialize.tokenId.toString()])

  const positionIndexes = position.indexes;
  for (let i = 0; i < memorialize.indexes.length; i++) {
    const index = memorialize.indexes[i];
    const bucketId = getBucketId(poolAddress, index)
    // create PositionLend entity to track each lpb associated with the position
    const positionLendId = getPositionLendId(memorialize.tokenId, BigInt.fromI32(index))
    const positionLend = loadOrCreatePositionLend(positionLendId, bucketId, index)
    const positionInfo = getPositionInfo(memorialize.tokenId, BigInt.fromI32(index))
    //track the lpb and depositTime associated with each lend that was memorialized via RPC call
    positionLend.depositTime = positionInfo.depositTime
    positionLend.lpb = wadToDecimal(positionInfo.lpb)
    positionLend.lpbValueInQuote = lpbValueInQuote(memorialize.pool, index, positionLend.lpb)
    positionLend.save()
    // add PositionLend to position
    positionIndexes.push(positionLendId)
  }
  position.indexes      = positionIndexes

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

  // update position
  const position = loadOrCreatePosition(mint.tokenId)
  position.owner = mint.lender
  position.pool = getPoolForToken(mint.tokenId)

  // update token
  const token = loadOrCreateLPToken(event.address)
  position.token = token.id
  token.txCount = token.txCount.plus(ONE_BI);

  // save entities to store
  mint.save()
  position.save()
  token.save()
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

  moveLiquidity.blockNumber = event.block.number
  moveLiquidity.blockTimestamp = event.block.timestamp
  moveLiquidity.transactionHash = event.transaction.hash

  // load from index state
  const bucketIdFrom = getBucketId(moveLiquidity.pool, moveLiquidity.fromIndex)
  const lendIdFrom   = getLendId(bucketIdFrom, moveLiquidity.lender)
  const lendFrom     = loadOrCreateLend(bucketIdFrom, lendIdFrom, moveLiquidity.pool, moveLiquidity.fromIndex, moveLiquidity.lender)
  const positionLendFromId = getPositionLendId(moveLiquidity.tokenId, BigInt.fromI32(moveLiquidity.fromIndex))
  const positionLendFrom = loadOrCreatePositionLend(positionLendFromId, bucketIdFrom, moveLiquidity.fromIndex)
  const lpRedeemedFrom     = wadToDecimal(event.params.lpRedeemedFrom)

  // load to index state
  const bucketIdTo   = getBucketId(moveLiquidity.pool, moveLiquidity.toIndex)
  const lendIdTo     = getLendId(bucketIdTo, moveLiquidity.lender)
  const lendTo       = loadOrCreateLend(bucketIdTo, lendIdTo, moveLiquidity.pool, moveLiquidity.toIndex, moveLiquidity.lender)
  const positionLendToId = getPositionLendId(moveLiquidity.tokenId, BigInt.fromI32(moveLiquidity.toIndex))
  const positionLendTo = loadOrCreatePositionLend(positionLendToId, bucketIdTo, moveLiquidity.toIndex)
  const positionLendToInfo = getPositionInfo(moveLiquidity.tokenId, BigInt.fromI32(moveLiquidity.toIndex))

  // update lendTo and positionLendTo
  const lendToInfo         = getLenderInfo(moveLiquidity.pool, event.params.toIndex, Address.fromBytes(lendTo.lender))
  lendTo.depositTime       = lendToInfo.depositTime
  lendTo.lpb               = wadToDecimal(lendToInfo.lpBalance)
  lendTo.lpbValueInQuote   = lpbValueInQuote(moveLiquidity.pool, moveLiquidity.toIndex, lendTo.lpb)
  positionLendTo.depositTime = positionLendToInfo.depositTime
  positionLendTo.lpb       = wadToDecimal(positionLendToInfo.lpb)
  positionLendTo.lpbValueInQuote = lpbValueInQuote(moveLiquidity.pool, moveLiquidity.toIndex, positionLendTo.lpb)
  lendTo.save()
  positionLendTo.save()

  // update lendFrom and PositionLendFrom
  // update lpb
  if (lpRedeemedFrom.le(lendFrom.lpb)) {
    lendFrom.lpb           = lendFrom.lpb.minus(wadToDecimal(event.params.lpRedeemedFrom))
    positionLendFrom.lpb   = lendFrom.lpb
  } else {
    log.warning('handleMoveLiquidity: lender {} redeemed more LP ({}) than Lend entity was aware of ({}); resetting to 0', 
    [moveLiquidity.lender.toHexString(), lpRedeemedFrom.toString(), lendFrom.lpb.toString()])
    lendFrom.lpb = ZERO_BD
    positionLendFrom.lpb = ZERO_BD
  }
  // update lpbValueInQuote
  if (lendFrom.lpb.equals(ZERO_BD)) {
    lendFrom.lpbValueInQuote = ZERO_BD
    positionLendFrom.lpbValueInQuote = ZERO_BD
  } else {
    lendFrom.lpbValueInQuote = lpbValueInQuote(moveLiquidity.pool, moveLiquidity.toIndex, lendFrom.lpb)
    positionLendFrom.lpbValueInQuote = lpbValueInQuote(moveLiquidity.pool, moveLiquidity.toIndex, lendFrom.lpb)
  }
  saveOrRemovePositionLend(positionLendFrom)
  lendFrom.save()

  const token = loadOrCreateLPToken(event.address)
  token.txCount = token.txCount.plus(ONE_BI);

  moveLiquidity.save()
  token.save()
}

export function handleRedeemPosition(event: RedeemPositionEvent): void {
  const redeem = new RedeemPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  redeem.lender  = event.params.lender
  redeem.tokenId = event.params.tokenId
  redeem.pool    = getPoolForToken(redeem.tokenId)
  redeem.indexes = bigIntArrayToIntArray(event.params.indexes)

  redeem.blockNumber = event.block.number
  redeem.blockTimestamp = event.block.timestamp
  redeem.transactionHash = event.transaction.hash

  const position = loadOrCreatePosition(redeem.tokenId)
  const poolAddress = addressToBytes(getPoolForToken(redeem.tokenId))
  const accountId = redeem.lender

  log.info("handleRedeemPosition for lender {} token {}" , [accountId.toHexString(), redeem.tokenId.toString()])

  const positionIndexes = position.indexes;
  for (let index = 0; index < redeem.indexes.length; index++) {
    const bucketId = getBucketId(poolAddress, index)
    const positionLendId = getPositionLendId(redeem.tokenId, BigInt.fromI32(index))
    const positionLend = loadOrCreatePositionLend(positionLendId, bucketId, index)
    positionLend.lpb = ZERO_BD
    positionLend.lpbValueInQuote = ZERO_BD

    // remove positionLend from position
    const existingIndex = position.indexes.indexOf(positionLendId)
    if (existingIndex != -1) {
      positionIndexes.splice(existingIndex, 1)
    }
    deletePositionLend(positionLendId)
  }
  position.indexes = positionIndexes

  // increment token txCount
  const token = loadOrCreateLPToken(event.address)
  token.txCount = token.txCount.plus(ONE_BI);

  // save entities to store
  redeem.save()
  position.save()
  token.save()
}

export function handleTransfer(event: TransferEvent): void {
  const transfer = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.tokenId = event.params.tokenId
  transfer.pool = getPoolForToken(transfer.tokenId)

  transfer.blockNumber = event.block.number;
  transfer.blockTimestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash;

  // create/update entities
  const token = loadOrCreateLPToken(event.address);
  transfer.token = token.id;
  token.txCount = token.txCount.plus(ONE_BI);
  const position = loadOrCreatePosition(transfer.tokenId)
  position.owner = event.params.to
  position.tokenURI = getTokenURI(event.address, transfer.tokenId)

  token.save();
  position.save()
  transfer.save()
}
