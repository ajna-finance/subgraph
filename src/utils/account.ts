import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Account, Pool } from "../../generated/schema"

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