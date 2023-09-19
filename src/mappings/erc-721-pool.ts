import { ByteArray, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  AddCollateralNFT as AddCollateralNFTEvent,
  AddQuoteToken as AddQuoteTokenEvent,
  ApproveLPTransferors as ApproveLPTransferorsEvent,
  AuctionNFTSettle as AuctionNFTSettleEvent,
  BucketBankruptcy as BucketBankruptcyEvent,
  BucketTake as BucketTakeEvent,
  BucketTakeLPAwarded as BucketTakeLPAwardedEvent,
  BondWithdrawn as BondWithdrawnEvent,
  DrawDebtNFT as DrawDebtNFTEvent,
  DecreaseLPAllowance as DecreaseLPAllowanceEvent,
  Flashloan as FlashloanEvent,
  IncreaseLPAllowance as IncreaseLPAllowanceEvent,
  Kick as KickEvent,
  KickReserveAuction as KickReserveAuctionEvent,
  LoanStamped as LoanStampedEvent,
  MergeOrRemoveCollateralNFT as MergeOrRemoveCollateralNFTEvent,
  MoveQuoteToken as MoveQuoteTokenEvent,
  RemoveCollateral as RemoveCollateralEvent,
  RemoveQuoteToken as RemoveQuoteTokenEvent,
  RepayDebt as RepayDebtEvent,
  ReserveAuction as ReserveAuctionEvent,
  ResetInterestRate as ResetInterestRateEvent,
  RevokeLPAllowance as RevokeLPAllowanceEvent,
  RevokeLPTransferors as RevokeLPTransferorsEvent,
  Settle as SettleEvent,
  Take as TakeEvent,
  TransferLP as TransferLPEvent,
  UpdateInterestRate as UpdateInterestRateEvent
} from "../../generated/templates/ERC721Pool/ERC721Pool"
import {
  AddCollateralNFT,
  AuctionNFTSettle,
  BucketTake,
  BucketTakeLPAwarded,
  DrawDebtNFT,
  LiquidationAuction,
  Loan,
  MergeOrRemoveCollateralNFT,
  Pool,
  RemoveCollateral,
  RepayDebt,
  Settle,
  Take,
  Kick
} from "../../generated/schema"

import { findAndRemoveTokenIds, getWadCollateralFloorTokens, incrementTokenTxCount } from "../utils/token-erc721"
import { loadOrCreateAccount, updateAccountLends, updateAccountLoans, updateAccountPools, updateAccountKicks, updateAccountTakes, updateAccountSettles } from "../utils/account"
import { getBucketId, getBucketInfo, loadOrCreateBucket, updateBucketLends } from "../utils/pool/bucket"
import { addressToBytes, decimalToWad, wadToDecimal } from "../utils/convert"
import { ZERO_BD, ONE_BI, ONE_WAD_BI } from "../utils/constants"
import { getLendId, loadOrCreateLend, saveOrRemoveLend } from "../utils/pool/lend"
import { getBorrowerInfoERC721Pool, getLoanId, loadOrCreateLoan, saveOrRemoveLoan } from "../utils/pool/loan"
import { getLiquidationAuctionId, loadOrCreateLiquidationAuction, updateLiquidationAuction, getAuctionStatus, loadOrCreateBucketTake, getAuctionInfoERC721Pool } from "../utils/pool/liquidation"
import { updatePool, addLiquidationToPool, getLenderInfoERC721Pool } from "../utils/pool/pool"
import { lpbValueInQuote } from "../utils/pool/lend"
import { _handleAddQuoteToken, _handleApproveLPTransferors, _handleBondWithdrawn, _handleBucketBankruptcy, _handleBucketTakeLPAwarded, _handleDecreaseLPAllowance, _handleFlashLoan, _handleIncreaseLPAllowance, _handleInterestRateEvent, _handleLoanStamped, _handleMoveQuoteToken, _handleRemoveQuoteToken, _handleReserveAuctionKick, _handleReserveAuctionTake, _handleRevokeLPAllowance, _handleRevokeLPTransferors, _handleTransferLP } from "./base/base-pool"


