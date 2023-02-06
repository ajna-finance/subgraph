import { BigInt, Bytes } from "@graphprotocol/graph-ts"

import { Loan }    from "../../generated/schema"
import { ZERO_BD, ZERO_BI } from "./constants"

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
      loan.collateralDeposited = ZERO_BD
      loan.collateralization   = ZERO_BD
      loan.debt                = ZERO_BD
      loan.tp                  = ZERO_BD
    }

    return loan
}
