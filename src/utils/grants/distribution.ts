import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { ONE_BI, ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../constants"
import { GrantFund } from "../../../generated/GrantFund/GrantFund"

export function getCurrentDistributionId(): BigInt {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const distributionIdResult = grantFundContract.getDistributionId()
    return BigInt.fromI32(distributionIdResult)
}