/*******************************/
/*** Borrower Event Handlers ***/
/*******************************/

export function handleDrawDebtNFT(event: DrawDebtNFTEvent): void {
  const drawDebtNFT = new DrawDebtNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  drawDebtNFT.borrower = event.params.borrower
  drawDebtNFT.amountBorrowed = wadToDecimal(event.params.amountBorrowed)
  drawDebtNFT.lup = wadToDecimal(event.params.lup)
  drawDebtNFT.tokenIdsPledged = event.params.tokenIdsPledged

  drawDebtNFT.blockNumber = event.block.number
  drawDebtNFT.blockTimestamp = event.block.timestamp
  drawDebtNFT.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  // record the tokenIds added to the pool
  pool.tokenIdsPledged = pool.tokenIdsPledged.concat(event.params.tokenIdsPledged)
  incrementTokenTxCount(pool)

  // update account state
  const accountId = addressToBytes(event.params.borrower)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  // update loan state
  const loanId = getLoanId(pool.id, accountId)
  const loan = loadOrCreateLoan(loanId, pool.id, drawDebtNFT.borrower)
  const borrowerInfo     = getBorrowerInfoERC721Pool(addressToBytes(event.params.borrower), pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)
  loan.tokenIdsPledged   = loan.tokenIdsPledged.concat(event.params.tokenIdsPledged)

  // update account's list of pools and loans if necessary
  updateAccountPools(account, pool)
  updateAccountLoans(account, loan)

  drawDebtNFT.pool = pool.id

  // save entities to store
  pool.save()
  account.save()
  loan.save()
  drawDebtNFT.save()
}

export function handleRepayDebt(event: RepayDebtEvent): void {
  const repayDebt = new RepayDebt(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  repayDebt.borrower         = event.params.borrower
  repayDebt.quoteRepaid      = wadToDecimal(event.params.quoteRepaid)
  repayDebt.collateralPulled = wadToDecimal(event.params.collateralPulled)
  repayDebt.lup              = wadToDecimal(event.params.lup)

  repayDebt.blockNumber = event.block.number
  repayDebt.blockTimestamp = event.block.timestamp
  repayDebt.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  // update tx count for a pools tokens
  incrementTokenTxCount(pool)
  // associate pool with repayDebt event
  repayDebt.pool = pool.id

  // update account state
  const accountId = addressToBytes(event.params.borrower)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  const loanId = getLoanId(pool.id, accountId)
  const loan = loadOrCreateLoan(loanId, pool.id, repayDebt.borrower)
  const borrowerInfo = getBorrowerInfoERC721Pool(accountId, pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

  // retrieve the tokenIdsPledged that were pulled in this event
  const numberOfTokensPulled = event.params.collateralPulled.div(ONE_WAD_BI).toI32()
  const tokenIdsPulled = loan.tokenIdsPledged.slice(loan.tokenIdsPledged.length - numberOfTokensPulled, loan.tokenIdsPledged.length)
  // remove tokenIdsPulled from the loan and pool tokenIdsPledged
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsPulled, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsPulled, pool.tokenIdsPledged)

  // update account loans if necessary
  updateAccountLoans(account, loan)
  // remove loan from store if necessary
  saveOrRemoveLoan(loan)

  // save entities to store
  account.save()
  pool.save()
  repayDebt.save()
}

export function handleFlashloan(event: FlashloanEvent): void {
  _handleFlashLoan(event, event.params.token, event.params.receiver, event.params.amount)
}

export function handleLoanStamped(event: LoanStampedEvent): void {
  _handleLoanStamped(event, event.params.borrower)
}

/*****************************/
/*** Lender Event Handlers ***/
/*****************************/

// lender adds collateral to a bucket in exchange for LPB
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
    pool.bucketTokenIds = pool.bucketTokenIds.concat(event.params.tokenIds)

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
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, addCollateralNFT.actor)
    lend.depositTime     = addCollateralNFT.blockTimestamp
    lend.lpb             = lend.lpb.plus(addCollateralNFT.lpAwarded)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)
    updateBucketLends(bucket, lend)

    // update account's list of pools and lends if necessary
    updateAccountPools(account, pool)
    updateAccountLends(account, lend)

    // save entities to store
    account.save()
    bucket.save()
    lend.save()
    pool.save()

    // update tx count for a pools tokens
    incrementTokenTxCount(pool)

    addCollateralNFT.bucket = bucket.id
    addCollateralNFT.pool = pool.id
  }

  addCollateralNFT.save()
}

