import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { GrantFund } from "../../../generated/GrantFund/GrantFund"
import { DistributionPeriod } from "../../../generated/schema"

import { FUNDING_PERIOD_LENGTH, ONE_BI, ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../constants"

export function getCurrentDistributionId(): BigInt {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const distributionIdResult = grantFundContract.getDistributionId()
    return BigInt.fromI32(distributionIdResult)
}

export function getCurrentStage(currentBlockNumber: BigInt, distributionPeriod: DistributionPeriod): String {
    if (currentBlockNumber.lt(distributionPeriod.endBlock - FUNDING_PERIOD_LENGTH)) {
        return "SCREENING"
    } else if (currentBlockNumber.gt(distributionPeriod.endBlock - FUNDING_PERIOD_LENGTH) && currentBlockNumber.lt(distributionPeriod.endBlock)) {
        return "FUNDING"
    } else {
        return "CHALLENGE"
    }
}
