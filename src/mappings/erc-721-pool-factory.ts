import { PoolCreated as PoolCreatedEvent } from "../../generated/ERC721PoolFactory/ERC721PoolFactory"
import { PoolCreated, Token } from "../../generated/schema"
import { ERC721Pool } from "../../generated/templates"
import { ERC721Pool as ERC721PoolContract } from "../../generated/templates/ERC721Pool/ERC721Pool"

import { ONE_BI, ZERO_BI } from "../utils/constants"
import { addressToBytes, wadToDecimal } from "../utils/convert"
import { loadOrCreateFactory } from "../utils/pool/pool-factory"
import { getPoolSubsetHash, getRatesAndFees, loadOrCreatePool, updateTokenPools } from "../utils/pool/pool"
import { getTokenName as getTokenNameERC721, getTokenSymbol as getTokenSymbolERC721} from "../utils/token-erc721"
import { getTokenDecimals, getTokenName, getTokenSymbol, getTokenTotalSupply } from "../utils/token-erc20"
import { BigInt, ByteArray, Bytes, ethereum } from "@graphprotocol/graph-ts"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  const poolCreated = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  poolCreated.pool = event.params.pool_
  poolCreated.poolType = "ERC721"
  poolCreated.factory = event.address;

  poolCreated.blockNumber = event.block.number
  poolCreated.blockTimestamp = event.block.timestamp
  poolCreated.transactionHash = event.transaction.hash

  // record factory information
  let factory = loadOrCreateFactory(event.address, "ERC721")
  factory.poolCount = factory.poolCount.plus(ONE_BI)
  factory.txCount   = factory.txCount.plus(ONE_BI)

  // instantiate pool contract
  const poolContract = ERC721PoolContract.bind(event.params.pool_)

  // get pool initial interest rate
  const interestRateResults = poolContract.interestRateInfo()
  const ratesAndFees        = getRatesAndFees(event.params.pool_)

  // https://ethereum.stackexchange.com/questions/114582/the-graph-nodes-cant-decode-abi-encoded-data-containing-arrays
  const dataWithoutSelector = event.transaction.input.subarray(4)

  //prepend a "tuple" prefix (function params are arrays, not tuples)
  const tuplePrefix = ByteArray.fromHexString(
    '0x0000000000000000000000000000000000000000000000000000000000000020'
  );

  const dataWithoutSelectorAsTuple = new Uint8Array(tuplePrefix.length + dataWithoutSelector.length);
  dataWithoutSelectorAsTuple.set(tuplePrefix, 0);
  dataWithoutSelectorAsTuple.set(dataWithoutSelector, tuplePrefix.length);

  // handle decoding transaction calldata
  const tryDecodeSubset = ethereum.decode('(address,address,uint256[],uint256)', Bytes.fromUint8Array(dataWithoutSelectorAsTuple))
  const tryDecodeCollection = ethereum.decode('(address,address,uint256)', Bytes.fromUint8Array(dataWithoutSelector))
  const decoded = (tryDecodeSubset != null ? tryDecodeSubset : tryDecodeCollection)!

  // retrieve token addresses from calldata
  const collateralTokenAddress = decoded.toTuple()[0].toAddress()
  const quoteTokenAddress      = decoded.toTuple()[1].toAddress()

  // decode subset tokenIds if available
  let tokenIds: Array<BigInt> = []
  if (decoded.toTuple().length == 4) {
    tokenIds = decoded.toTuple()[2].toBigIntArray()
  }

  // create Token entites associated with the pool
  const collateralTokenAddressBytes = addressToBytes(collateralTokenAddress)
  const quoteTokenAddressBytes = addressToBytes(quoteTokenAddress)

  // record token information
  let collateralToken = Token.load(collateralTokenAddressBytes)
  if (collateralToken == null) {
    // create new token if it doesn't exist already
    collateralToken = new Token(collateralTokenAddressBytes) as Token
    collateralToken.name = getTokenNameERC721(collateralTokenAddress)
    collateralToken.symbol = getTokenSymbolERC721(collateralTokenAddress)
    collateralToken.txCount = ZERO_BI
    collateralToken.poolCount = ONE_BI
    collateralToken.tokenType = "ERC721"
    collateralToken.pools = []
  } else {
    collateralToken.poolCount = collateralToken.poolCount.plus(ONE_BI)
  }
  let quoteToken = Token.load(quoteTokenAddressBytes)
  if (quoteToken == null) {
    // create new token if it doesn't exist already
    quoteToken = new Token(quoteTokenAddressBytes) as Token
    quoteToken.name = getTokenName(quoteTokenAddress)
    quoteToken.symbol = getTokenSymbol(quoteTokenAddress)
    quoteToken.decimals = getTokenDecimals(quoteTokenAddress)
    quoteToken.totalSupply = getTokenTotalSupply(quoteTokenAddress)
    quoteToken.txCount = ZERO_BI
    quoteToken.tokenType = "ERC20"
    quoteToken.poolCount = ONE_BI
    quoteToken.pools = []
  } else {
    quoteToken.poolCount = quoteToken.poolCount.plus(ONE_BI)
  }

  // create pool entity
  const pool = loadOrCreatePool(event.params.pool_)
  ERC721Pool.create(event.params.pool_) // create pool template

  // update list of pools including these tokens
  updateTokenPools(collateralToken, pool)
  updateTokenPools(quoteToken, pool)

  // record pool metadata
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.txCount = ZERO_BI

  // record pool token information
  pool.collateralToken = collateralToken.id
  pool.quoteToken = quoteToken.id

  // record pool rate information
  pool.borrowRate = wadToDecimal(interestRateResults.value0)
  pool.borrowFeeRate = wadToDecimal(ratesAndFees.borrowFeeRate)
  pool.depositFeeRate = wadToDecimal(ratesAndFees.depositFeeRate)

  // record ERC721Pool tokenId information
  if (tokenIds.length > 0) {
    pool.poolType = "Subset"
    pool.subsetHash = getPoolSubsetHash(event.address, tokenIds)
  } else {
    pool.poolType = "Collection"
    pool.subsetHash = Bytes.fromHexString("0x93e3b87db48beb11f82ff978661ba6e96f72f582300e9724191ab4b5d7964364")
  }
  pool.tokenIdsAllowed = tokenIds

  // add pool reference to factories' list of pools
  factory.pools = factory.pools.concat([pool.id])

  // save entities to the store
  collateralToken.save()
  quoteToken.save()
  factory.save()
  pool.save()
  poolCreated.save()
}