export function handleAddQuoteToken(event: AddQuoteTokenEvent): void {
  // TODO: get compiler to ignore this line's INFO output
  event = changetype<AddQuoteTokenEvent | null>(event)!
  _handleAddQuoteToken(null, event)
}

export function handleMoveQuoteToken(event: MoveQuoteTokenEvent): void {
  event = changetype<MoveQuoteTokenEvent | null>(event)!
  _handleMoveQuoteToken(null, event)
}

export function handleBucketBankruptcy(event: BucketBankruptcyEvent): void {
  _handleBucketBankruptcy(event, event.params.index, event.params.lpForfeited)
}

export function handleRemoveCollateral(event: RemoveCollateralEvent): void {
  const removeCollateral = new RemoveCollateral(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  removeCollateral.claimer    = event.params.claimer
  removeCollateral.index      = event.params.index.toU32()
  removeCollateral.amount     = wadToDecimal(event.params.amount)
  removeCollateral.lpRedeemed = wadToDecimal(event.params.lpRedeemed)

  removeCollateral.blockNumber = event.block.number
  removeCollateral.blockTimestamp = event.block.timestamp
  removeCollateral.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  // update tx count for a pools tokens
  incrementTokenTxCount(pool)

  // update bucket state
  const bucketId   = getBucketId(pool.id, event.params.index.toU32())
  const bucket     = loadOrCreateBucket(pool.id, bucketId, event.params.index.toU32())
  const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
  bucket.collateral   = wadToDecimal(bucketInfo.collateral)
  bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
  bucket.lpb          = wadToDecimal(bucketInfo.lpb)
  bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

  // update account state
  const accountId = removeCollateral.claimer
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  const lendId = getLendId(bucketId, accountId)
  const lend = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, removeCollateral.claimer)
  if (removeCollateral.lpRedeemed.le(lend.lpb)){
    lend.lpb = lend.lpb.minus(removeCollateral.lpRedeemed)
  } else {
    lend.lpb = ZERO_BD
  }
  lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)

  // update pool tokenIds
  // slice the tokenIds that will be removed from the end of the array
  const numberOfTokensToRemove = event.params.amount.div(ONE_WAD_BI).toI32()
  const tokenIdsToRemove = pool.bucketTokenIds.slice(pool.bucketTokenIds.length - numberOfTokensToRemove, pool.bucketTokenIds.length)
  // splice the identified tokenIds out of pool.bucketTokenIds
  pool.bucketTokenIds = findAndRemoveTokenIds(tokenIdsToRemove, pool.bucketTokenIds)

  // update bucket and account's list of pools and lends if necessary
  updateBucketLends(bucket, lend)
  updateAccountPools(account, pool)
  updateAccountLends(account, lend)

  // remove lend from store if necessary
  saveOrRemoveLend(lend)

  // save entities to store
  account.save()
  bucket.save()
  pool.save()

  // associate bucket and pool with removeCollateral entity
  removeCollateral.bucket = bucket.id
  removeCollateral.pool = pool.id

  removeCollateral.save()
}

export function handleRemoveQuoteToken(event: RemoveQuoteTokenEvent): void {
  event = changetype<RemoveQuoteTokenEvent | null>(event)!
  _handleRemoveQuoteToken(null, event)
}

