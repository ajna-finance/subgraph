import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { PoolInfoUtils } from "../../../generated/templates/ERC20Pool/PoolInfoUtils"

import { Loan }    from "../../../generated/schema"
import { poolInfoUtilsAddressTable, ONE_BD, ZERO_BD, ZERO_BI } from "../constants"
import { ERC20Pool } from '../../../generated/templates/ERC20Pool/ERC20Pool'
import { ERC721Pool } from "../../../generated/templates/ERC721Pool/ERC721Pool"

export function getLoanId(poolId: Bytes, accountId: Bytes): Bytes {
  return poolId.concat(Bytes.fromUTF8('|').concat(accountId))
}

export function loadOrCreateLoan(loanId: Bytes, poolId: Bytes, borrower: Bytes): Loan {
    let loan = Loan.load(loanId)
    if (loan == null) {
      // create new loan if loan hasn't already been stored
      loan = new Loan(loanId) as Loan

      loan.borrower            = borrower
      loan.pool                = poolId
      loan.poolAddress         = poolId.toHexString()
      loan.collateralPledged   = ZERO_BD
      loan.t0debt              = ZERO_BD
      loan.inLiquidation       = false
      loan.liquidationAuction  = null
      loan.tokenIdsPledged     = []
    }

    return loan
}

/**********************************/
/*** Contract Calling Functions ***/
/**********************************/

export class BorrowerInfo {
  t0debt: BigInt
  collateral: BigInt
  t0Np: BigInt
  constructor(t0debt: BigInt, collateral: BigInt, t0Np: BigInt) {
    this.t0debt = t0debt
    this.collateral = collateral
    this.t0Np = t0Np
  }
}
export function getBorrowerInfo(borrower: Bytes, poolId: Bytes): BorrowerInfo {
  const poolContract = ERC20Pool.bind(Address.fromBytes(poolId))
  const borrowerInfoResult = poolContract.borrowerInfo(Address.fromBytes(borrower))

  return new BorrowerInfo(
    borrowerInfoResult.value0,
    borrowerInfoResult.value1,
    borrowerInfoResult.value2
  )
}

export function getBorrowerInfoERC721Pool(borrower: Bytes, poolId: Bytes): BorrowerInfo {
  const poolContract = ERC721Pool.bind(Address.fromBytes(poolId))
  const borrowerInfoResult = poolContract.borrowerInfo(Address.fromBytes(borrower))

  return new BorrowerInfo(
    borrowerInfoResult.value0,
    borrowerInfoResult.value1,
    borrowerInfoResult.value2
  )
}

// get the number of tokenIds pledged to the pool by a borrower
export function getTotalBorrowerTokens(borrower: Address, poolId: Bytes): BigInt {
  const poolAddress = Address.fromBytes(poolId)
  const poolContract = ERC721Pool.bind(poolAddress)
  return poolContract.totalBorrowerTokens(borrower)
}

/*************************/
/*** Utility Functions ***/
/*************************/

export function collateralizationAtLup(debt: BigDecimal, collateral: BigDecimal, lup: BigDecimal): BigDecimal {
  if (debt > ZERO_BD && lup > ZERO_BD) {
    return collateral.times(lup).div(debt)
  } else {
    return ONE_BD
  }
}

export function thresholdPrice(debt: BigDecimal, collateral: BigDecimal): BigDecimal {
  if (collateral > ZERO_BD) {
    return debt.div(collateral)
  } else {
    return ZERO_BD;
  }
}
