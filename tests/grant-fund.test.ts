import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { DelegateRewardClaimed } from "../generated/schema"
import { DelegateRewardClaimed as DelegateRewardClaimedEvent } from "../generated/GrantFund/GrantFund"
import { handleDelegateRewardClaimed } from "../src/grant-fund"
import { createDelegateRewardClaimedEvent } from "./grant-fund-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    const delegateeAddress_ = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    const distributionId_ = BigInt.fromI32(234)
    const rewardClaimed_ = BigInt.fromI32(234)
    const newDelegateRewardClaimedEvent = createDelegateRewardClaimedEvent(
      delegateeAddress_,
      distributionId_,
      rewardClaimed_
    )
    handleDelegateRewardClaimed(newDelegateRewardClaimedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("DelegateRewardClaimed created and stored", () => {
    assert.entityCount("DelegateRewardClaimed", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "DelegateRewardClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "delegateeAddress_",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "DelegateRewardClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "distributionId_",
      "234"
    )
    assert.fieldEquals(
      "DelegateRewardClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "rewardClaimed_",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