// called by Account's with Lend(s) in a pool
export function handleMergeOrRemoveCollateralNFT(
  event: MergeOrRemoveCollateralNFTEvent
): void {
  const mergeOrRemove = new MergeOrRemoveCollateralNFT(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  mergeOrRemove.actor = addressToBytes(event.params.actor)
  mergeOrRemove.collateralMerged = wadToDecimal(event.params.collateralMerged)
  mergeOrRemove.toIndexLps = wadToDecimal(event.params.toIndexLps)

  mergeOrRemove.blockNumber = event.block.number
  mergeOrRemove.blockTimestamp = event.block.timestamp
  mergeOrRemove.transactionHash = event.transaction.hash

  // update pool entity
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update account state
  const accountId = addressToBytes(event.params.actor)
  const account   = loadOrCreateAccount(accountId)
  account.txCount = account.txCount.plus(ONE_BI)

  // use transaction metadata to access the list of removalIndexes
  const dataWithoutSelector = event.transaction.input.subarray(4)
  //prepend a "tuple" prefix (function params are arrays, not tuples)
  const tuplePrefix = ByteArray.fromHexString(
    '0x0000000000000000000000000000000000000000000000000000000000000020'
  );
  const dataWithoutSelectorAsTuple = new Uint8Array(tuplePrefix.length + dataWithoutSelector.length);
  dataWithoutSelectorAsTuple.set(tuplePrefix, 0);
  dataWithoutSelectorAsTuple.set(dataWithoutSelector, tuplePrefix.length);
  const decoded = ethereum.decode('(uint256[],uint256,uint256)', Bytes.fromUint8Array(dataWithoutSelectorAsTuple))!

  const removalIndexes = decoded.toTuple()[0].toBigIntArray()
  const noNFTsToRemove = decoded.toTuple()[1].toBigInt()
  const toIndex        = decoded.toTuple()[2].toBigInt()

  // iterate through removalIndexes and update state
  for (let i = 0; i < removalIndexes.length; i++) {
    const index = removalIndexes[i]

    // update bucket state
    const bucketId   = getBucketId(pool.id, index.toU32())
    const bucket     = loadOrCreateBucket(pool.id, bucketId, index.toU32())
    const bucketInfo = getBucketInfo(pool.id, bucket.bucketIndex)
    bucket.collateral   = wadToDecimal(bucketInfo.collateral)
    bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
    bucket.lpb          = wadToDecimal(bucketInfo.lpb)
    bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

    // update lend state
    const lendId = getLendId(bucketId, accountId)
    const lend = loadOrCreateLend(bucketId, lendId, pool.id, bucket.bucketIndex, event.params.actor)
    lend.depositTime = mergeOrRemove.blockTimestamp
    lend.lpb = wadToDecimal(getLenderInfoERC721Pool(pool.id, index, event.params.actor).lpBalance)
    lend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, lend.lpb)
    updateBucketLends(bucket, lend)
    updateAccountLends(account, lend)
    // remove lend from store if necessary
    saveOrRemoveLend(lend)

    // save entities to store
    account.save()
    bucket.save()
  }

  // update pool bucketTokenIds
  if (mergeOrRemove.collateralMerged.equals(wadToDecimal(noNFTsToRemove))) {
    // slice the tokenIds that will be removed from the end of the array
    const tokenIdsToRemove = pool.bucketTokenIds.slice(pool.bucketTokenIds.length - noNFTsToRemove.div(ONE_WAD_BI).toI32(), pool.bucketTokenIds.length)
    // splice the identified tokenIds out of pool.bucketTokenIds
    pool.bucketTokenIds = findAndRemoveTokenIds(tokenIdsToRemove, pool.bucketTokenIds)
  }

  updateAccountPools(account, pool)

  // save entities to store
  account.save()
  pool.save()
  mergeOrRemove.save()
}

/**********************************/
/*** Liquidation Event Handlers ***/
/**********************************/

export function handleBondWithdrawn(event: BondWithdrawnEvent): void {
  _handleBondWithdrawn(event, event.params.kicker, event.params.reciever, event.params.amount)
}

