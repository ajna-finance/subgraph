import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  log,
  logStore,
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import {
  handleDelegateRewardClaimed,
  handleFundTreasury,
  handleProposalCreated,
  handleProposalExecuted,
  handleDistributionPeriodStarted,
  handleVoteCast,
} from "../src/grant-fund";
import {
  createDelegateRewardClaimedEvent,
  createFundTreasuryEvent,
  createProposalCreatedEvent,
  createProposalExecutedEvent,
  createDistributionPeriodStartedEvent,
  createVoteCastEvent,
} from "./utils/grant-fund-utils";
import {
  DISTRIBUTION_PERIOD_LENGTH,
  ONE_BI,
  ONE_WAD_BI,
  SCREENING_PERIOD_LENGTH,
  ZERO_BD,
  ZERO_BI,
} from "../src/utils/constants";
import { addressToBytes, bigIntToBytes, decimalToWad, wadToDecimal } from "../src/utils/convert";
import { mockGetDistributionId, mockGetVotesFunding, mockGetVotesScreening } from "./utils/common";
import { getDistributionPeriodVoteId } from "../src/utils/grants/voter";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Grant Fund assertions", () => {
  afterEach(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("DelegateRewardClaimed created and stored", () => {
    const grantFundAddress = Address.fromString("0x00000000000000000000006772616E7466756E64")
    const delegateeAddress_ = Address.fromString("0x0000000000000000000000000000000000000001")
    const distributionId_ = BigInt.fromI32(234);
    const rewardClaimed_ = BigInt.fromI32(234);

    mockGetDistributionId(grantFundAddress, distributionId_);
    const newDelegateRewardClaimedEvent = createDelegateRewardClaimedEvent(
      delegateeAddress_,
      distributionId_,
      rewardClaimed_
    );
    newDelegateRewardClaimedEvent.address = grantFundAddress
    handleDelegateRewardClaimed(newDelegateRewardClaimedEvent);

    assert.entityCount("DelegateRewardClaimed", 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000 is the default address used in newMockEvent() function
    assert.fieldEquals(
      "DelegateRewardClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "delegateeAddress_",
      "0x0000000000000000000000000000000000000001"
    );
    assert.fieldEquals(
      "DelegateRewardClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "distribution",
      `${bigIntToBytes(distributionId_).toHexString()}`
    );
    assert.fieldEquals(
      "DelegateRewardClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000",
      "rewardClaimed_",
      "234"
    );

    // assert custom entities
    assert.entityCount("GrantFund", 1);
    assert.entityCount("DistributionPeriod", 1);
  });

  test("startNewDistributionPeriod", () => {
    // mock parameters
    const distributionId = ONE_BI;
    const startBlock = ONE_BI;
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH);

    const newDistributionPeriodStartedEvent = createDistributionPeriodStartedEvent(
      distributionId,
      startBlock,
      endBlock
    );
    handleDistributionPeriodStarted(newDistributionPeriodStartedEvent);

    const expectedDistributionId = bigIntToBytes(distributionId).toHexString();

    // check DistributionPeriod attributes
    assert.entityCount("DistributionPeriod", 1);
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "startBlock",
      `${startBlock}`
    );
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "endBlock",
      `${endBlock}`
    );
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "totalTokensRequested",
      `${ZERO_BD}`
    );

    // check DistributionPeriod attributes
    assert.entityCount("DistributionPeriodStarted", 1);
    assert.fieldEquals(
      "DistributionPeriodStarted",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "startBlock",
      `${startBlock}`
    );
    assert.fieldEquals(
      "DistributionPeriodStarted",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "endBlock",
      `${endBlock}`
    );

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);
  });

  test("FundTreasury", () => {
    // mock parameters
    const amount = ONE_WAD_BI;
    const treasuryBalance = ONE_WAD_BI;

    const newFundTreasuryEvent = createFundTreasuryEvent(
      amount,
      treasuryBalance
    );
    handleFundTreasury(newFundTreasuryEvent);

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);
    assert.fieldEquals(
      "GrantFund",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a`,
      "treasury",
      `${wadToDecimal(treasuryBalance)}`
    );
  });

  test("ProposalCreated", () => {
    // mock parameters
    const grantFundAddress = Address.fromString("0x00000000000000000000006772616E7466756E64")
    const ajnaTokenAddress = Address.fromString(
      "0x0000000000000000000000000000000000000035"
    );
    const proposalId = ONE_BI;
    const proposer = Address.fromString(
      "0x0000000000000000000000000000000000000025"
    );
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];
    const calldatas = [
      Bytes.fromHexString("0x000000"),
      Bytes.fromHexString("0x000000"),
    ];
    const distributionId = BigInt.fromI32(234);
    const startBlock = ONE_BI;
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH);
    const description = "test proposal";

    // mock GrantFund contract calls
    const newDistributionPeriodStartedEvent = createDistributionPeriodStartedEvent(
      distributionId,
      startBlock,
      endBlock
    );
    newDistributionPeriodStartedEvent.address = grantFundAddress
    handleDistributionPeriodStarted(newDistributionPeriodStartedEvent);
    mockGetDistributionId(grantFundAddress, distributionId);

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
    );
    newProposalCreatedEvent.address = grantFundAddress
    handleProposalCreated(newProposalCreatedEvent);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);

    // check DistributionPeriod attributes
    assert.entityCount("DistributionPeriod", 1);

    // check DistributionPeriod attributes
    assert.entityCount("GrantFund", 1);
  });

  test("ProposalExecuted", () => {
    /***********************/
    /*** Submit Proposal ***/
    /***********************/

    // mock parameters
    const ajnaTokenAddress = Address.fromString("0x0000000000000000000000000000000000000035");
    const grantFundAddress = Address.fromString("0x00000000000000000000006772616E7466756E64")
    const proposalId = BigInt.fromI32(234);
    const proposer = Address.fromString(
      "0x0000000000000000000000000000000000000025"
    );
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];
    const calldatas = [
      Bytes.fromHexString("0x000000"),
      Bytes.fromHexString("0x000000"),
    ];
    const distributionId = BigInt.fromI32(234);
    const startBlock = ONE_BI;
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH);
    const description = "test proposal";

    // mock GrantFund contract calls
    const newDistributionPeriodStartedEvent = createDistributionPeriodStartedEvent(
      distributionId,
      startBlock,
      endBlock
    );
    newDistributionPeriodStartedEvent.address = grantFundAddress
    handleDistributionPeriodStarted(newDistributionPeriodStartedEvent);
    mockGetDistributionId(grantFundAddress, distributionId);

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
    );
    newProposalCreatedEvent.address = grantFundAddress
    handleProposalCreated(newProposalCreatedEvent);

    /************************/
    /*** Execute Proposal ***/
    /************************/

    const newProposalExecutedEvent = createProposalExecutedEvent(proposalId);
    newProposalExecutedEvent.address =  grantFundAddress
    handleProposalExecuted(newProposalExecutedEvent);

    /********************/
    /*** Assert State ***/
    /********************/

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);

    // check ProposalExecuted attributes
    assert.entityCount("ProposalExecuted", 1);
  });

  test("ScreeningVote", () => {
    /***********************/
    /*** Submit Proposal ***/
    /***********************/

    // mock parameters
    const ajnaTokenAddress = Address.fromString("0x0000000000000000000000000000000000000035");
    const grantFundAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
    const proposalId = BigInt.fromI32(234);
    const proposer = Address.fromString(
      "0x0000000000000000000000000000000000000025"
    );
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];
    const calldatas = [
      Bytes.fromHexString("0x000000"),
      Bytes.fromHexString("0x000000"),
    ];
    const distributionId = ONE_BI;
    const startBlock = ONE_BI;
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH);
    const description = "test proposal";

    // start distribution period
    // mock GrantFund contract calls
    const newDistributionPeriodStartedEvent = createDistributionPeriodStartedEvent(
      distributionId,
      startBlock,
      endBlock
    );
    newDistributionPeriodStartedEvent.address = grantFundAddress
    handleDistributionPeriodStarted(newDistributionPeriodStartedEvent);
    mockGetDistributionId(grantFundAddress, distributionId);

    // submit proposal
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
    );
    newProposalCreatedEvent.address = grantFundAddress
    handleProposalCreated(newProposalCreatedEvent);

    /*******************************/
    /*** Screening Vote Proposal ***/
    /*******************************/

    // mock parameters
    const voter = Address.fromString("0x0000000000000000000000000000000000000050");
    const votesCast = BigInt.fromI32(234);
    const reason = ""

    // mock contract calls
    mockGetVotesScreening(grantFundAddress, distributionId, voter, votesCast);

    const screeningVoteCastEvent = createVoteCastEvent(voter, proposalId, 1, votesCast, reason, startBlock, BigInt.fromI32(1));
    handleVoteCast(screeningVoteCastEvent);

    /********************/
    /*** Assert State ***/
    /********************/

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);

    // check Proposal attributes
    assert.entityCount("DistributionPeriodVote", 1);

    assert.entityCount("ScreeningVote", 1);

    const distributionPeriodVoteId = getDistributionPeriodVoteId(bigIntToBytes(distributionId), addressToBytes(voter));

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "screeningStageVotingPower",
      `${wadToDecimal(votesCast)}`
    );
  });

  test("getFundingVotingPowerUsed", () => {

  });


  test("FundingVote", () => {
    /***********************/
    /*** Submit Proposal ***/
    /***********************/

    // mock parameters
    const ajnaTokenAddress = Address.fromString("0x0000000000000000000000000000000000000035");
    const grantFundAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
    const proposalId = BigInt.fromI32(234);
    const proposer = Address.fromString(
      "0x0000000000000000000000000000000000000025"
    );
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];
    const calldatas = [
      Bytes.fromHexString("0x000000"),
      Bytes.fromHexString("0x000000"),
    ];
    const distributionId = ONE_BI;
    const startBlock = ONE_BI;
    const endBlock = startBlock.plus(DISTRIBUTION_PERIOD_LENGTH);
    const description = "test proposal";

    // start distribution period
    // mock GrantFund contract calls
    const newDistributionPeriodStartedEvent = createDistributionPeriodStartedEvent(
      distributionId,
      startBlock,
      endBlock
    );
    newDistributionPeriodStartedEvent.address = grantFundAddress
    handleDistributionPeriodStarted(newDistributionPeriodStartedEvent);
    mockGetDistributionId(grantFundAddress, distributionId);

    // submit proposal
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
    );
    newProposalCreatedEvent.address = grantFundAddress
    handleProposalCreated(newProposalCreatedEvent);

    /*******************************/
    /*** Screening Vote Proposal ***/
    /*******************************/

    // mock parameters
    const voter = Address.fromString("0x0000000000000000000000000000000000000050");
    let votesCast = BigInt.fromI32(234);
    const reason = ""

    // mock contract calls
    mockGetVotesScreening(grantFundAddress, distributionId, voter, votesCast);

    const screeningVoteCastEvent = createVoteCastEvent(voter, proposalId, 1, votesCast, reason, startBlock, BigInt.fromI32(1));
    handleVoteCast(screeningVoteCastEvent);

    // TODO: advance state to funding stage

    /*****************************/
    /*** Funding Vote Proposal ***/
    /*****************************/

    // TODO: need to convert back from WAD
    const fundingVotingPower = votesCast.times(votesCast);

    mockGetVotesFunding(grantFundAddress, distributionId, voter, fundingVotingPower);

    votesCast = BigInt.fromI32(-234);
    const fundingVoteCastEvent = createVoteCastEvent(voter, proposalId, 0, votesCast, reason, startBlock.plus(SCREENING_PERIOD_LENGTH).plus(BigInt.fromI32(1)), BigInt.fromI32(2));
    handleVoteCast(fundingVoteCastEvent);

    /********************/
    /*** Assert State ***/
    /********************/

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);

    assert.entityCount("VoteCast", 2);
    assert.entityCount("FundingVote", 1);
    assert.entityCount("ScreeningVote", 1);
    assert.entityCount("DistributionPeriodVote", 1);

    const distributionPeriodVoteId = getDistributionPeriodVoteId(bigIntToBytes(distributionId), addressToBytes(voter));
    const expectedDistributionId = bigIntToBytes(distributionId).toHexString();
    const expectedVotingPowerUsed = wadToDecimal(votesCast.times(votesCast));

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "screeningStageVotingPower",
      `${wadToDecimal(votesCast.times(BigInt.fromI32(-1)))}`
    );

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "initialFundingStageVotingPower",
      `${expectedVotingPowerUsed}`
    );

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "remainingFundingStageVotingPower",
      `${0}`
    );

    // TODO: check funding vote attributes

    // check DistributionPeriod attributes
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "startBlock",
      `${startBlock}`
    );
    // check DistributionPeriod attributes
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "fundingVotePowerUsed",
      `${expectedVotingPowerUsed}`
    );

  });

  test("FundedSlateUpdated", () => {});
});
