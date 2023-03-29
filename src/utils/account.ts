import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Account, Kick, Lend, Loan, Pool, Settle, Take } from "../../generated/schema"

import { ZERO_BI } from "./constants"


export function loadOrCreateAccount(accountId: Bytes): Account {
    let account = Account.load(accountId)
    if (account == null) {
      // create new account if account hasn't already been stored
      account = new Account(accountId) as Account

      account.kicks           = []
      account.lends           = []
      account.loans           = []
      account.pools           = []
      account.reserveAuctions = []
      account.settles         = []
      account.takes           = []

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
    // TODO: remove Pool from account if no Lends or Loans
}

// update the list of lends initiated by an account, if it hasn't been added already
export function updateAccountLends(account: Account, lend: Lend): void {
    const lends = account.lends
    // get current index of lend in account's list of lends
    const index = lends.indexOf(lend.id)
    if (index == -1) {
        account.lends = account.lends.concat([lend.id])
    }
    // TODO: remove Lend from account if no LP in bucket
}

// update the list of loans initiated by an account, if it hasn't been added already
export function updateAccountLoans(account: Account, loan: Loan): void {
    const loans = account.loans
    // get current index of loan in account's list of loans
    const index = loans.indexOf(loan.id)
    if (index == -1) {
        account.loans = account.loans.concat([loan.id])
    }
}

// update the list of kicks initiated by an account, if it hasn't been added already
export function updateAccountKicks(account: Account, kick: Kick): void {
    const kicks = account.kicks
    // get current index of kick in account's list of kicks
    const index = kicks.indexOf(kick.id)
    if (index == -1) {
        account.kicks = account.kicks.concat([kick.id])
    }
}

// update the list of reserve auctions interacted with by an account, if it hasn't been added already
export function updateAccountReserveAuctions(account: Account, reserveAuctionId: Bytes): void {
    const reserveAuctions = account.reserveAuctions
    // get current index of reserveAuction in account's list of reserveAuctions
    const index = reserveAuctions.indexOf(reserveAuctionId)
    if (index == -1) {
        account.reserveAuctions = account.reserveAuctions.concat([reserveAuctionId])
    }
}


// update the list of settles initiated by an account, if it hasn't been added already
export function updateAccountSettles(account: Account, settle: Settle): void {
    const settles = account.settles
    // get current index of settle in account's list of settles
    const index = settles.indexOf(settle.id)
    if (index == -1) {
        account.settles = account.settles.concat([settle.id])
    }
}

// update the list of takes initiated by an account, if it hasn't been added already
// used by both take and bucket take
export function updateAccountTakes(account: Account, take: Bytes): void {
    const takes = account.takes
    // get current index of take in account's list of takes
    const index = takes.indexOf(take)
    if (index == -1) {
        account.takes = account.takes.concat([take])
    }
}