// emitted concurrently with `Settle`
export function handleAuctionNFTSettle(event: AuctionNFTSettleEvent): void {
  const auctionNFTSettle = new AuctionNFTSettle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  auctionNFTSettle.borrower = event.params.borrower
  auctionNFTSettle.collateral = wadToDecimal(event.params.collateral)
  auctionNFTSettle.lp = wadToDecimal(event.params.lp)
  auctionNFTSettle.index = event.params.index.toU32()

  auctionNFTSettle.blockNumber = event.block.number
  auctionNFTSettle.blockTimestamp = event.block.timestamp
  auctionNFTSettle.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!
  // pool doesn't need to be updated here as it was already updated in the concurrent Settle event

  // update auction state
  const loanId       = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan         = Loan.load(loanId)!
  const auctionId    = loan.liquidationAuction!
  const auction      = LiquidationAuction.load(auctionId)!
  auction.settle     = auctionNFTSettle.id
  auction.settleTime = auctionNFTSettle.blockTimestamp
  auction.settled    = true
  auction.save()

  // update loan state
  loan.t0debt = ZERO_BD
  loan.collateralPledged = auctionNFTSettle.collateral
  loan.inLiquidation = false

  // rebalance tokenIds on auction settle
  // round down remaining collateral pledged, and slice that many tokenIds
  const numberOfTokensToLeave = getWadCollateralFloorTokens(event.params.collateral).toI32()
  // slice all tokenIds out other than the number of tokens to leave
  const tokenIdsSettled = loan.tokenIdsPledged.slice(numberOfTokensToLeave)
  // remove tokenIdsSettled from the loan and pool tokenIdsPledged
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsSettled, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsSettled, pool.tokenIdsPledged)
  // add the removed tokenIdsPledged to the pool bucketTokenIds
  pool.bucketTokenIds = pool.bucketTokenIds.concat(tokenIdsSettled)
  pool.save()

  // remove loan from store if necessary
  saveOrRemoveLoan(loan)

  // update auctionNFTSettle pointers and save to store
  auctionNFTSettle.pool = pool.id
  auctionNFTSettle.loan = loan.id
  auctionNFTSettle.save()
}

export function handleSettle(event: SettleEvent): void {
  const settle = new Settle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  settle.borrower = event.params.borrower
  settle.settledDebt = wadToDecimal(event.params.settledDebt)

  settle.blockNumber = event.block.number
  settle.blockTimestamp = event.block.timestamp
  settle.transactionHash = event.transaction.hash

  // update pool state
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.loansCount = pool.loansCount.minus(ONE_BI)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update settler account state
  const account   = loadOrCreateAccount(event.transaction.from)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountPools(account, pool)
  updateAccountSettles(account, settle)

  // update liquidation auction state
  const loanId = getLoanId(pool.id, settle.borrower)
  const loan = Loan.load(loanId)!
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  const auctionInfo = getAuctionInfoERC721Pool(settle.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus)
  auction.settles = auction.settles.concat([settle.id])

  // update settle pointers
  settle.pool = pool.id
  settle.liquidationAuction = auctionId
  settle.loan = loanId

  // save entities to the store
  account.save()
  auction.save()
  pool.save()

  settle.save()
}

export function handleKick(event: KickEvent): void {
  const kick = new Kick(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  kick.borrower   = event.params.borrower
  kick.debt       = wadToDecimal(event.params.debt)
  kick.collateral = wadToDecimal(event.params.collateral)
  kick.bond       = wadToDecimal(event.params.bond)
  kick.locked     = kick.bond
  kick.claimable  = ZERO_BD

  kick.blockNumber = event.block.number
  kick.blockTimestamp = event.block.timestamp
  kick.transactionHash = event.transaction.hash

  kick.kicker = event.transaction.from

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!

  // update pool state
  updatePool(pool)
  pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bond))
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update kicker account state
  const account   = loadOrCreateAccount(kick.kicker)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountKicks(account, kick)
  updateAccountPools(account, pool)

  // update loan state
  const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan = loadOrCreateLoan(loanId, pool.id, kick.borrower)
  loan.inLiquidation     = true
  loan.collateralPledged = kick.collateral
  loan.t0debt            = kick.debt.div(pool.inflator) // update loan debt to account for kick penalty

  // retrieve auction information on the kicked loan
  const auctionInfo = getAuctionInfoERC721Pool(kick.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)

  // update liquidation auction state
  const auctionId = getLiquidationAuctionId(pool.id, loan.id, kick.blockNumber)
  const auction = loadOrCreateLiquidationAuction(pool.id, auctionId, kick, loan)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus)

  kick.kickMomp = wadToDecimal(auctionInfo.kickMomp)
  kick.startingPrice = wadToDecimal(auctionStatus.price)
  kick.pool = pool.id
  kick.loan = loan.id
  kick.liquidationAuction = auctionId
  loan.liquidationAuction = auctionId

  // track new liquidation auction at the pool level
  addLiquidationToPool(pool, auction)

  // save entities to store
  account.save()
  auction.save()
  loan.save()
  pool.save()
  kick.save()
}

