import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { PoolInfoUtils } from "../../generated/templates/ERC20Pool/PoolInfoUtils"

import { Loan }    from "../../generated/schema"
import { poolInfoUtilsAddressTable, ZERO_BD, ZERO_BI } from "./constants"

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
      loan.collateralization   = ZERO_BD
      loan.debt                = ZERO_BD
      loan.tp                  = ZERO_BD
      loan.inLiquidation       = false
      loan.liquidationAuction  = null
    }

    return loan
}

export class BorrowerInfo {
  debt: BigInt
  collateral: BigInt
  t0Np: BigInt
  constructor(debt: BigInt, collateral: BigInt, t0Np: BigInt) {
    this.debt = debt
    this.collateral = collateral
    this.t0Np = t0Np
  }
}
export function getBorrowerInfo(borrower: Bytes, poolId: Bytes): BorrowerInfo {
  const poolInfoUtilsAddress = poolInfoUtilsAddressTable.get(dataSource.network())!
  const poolInfoUtilsContract = PoolInfoUtils.bind(poolInfoUtilsAddress)
  const borrowerInfoResult = poolInfoUtilsContract.borrowerInfo(Address.fromBytes(poolId), Address.fromBytes(borrower))

  return new BorrowerInfo(
    borrowerInfoResult.value0,
    borrowerInfoResult.value1,
    borrowerInfoResult.value2
  )
}