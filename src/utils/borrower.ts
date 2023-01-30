import { Borrower } from "../../generated/schema"

import { ZERO_BI } from "./constants"


export function loadOrCreateBorrower(borrowerId: Bytes): Borrower {
    let borrower = Borrower.load(borrowerId)
    if (borrower == null) {
      // create new borrower if borrower hasn't already been stored
      borrower = new Borrower(borrowerId) as Borrower

      borrower.borrows = []
      borrower.pools   = []
      borrower.txCount = ZERO_BI
    }

    return borrower
}