export function handleBucketTake(event: BucketTakeEvent): void {
  const bucketTakeId      = event.transaction.hash.concatI32(event.logIndex.toI32());
  const bucketTake        = BucketTake.load(bucketTakeId)!
  bucketTake.borrower     = event.params.borrower
  bucketTake.taker        = event.transaction.from
  bucketTake.index        = event.params.index.toU32()
  bucketTake.amount       = wadToDecimal(event.params.amount)
  bucketTake.collateral   = wadToDecimal(event.params.collateral)
  bucketTake.auctionPrice = bucketTake.amount.div(bucketTake.collateral)
  bucketTake.bondChange   = wadToDecimal(event.params.bondChange)
  bucketTake.isReward     = event.params.isReward

  bucketTake.blockNumber     = event.block.number
  bucketTake.blockTimestamp  = event.block.timestamp
  bucketTake.transactionHash = event.transaction.hash

  // update entities
  const pool = Pool.load(addressToBytes(event.address))!

  // update pool state
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update taker account state
  const account   = loadOrCreateAccount(bucketTake.taker)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountTakes(account, bucketTake.id)
  updateAccountPools(account, pool)

  // update loan state
  const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan = loadOrCreateLoan(loanId, pool.id, addressToBytes(event.params.borrower))
  const borrowerInfo     = getBorrowerInfoERC721Pool(addressToBytes(event.params.borrower), pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

  // unique to ERC721Pools
  // remove collateral taken from loan and pool
  const numberOfTokensToTake = getWadCollateralFloorTokens(event.params.collateral).toI32()
  const tokenIdsTaken = loan.tokenIdsPledged.slice(loan.tokenIdsPledged.length - numberOfTokensToTake, loan.tokenIdsPledged.length)
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsTaken, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsTaken, pool.tokenIdsPledged)

  // unique to ERC721Pools
  // Rebalance surplus borrower tokenIds after bucketTake
  const numberOfTokensToLeave = getWadCollateralFloorTokens(decimalToWad(loan.collateralPledged)).toI32()
  const tokenIdsToRebalance = loan.tokenIdsPledged.slice(numberOfTokensToLeave)
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsToRebalance, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsToRebalance, pool.tokenIdsPledged)
  pool.bucketTokenIds = pool.bucketTokenIds.concat(tokenIdsToRebalance)

  // retrieve auction information on the take's auction
  const auctionInfo   = getAuctionInfoERC721Pool(bucketTake.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)

  // update liquidation auction state
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  updateLiquidationAuction(auction, auctionInfo, auctionStatus, bucketTake.auctionPrice)
  auction.bucketTakes = auction.bucketTakes.concat([bucketTake.id])

  // update kick and pool for the change in bond as a result of the take
  const kick = Kick.load(auction.kick)!
  if (bucketTake.isReward) {
    // reward kicker if take is below neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.plus(wadToDecimal(event.params.bondChange))
  } else {
    // penalize kicker if take is above neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.minus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.minus(wadToDecimal(event.params.bondChange))
  }

  // update bucket state
  const bucketId      = getBucketId(pool.id, bucketTake.index)
  const bucket        = loadOrCreateBucket(pool.id, bucketId, bucketTake.index)
  const bucketInfo    = getBucketInfo(pool.id, bucket.bucketIndex)
  bucket.collateral   = wadToDecimal(bucketInfo.collateral)
  bucket.deposit      = wadToDecimal(bucketInfo.quoteTokens)
  bucket.lpb          = wadToDecimal(bucketInfo.lpb)
  bucket.exchangeRate = wadToDecimal(bucketInfo.exchangeRate)

  // update lend state for kicker
  const lpAwardedId          = event.transaction.hash.concatI32(event.logIndex.toI32() - 1);
  const bucketTakeLpAwarded  = BucketTakeLPAwarded.load(lpAwardedId)!
  const kickerLendId         = getLendId(bucketId, bucketTakeLpAwarded.kicker)
  const kickerLend           = loadOrCreateLend(bucketId, kickerLendId, pool.id, bucket.bucketIndex, bucketTakeLpAwarded.kicker)
  kickerLend.depositTime     = bucketTake.blockTimestamp
  kickerLend.lpb             = kickerLend.lpb.plus(bucketTakeLpAwarded.lpAwardedKicker)
  kickerLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, kickerLend.lpb)
  updateBucketLends(bucket, kickerLend)

  // update kicker account state if they weren't a lender already
  const kickerAccountId = bucketTakeLpAwarded.kicker
  const kickerAccount   = loadOrCreateAccount(kickerAccountId)
  updateAccountLends(kickerAccount, kickerLend)

  // update lend state for taker
  const takerLendId         = getLendId(bucketId, bucketTakeLpAwarded.taker)
  const takerLend           = loadOrCreateLend(bucketId, takerLendId, pool.id, bucket.bucketIndex, bucketTakeLpAwarded.taker)
  takerLend.depositTime     = bucketTake.blockTimestamp
  takerLend.lpb             = takerLend.lpb.plus(bucketTakeLpAwarded.lpAwardedTaker)
  takerLend.lpbValueInQuote = lpbValueInQuote(pool.id, bucket.bucketIndex, takerLend.lpb)
  updateBucketLends(bucket, takerLend)

  // update bucketTake pointers
  bucketTake.liquidationAuction = auction.id
  bucketTake.loan = loanId
  bucketTake.pool = pool.id

  // save entities to the store
  account.save()
  auction.save()
  bucket.save()
  bucketTake.save()
  loan.save()
  pool.save()
  kick.save()
  kickerAccount.save()
  kickerLend.save()
  takerLend.save()
}

