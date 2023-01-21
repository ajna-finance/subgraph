import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ClaimRewards } from "../generated/schema"
import { ClaimRewards as ClaimRewardsEvent } from "../generated/RewardsManager/RewardsManager"
import { handleClaimRewards } from "../src/rewards-manager"
import { createClaimRewardsEvent } from "./rewards-manager-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let owner = Address.fromString("0x0000000000000000000000000000000000000001")
    let ajnaPool = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let tokenId = BigInt.fromI32(234)
    let epochsClaimed = [BigInt.fromI32(234)]
    let amount = BigInt.fromI32(234)
    let newClaimRewardsEvent = createClaimRewardsEvent(
      owner,
      ajnaPool,
      tokenId,
      epochsClaimed,
      amount
    )
    handleClaimRewards(newClaimRewardsEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ClaimRewards created and stored", () => {
    assert.entityCount("ClaimRewards", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ClaimRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "owner",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ClaimRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "ajnaPool",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ClaimRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "tokenId",
      "234"
    )
    assert.fieldEquals(
      "ClaimRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "epochsClaimed",
      "[234]"
    )
    assert.fieldEquals(
      "ClaimRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "amount",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
