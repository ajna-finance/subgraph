import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Account, Lend, Loan, Pool } from "../../generated/schema"

import { ZERO_BI } from "./constants"


export function loadOrCreateAccount(accountId: Bytes): Account {
    let account = Account.load(accountId)
    if (account == null) {
      // create new account if account hasn't already been stored
      account = new Account(accountId) as Account

      account.kicks   = []
      account.lends   = []
      account.loans   = []
      account.pools   = []
      account.settles = []
      account.takes   = []
      account.txCount = ZERO_BI
    }

    return account
}

// update the list of pools which an account has interacted with, if it hasn't been added already
export function updateAccountPools(account: Account, pool: Pool): void {
    const pools = account.pools
    // get current index of pool in account's list of pools
    const index = pools.indexOf(pool.id)
    if (index == -1) {
        account.pools = account.pools.concat([pool.id])
    }
}

// update the list of lends initiated by an account, if it hasn't been added already
export function updateAccountLends(account: Account, lend: Lend): void {
    const lends = account.lends
    // get current index of pool in account's list of pools
    const index = lends.indexOf(lend.id)
    if (index == -1) {
        account.lends = account.lends.concat([lend.id])
    }
}

// update the list of loans initiated by an account, if it hasn't been added already
export function updateAccountLoans(account: Account, loan: Loan): void {
    const loans = account.loans
    // get current index of pool in account's list of pools
    const index = loans.indexOf(loan.id)
    if (index == -1) {
        account.loans = account.loans.concat([loan.id])
    }
}