export function handleBucketTakeLPAwarded(event: BucketTakeLPAwardedEvent): void {
  _handleBucketTakeLPAwarded(event, event.params.kicker, event.params.taker, event.params.lpAwardedKicker, event.params.lpAwardedTaker)
}

export function handleTake(event: TakeEvent): void {
  const take = new Take(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  take.borrower     = event.params.borrower
  take.taker        = event.transaction.from
  take.amount       = wadToDecimal(event.params.amount)
  take.collateral   = wadToDecimal(event.params.collateral)
  take.auctionPrice = take.amount.div(take.collateral)
  take.bondChange   = wadToDecimal(event.params.bondChange)
  take.isReward     = event.params.isReward

  take.blockNumber = event.block.number
  take.blockTimestamp = event.block.timestamp
  take.transactionHash = event.transaction.hash

  // update pool state
  const pool = Pool.load(addressToBytes(event.address))!
  updatePool(pool)
  pool.txCount = pool.txCount.plus(ONE_BI)
  incrementTokenTxCount(pool)

  // update taker account state
  const account   = loadOrCreateAccount(take.taker)
  account.txCount = account.txCount.plus(ONE_BI)
  updateAccountTakes(account, take.id)
  updateAccountPools(account, pool)

  // update loan state
  const loanId = getLoanId(pool.id, addressToBytes(event.params.borrower))
  const loan   = Loan.load(loanId)!
  const borrowerInfo     = getBorrowerInfoERC721Pool(addressToBytes(event.params.borrower), pool.id)
  loan.collateralPledged = wadToDecimal(borrowerInfo.collateral)
  loan.t0debt            = wadToDecimal(borrowerInfo.t0debt)

  // remove tokenIdsTaken from loan and pool tokenIdsPledged
  const numberOfTokensToTake = getWadCollateralFloorTokens(event.params.collateral).toI32()
  const tokenIdsTaken = loan.tokenIdsPledged.slice(loan.tokenIdsPledged.length - numberOfTokensToTake, loan.tokenIdsPledged.length)
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsTaken, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsTaken, pool.tokenIdsPledged)

  // Rebalance any borrower tokenIds if necessary
  const numberOfTokensToLeave = getWadCollateralFloorTokens(decimalToWad(loan.collateralPledged)).toI32()
  const tokenIdsToRebalance = loan.tokenIdsPledged.slice(numberOfTokensToLeave)
  loan.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsToRebalance, loan.tokenIdsPledged)
  pool.tokenIdsPledged = findAndRemoveTokenIds(tokenIdsToRebalance, pool.tokenIdsPledged)
  pool.bucketTokenIds = pool.bucketTokenIds.concat(tokenIdsToRebalance)

  // update liquidation auction state
  const auctionId = loan.liquidationAuction!
  const auction   = LiquidationAuction.load(auctionId)!
  auction.takes = auction.takes.concat([take.id])
  const auctionInfo = getAuctionInfoERC721Pool(take.borrower, pool)
  const auctionStatus = getAuctionStatus(pool, event.params.borrower)
  updateLiquidationAuction(auction, auctionInfo, auctionStatus, take.auctionPrice)

  const collateralPurchased = wadToDecimal(event.params.collateral)
  pool.pledgedCollateral    = pool.pledgedCollateral.minus(collateralPurchased)

  // update kick and pool for the change in bond as a result of the take
  const kick = Kick.load(auction.kick)!
  if (take.isReward) {
    // reward kicker if take is below neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.plus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.plus(wadToDecimal(event.params.bondChange))
  } else {
    // penalize kicker if take is above neutral price
    pool.totalBondEscrowed = pool.totalBondEscrowed.minus(wadToDecimal(event.params.bondChange))
    kick.locked = kick.locked.minus(wadToDecimal(event.params.bondChange))
  }

  // update take pointers
  take.liquidationAuction = auction.id
  take.loan = loanId
  take.pool = pool.id

  // save entities to the store
  account.save()
  auction.save()
  loan.save()
  pool.save()
  kick.save()
  take.save()
}

