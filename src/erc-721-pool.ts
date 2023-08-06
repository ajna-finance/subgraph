import {
  AddCollateralNFT as AddCollateralNFTEvent,
  DrawDebtNFT as DrawDebtNFTEvent,
  Flashloan as FlashloanEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  MergeOrRemoveCollateralNFT as MergeOrRemoveCollateralNFTEvent,
  ReserveAuction as ReserveAuctionEvent
} from "../generated/templates/ERC721Pool/ERC721Pool"
import {
  AddCollateralNFT,
  DrawDebtNFT,
  Flashloan,
  // KickReserveAuction,
  MergeOrRemoveCollateralNFT,
  Pool,
  ReserveAuction
} from "../generated/schema"
import { incrementTokenTxCount } from "./utils/token-erc721"
import { Bytes } from "@graphprotocol/graph-ts"

import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles, updateAccountReserveAuctions } from "./utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket } from "./utils/pool/bucket"
import { addressToBytes, bigIntArrayToIntArray, wadToDecimal } from "./utils/convert"
import { ZERO_BD, ONE_BI, TEN_BI } from "./utils/constants"

import { getLendId, loadOrCreateLend } from "./utils/pool/lend"
import { getBorrowerInfo, getLoanId, loadOrCreateLoan } from "./utils/pool/loan"
import { getLiquidationAuctionId, getAuctionInfoERC20Pool, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus, loadOrCreateBucketTake } from "./utils/pool/liquidation"
import { getBurnInfo, updatePool, addLiquidationToPool, addReserveAuctionToPool, getLenderInfo, getRatesAndFees, calculateLendRate } from "./utils/pool/pool"
import { lpbValueInQuote } from "./utils/common"

export function handleAddCollateralNFT(event: AddCollateralNFTEvent): void {
  const addCollateralNFT = new AddCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  addCollateralNFT.actor = event.params.actor
  addCollateralNFT.index = event.params.index
  addCollateralNFT.tokenIds = event.params.tokenIds
  addCollateralNFT.lpAwarded = wadToDecimal(event.params.lpAwarded)

  addCollateralNFT.blockNumber = event.block.number
  addCollateralNFT.blockTimestamp = event.block.timestamp
  addCollateralNFT.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))
  if (pool != null) {
    // update pool state
    updatePool(pool)
    pool.txCount = pool.txCount.plus(ONE_BI)

    // update bucket state
    const bucketId   = getBucketId(pool.id, event.params.index.toU32())
    const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update account state
    const accountId = addressToBytes(event.params.actor)
    const account   = loadOrCreateAccount(accountId)
    account.txCount = account.txCount.plus(ONE_BI)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, addCollateralNFT.actor)
    lend.lpb             = lend.lpb.plus(addCollateralNFT.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

    // update account's list of pools and lends if necessary
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()

    // BELOW LOGIC IS CUSTOM TO ERC721 POOLS
    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    addCollateralNFT.bucket = bucket.id
    addCollateralNFT.pool = pool.id
  }

  addCollateralNFT.save()
}

export function handleDrawDebtNFT(event: DrawDebtNFTEvent): void {
  let entity = new DrawDebtNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.borrower = event.params.borrower
  entity.amountBorrowed = event.params.amountBorrowed
  entity.tokenIdsPledged = event.params.tokenIdsPledged
  entity.lup = event.params.lup

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

// export function handleKickReserveAuction(event: KickReserveAuctionEvent): void {
//   let entity = new KickReserveAuction(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.claimableReservesRemaining = event.params.claimableReservesRemaining
//   entity.auctionPrice = event.params.auctionPrice
//   entity.currentBurnEpoch = event.params.currentBurnEpoch

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

export function handleMergeOrRemoveCollateralNFT(
  event: MergeOrRemoveCollateralNFTEvent
): void {
  let entity = new MergeOrRemoveCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.actor = event.params.actor
  entity.collateralMerged = event.params.collateralMerged
  entity.toIndexLps = event.params.toIndexLps

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

