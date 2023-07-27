import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { GrantFund } from "../../../generated/schema"
import { GrantFund as GrantFundContract } from "../../../generated/GrantFund/GrantFund"
import { addressToBytes } from "../convert"
import { ZERO_BD } from "../constants"

export function loadOrCreateGrantFund(grantFundAddress: Address): GrantFund {
  let grantFund = GrantFund.load(addressToBytes(grantFundAddress))
  if (grantFund == null) {
    // create new grantFund if one hasn't already been stored
    grantFund = new GrantFund(addressToBytes(grantFundAddress)) as GrantFund
    grantFund.treasury = ZERO_BD
    grantFund.distributionPeriods = []
    grantFund.totalDelegationRewardsClaimed = ZERO_BD
  }
  return grantFund
}

export function getTreasury(grantFundAddress: Address): BigInt {
  const grantFundContract = GrantFundContract.bind(grantFundAddress)
  const getTreasuryResult = grantFundContract.treasury()

  return getTreasuryResult
}