/*************************************/
/*** LPB Management Event Handlers ***/
/*************************************/

export function handleApproveLPTransferors(
  event: ApproveLPTransferorsEvent
): void {
  _handleApproveLPTransferors(event, event.params.lender, event.params.transferors)
}

export function handleDecreaseLPAllowance(event: DecreaseLPAllowanceEvent): void {
  _handleDecreaseLPAllowance(event, event.params.owner, event.params.spender, event.params.indexes, event.params.amounts)
}

export function handleIncreaseLPAllowance(event: IncreaseLPAllowanceEvent): void {
  _handleIncreaseLPAllowance(event, event.params.owner, event.params.spender, event.params.indexes, event.params.amounts)
}

export function handleRevokeLPAllowance(event: RevokeLPAllowanceEvent): void {
  _handleRevokeLPAllowance(event, event.params.owner, event.params.spender, event.params.indexes)
}

export function handleRevokeLPTransferors(
  event: RevokeLPTransferorsEvent
): void {
  _handleRevokeLPTransferors(event, event.params.lender, event.params.transferors)
}

export function handleTransferLP(event: TransferLPEvent): void {
  event = changetype<TransferLPEvent | null>(event)!
  _handleTransferLP(null, event)
}

/***************************/
/*** Pool Event Handlers ***/
/***************************/

export function handleResetInterestRate(event: ResetInterestRateEvent): void {
  _handleInterestRateEvent(event.address, event, event.params.newRate);
}

export function handleUpdateInterestRate(event: UpdateInterestRateEvent): void {
  _handleInterestRateEvent(event.address, event, event.params.newRate);
}

/*******************************/
/*** Reserves Event Handlers ***/
/*******************************/

export function handleReserveAuctionKick(event: KickReserveAuctionEvent): void {
  _handleReserveAuctionKick(event, event.params.currentBurnEpoch, event.params.claimableReservesRemaining, event.params.auctionPrice)
}

export function handleReserveAuctionTake(event: ReserveAuctionEvent): void {
  _handleReserveAuctionTake(event, event.params.currentBurnEpoch, event.params.claimableReservesRemaining, event.params.auctionPrice)
}
