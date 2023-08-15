import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  log,
  logStore,
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, dataSource, ethereum } from "@graphprotocol/graph-ts";
import {
  handleDelegateRewardClaimed,
  handleFundTreasury,
  handleProposalCreated,
  handleProposalExecuted,
  handleDistributionPeriodStarted,
  handleVoteCast,
  handleFundedSlateUpdated,
} from "../src/grant-fund";
import {
  createDelegateRewardClaimedEvent,
  createFundTreasuryEvent,
  createProposalCreatedEvent,
  createProposalExecutedEvent,
  createDistributionPeriodStartedEvent,
  createVoteCastEvent,
  createFundedSlateUpdatedEvent,
} from "./utils/grant-fund-utils";
import {
  DISTRIBUTION_PERIOD_LENGTH,
  NEG_ONE_BD,
  ONE_BI,
  ONE_WAD_BI,
  SCREENING_PERIOD_LENGTH,
  ZERO_BD,
  ZERO_BI,
} from "../src/utils/constants";
import { addressToBytes, bigIntToBytes, decimalToWad, wadToDecimal } from "../src/utils/convert";
import { mockGetDistributionId, mockGetFundedProposalSlate, mockGetTreasury, mockGetVotesFunding, mockGetVotesScreening } from "./utils/common";
import { getDistributionPeriodVoteId, getFundingVoteId, getScreeningVoteId } from "../src/utils/grants/voter";

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
    const grantFundAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")

    mockGetTreasury(grantFundAddress, ONE_WAD_BI);

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
      "totalTokensDistributed",
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
    const grantFundAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")

    mockGetTreasury(grantFundAddress, treasuryBalance)

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
    assert.fieldEquals(
      "FundTreasury",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "treasuryBalance",
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

    // encode mock calldatas
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];

    // use hardcoded output of encode("transfer(address,uint256)")
    // as assembly script doesn't support encodeWithSelector
    // 0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000
    // ==
    // (0xc91f4871cfDd1947DF6C23771F230853E0e27407, 1000 * 1e18)
    const calldatas = [
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000"),
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000")
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
    mockGetTreasury(grantFundAddress, ONE_WAD_BI);

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
    assert.entityCount("ProposalParams", 2);

    // check DistributionPeriod attributes
    assert.entityCount("DistributionPeriod", 1);

    // check DistributionPeriod attributes
    assert.entityCount("GrantFund", 1);

    const expectedDistributionId = bigIntToBytes(distributionId).toHexString();

    assert.fieldEquals(
      "Proposal",
      `${bigIntToBytes(proposalId).toHexString()}`,
      "proposalId",
      `${proposalId}`
    );

    assert.fieldEquals(
      "Proposal",
      `${bigIntToBytes(proposalId).toHexString()}`,
      "distribution",
      `${expectedDistributionId}`
    );

    assert.fieldEquals(
      "Proposal",
      `${bigIntToBytes(proposalId).toHexString()}`,
      "totalTokensRequested",
      `${wadToDecimal(BigInt.fromString("2000000000000000000000"))}` // 2000 * 1e18
    );

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

    // encode mock calldatas
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];

    // use hardcoded output of encode("transfer(address,uint256)")
    // as assembly script doesn't support encodeWithSelector
    // 0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000
    // ==
    // (0xc91f4871cfDd1947DF6C23771F230853E0e27407, 1000 * 1e18)
    const calldatas = [
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000"),
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000")
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

    mockGetTreasury(grantFundAddress, ONE_WAD_BI);

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

    const expectedDistributionId = bigIntToBytes(distributionId).toHexString();

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);
    assert.entityCount("ProposalParams", 2);

    // check ProposalExecuted attributes
    assert.entityCount("ProposalExecuted", 1);

    assert.fieldEquals(
      "Proposal",
      `${bigIntToBytes(proposalId).toHexString()}`,
      "description",
      `${description}`
    );

    assert.fieldEquals(
      "Proposal",
      `${bigIntToBytes(proposalId).toHexString()}`,
      "totalTokensRequested",
      `${wadToDecimal(BigInt.fromString("2000000000000000000000"))}` // 2000 * 1e18
    );

    assert.fieldEquals(
      "Proposal",
      `${bigIntToBytes(proposalId).toHexString()}`,
      "executed",
      `${true}`
    );

    assert.fieldEquals(
      "ProposalExecuted",
      `0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000`,
      "proposalId",
      `${proposalId}`
    );
    assert.fieldEquals(
      "DistributionPeriod",
      `${expectedDistributionId}`,
      "totalTokensDistributed",
      `${wadToDecimal(BigInt.fromString("2000000000000000000000"))}` // 2000 * 1e18
    );

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

    // encode mock calldatas
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];

    // use hardcoded output of encode("transfer(address,uint256)")
    // as assembly script doesn't support encodeWithSelector
    // 0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000
    // ==
    // (0xc91f4871cfDd1947DF6C23771F230853E0e27407, 1000 * 1e18)
    const calldatas = [
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000"),
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000")
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
    assert.entityCount("ProposalParams", 2);

    // check Proposal attributes
    assert.entityCount("DistributionPeriodVote", 1);

    assert.entityCount("ScreeningVote", 1);

    const distributionPeriodVoteId = getDistributionPeriodVoteId(bigIntToBytes(distributionId), addressToBytes(voter));
    const screeningVoteId = getScreeningVoteId(bigIntToBytes(proposalId), addressToBytes(voter), bigIntToBytes(distributionId));

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "distribution",
      `${bigIntToBytes(distributionId).toHexString()}`
    );

    assert.fieldEquals(
      "ScreeningVote",
      `${screeningVoteId.toHexString()}`,
      "totalVotesCast",
      `${wadToDecimal(votesCast)}`
    );
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

    // encode mock calldatas
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];

    // use hardcoded output of encode("transfer(address,uint256)")
    // as assembly script doesn't support encodeWithSelector
    // 0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000
    // ==
    // (0xc91f4871cfDd1947DF6C23771F230853E0e27407, 1000 * 1e18)
    const calldatas = [
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000"),
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000")
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
    let support = 1;
    let votesCast = BigInt.fromI32(234);
    const reason = ""

    // mock contract calls
    mockGetVotesScreening(grantFundAddress, distributionId, voter, votesCast);

    const screeningVoteCastEvent = createVoteCastEvent(voter, proposalId, support, votesCast, reason, startBlock, BigInt.fromI32(1));
    handleVoteCast(screeningVoteCastEvent);

    /*****************************/
    /*** Funding Vote Proposal ***/
    /*****************************/

    const fundingVotingPower = votesCast.times(votesCast);

    mockGetVotesFunding(grantFundAddress, distributionId, voter, fundingVotingPower);

    support = 0;
    votesCast = BigInt.fromI32(-234);

    const fundingVoteCastEvent = createVoteCastEvent(voter, proposalId, support, votesCast, reason, startBlock.plus(SCREENING_PERIOD_LENGTH).plus(BigInt.fromI32(1)), BigInt.fromI32(2));
    handleVoteCast(fundingVoteCastEvent);

    /********************/
    /*** Assert State ***/
    /********************/

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);
    assert.entityCount("ProposalParams", 2);

    assert.entityCount("DistributionPeriod", 1);
    assert.entityCount("DistributionPeriodVote", 1);
    assert.entityCount("FundingVote", 1);
    assert.entityCount("ScreeningVote", 1);
    assert.entityCount("VoteCast", 2);

    const expectedProposalId = bigIntToBytes(proposalId).toHexString();
    const expectedDistributionId = bigIntToBytes(distributionId).toHexString();
    const distributionPeriodVoteId = getDistributionPeriodVoteId(bigIntToBytes(distributionId), addressToBytes(voter));
    const fundingVoteId = getFundingVoteId(bigIntToBytes(proposalId), addressToBytes(voter), bigIntToBytes(distributionId));
    const screeningVoteId = getScreeningVoteId(bigIntToBytes(proposalId), addressToBytes(voter), bigIntToBytes(distributionId));
    const expectedVotingPowerUsed = wadToDecimal(votesCast).times(wadToDecimal(votesCast));
    const expectedScreeningVotesReceived = wadToDecimal(votesCast).times(NEG_ONE_BD);

    assert.fieldEquals(
      "Proposal",
      `${expectedProposalId}`,
      "screeningVotesReceived",
      `${expectedScreeningVotesReceived}`
    );

    assert.fieldEquals(
      "Proposal",
      `${expectedProposalId}`,
      "fundingVotesReceived",
      `${wadToDecimal(votesCast)}`
    );
    assert.fieldEquals(
      "Proposal",
      `${expectedProposalId}`,
      "fundingVotesNegative",
      `${wadToDecimal(votesCast)}`
    );
    assert.fieldEquals(
      "Proposal",
      `${expectedProposalId}`,
      "fundingVotesPositive",
      `${0}`
    );

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "distribution",
      `${expectedDistributionId}`
    );

    // access ScreeningVote entity and attributes
    assert.fieldEquals(
      "ScreeningVote",
      `${screeningVoteId.toHexString()}`,
      "totalVotesCast",
      `${expectedScreeningVotesReceived}`
    );

    // check DistributionPeriodVote attributes
    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "estimatedInitialFundingStageVotingPowerForCalculatingRewards",
      '0.000000000000054756'
    );

    assert.fieldEquals(
      "DistributionPeriodVote",
      `${distributionPeriodVoteId.toHexString()}`,
      "estimatedRemainingFundingStageVotingPowerForCalculatingRewards",
      '0.000000000000054755999999999999945244'
    );

    // check FundingVote attributes
    assert.fieldEquals(
      "FundingVote",
      `${fundingVoteId.toHexString()}`,
      "distribution",
      `${expectedDistributionId}`
    );
    assert.fieldEquals(
      "FundingVote",
      `${fundingVoteId.toHexString()}`,
      "voter",
      `${voter.toHexString()}`
    );
    assert.fieldEquals(
      "FundingVote",
      `${fundingVoteId.toHexString()}`,
      "totalVotesCast",
      `${wadToDecimal(votesCast)}`
    );
    assert.fieldEquals(
      "FundingVote",
      `${fundingVoteId.toHexString()}`,
      "votingPowerUsed",
      `${expectedVotingPowerUsed}`
    );

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

  test("FundedSlateUpdated", () => {

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

    // encode mock calldatas
    const targets = [ajnaTokenAddress, ajnaTokenAddress];
    const values = [ZERO_BI, ZERO_BI];
    const signatures = [
      "transfer(address,uint256)",
      "transfer(address,uint256)",
    ];

    // use hardcoded output of encode("transfer(address,uint256)")
    // as assembly script doesn't support encodeWithSelector
    // 0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000
    // ==
    // (0xc91f4871cfDd1947DF6C23771F230853E0e27407, 1000 * 1e18)
    const calldatas = [
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000"),
      Bytes.fromHexString("0xa9059cbb000000000000000000000000c91f4871cfdd1947df6c23771f230853e0e2740700000000000000000000000000000000000000000000003635c9adc5dea00000")
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

    /*****************************/
    /*** Funding Vote Proposal ***/
    /*****************************/

    // mock parameters
    const voter = Address.fromString("0x0000000000000000000000000000000000000050");
    const votesCast = BigInt.fromString("-234000000000000000000")
    const reason = ""

    const fundingVotingPower = votesCast.times(votesCast);

    mockGetVotesFunding(grantFundAddress, distributionId, voter, fundingVotingPower);

    const fundingVoteCastEvent = createVoteCastEvent(voter, proposalId, 0, votesCast, reason, startBlock.plus(SCREENING_PERIOD_LENGTH).plus(BigInt.fromI32(1)), BigInt.fromI32(1));
    handleVoteCast(fundingVoteCastEvent);

    /********************/
    /*** Update Slate ***/
    /********************/

    const fundedProposalSlate = [proposalId]
    const fundedSlateHash = Bytes.fromHexString("0x000010")

    mockGetFundedProposalSlate(grantFundAddress, fundedSlateHash, fundedProposalSlate);

    const updateSlateEvent = createFundedSlateUpdatedEvent(distributionId, fundedSlateHash)
    handleFundedSlateUpdated(updateSlateEvent);

    /********************/
    /*** Assert State ***/
    /********************/

    // check GrantFund attributes
    assert.entityCount("GrantFund", 1);

    // check Proposal attributes
    assert.entityCount("Proposal", 1);
    assert.entityCount("ProposalParams", 2);

    assert.entityCount("DistributionPeriod", 1);
    assert.entityCount("FundedSlate", 1);

    // check FundedSlate attributes
    assert.fieldEquals(
      "FundedSlate",
      `${fundedSlateHash.toHexString()}`,
      "totalFundingVotesReceived",
      `${wadToDecimal(votesCast)}`
    );
    assert.fieldEquals(
      "FundedSlate",
      `${fundedSlateHash.toHexString()}`,
      "totalTokensRequested",
      `${wadToDecimal(BigInt.fromString("2000000000000000000000"))}` // 1000 * 1e18
    );
  });
});
