import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  afterEach,
  dataSourceMock,
  logStore,
  log,
  beforeEach
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { handleDelegateRewardClaimed, handleFundTreasury, handleProposalCreated, handleQuarterlyDistributionStarted } from "../src/grant-fund"
import { createDelegateRewardClaimedEvent, createFundTreasuryEvent, createProposalCreatedEvent, createQuarterlyDistributionStartedEvent } from "./utils/grant-fund-utils"
import { DISTRIBUTION_PERIOD_LENGTH, ONE_BI, ONE_WAD_BI, ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../src/utils/constants"
import { bigIntToBytes, wadToDecimal } from "../src/utils/convert"
import { mockFindMechanismOfProposal, mockGetDistributionId } from "./utils/common"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Grant Fund assertions", () => {
  beforeAll(() => {
    // set dataSource.network() return value to "goerli" so constant mapping for poolInfoUtils can be accessed
    dataSourceMock.setNetwork("goerli")
  })

  // beforeEach(() => {
  //   // set dataSource.network() return value to "goerli" so constant mapping for poolInfoUtils can be accessed
  //   dataSourceMock.setNetwork("goerli")
  // })

  afterEach(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("DelegateRewardClaimed created and stored", () => {
    const delegateeAddress_ = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    const grantFundAddress = grantFundNetworkLookUpTable.get(dataSource.network())!
    const distributionId_ = BigInt.fromI32(234)
    const rewardClaimed_ = BigInt.fromI32(234)

    mockGetDistributionId(grantFundAddress, distributionId_)
    const newDelegateRewardClaimedEvent = createDelegateRewardClaimedEvent(
      delegateeAddress_,
      distributionId_,
      rewardClaimed_
    )
    handleDelegateRewardClaimed(newDelegateRewardClaimedEvent)

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
      "distribution",
      `${bigIntToBytes(distributionId_).toHexString()}`
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

  test("startNewDistributionPeriod", () => {
    // mock parameters
    const distributionId = ONE_BI
    const startBlock = ONE_BI
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH)

    const newQuarterlyDistributionStartedEvent = createQuarterlyDistributionStartedEvent(distributionId, startBlock, endBlock)
    handleQuarterlyDistributionStarted(newQuarterlyDistributionStartedEvent)

    const expectedDistributionId = bigIntToBytes(distributionId).toHexString()

    // check DistributionPeriod attributes
    assert.entityCount("DistributionPeriod", 1)
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "startBlock",
      `${startBlock}`
    )
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "endBlock",
      `${endBlock}`
    )
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "totalTokensRequested",
      `${ZERO_BD}`
    )

    // check DistributionPeriod attributes
    assert.entityCount("QuarterlyDistributionStarted", 1)
    assert.fieldEquals(
      "QuarterlyDistributionStarted",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "startBlock_",
      `${startBlock}`
    )
    assert.fieldEquals(
      "QuarterlyDistributionStarted",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "endBlock_",
      `${endBlock}`
    )
  })

  test("FundTreasury", () => {
    // mock parameters
    const amount = ONE_WAD_BI
    const treasuryBalance = ONE_WAD_BI

    const newFundTreasuryEvent = createFundTreasuryEvent(amount, treasuryBalance)
    handleFundTreasury(newFundTreasuryEvent)

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1)
    assert.fieldEquals(
      "GrantFund",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a`,
      "treasury",
      `${wadToDecimal(treasuryBalance)}`
    )
  })

  test("ProposalCreated", () => {
    // mock parameters
    const ajnaTokenAddress = Address.fromString("0x0000000000000000000000000000000000000035")
    const proposalId = ONE_BI
    const proposer = Address.fromString("0x0000000000000000000000000000000000000025")
    const targets = [ajnaTokenAddress, ajnaTokenAddress]
    const values = [ZERO_BI, ZERO_BI]
    const signatures = ["transfer(address,uint256)", "transfer(address,uint256)"]
    const calldatas = [Bytes.fromHexString("0x000000"), Bytes.fromHexString("0x000000")]
    const startBlock = ONE_BI
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH)
    const description = "test proposal"
    const grantFundAddress = grantFundNetworkLookUpTable.get(dataSource.network())!

    // mock GrantFund contract calls
    const expectedMechanism = BigInt.fromI32(0) // standard proposal
    mockFindMechanismOfProposal(proposalId, expectedMechanism)

    const distributionId = BigInt.fromI32(234)
    mockGetDistributionId(grantFundAddress, distributionId)

    // create mock event
    const newProposalCreatedEvent = createProposalCreatedEvent(
      proposalId,
      proposer,
      targets,
      values,
      signatures,
      calldatas,
      startBlock,
      endBlock,
      description
    )
    handleProposalCreated(newProposalCreatedEvent)

    // check Proposal attributes
    assert.entityCount("Proposal", 1)

    // check DistributionPeriod attributes
    assert.entityCount("DistributionPeriod", 1)

    // check DistributionPeriod attributes
    assert.entityCount("GrantFund", 1)
  })

})
