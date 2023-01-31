import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

import { handlePoolCreated } from "../../src/erc-20-pool-factory"
import { createPoolCreatedEvent } from "./erc-20-pool-factory-utils"

// create a pool entity and save it to the store
export function createPool(pool_: Address, collateral: Address, quote: Address): void {
    // mock contract calls
    createMockedFunction(pool_, 'collateralAddress', 'collateralAddress():(address)')
      .withArgs([])
      .returns([ethereum.Value.fromAddress(collateral)])
    createMockedFunction(pool_, 'quoteTokenAddress', 'quoteTokenAddress():(address)')
      .withArgs([])
      .returns([ethereum.Value.fromAddress(quote)])

    // mock PoolCreated event
    const newPoolCreatedEvent = createPoolCreatedEvent(pool_)
    handlePoolCreated(newPoolCreatedEvent)
}

// mock getPoolReserves contract calls
export function mockGetPoolReserves(poolAddress: Address, token: Address, expectedValue: BigInt): void {
    createMockedFunction(token, 'balanceOf', 'balanceOf(address):(uint256)')
      .withArgs([ethereum.Value.fromAddress(poolAddress)])
      .returns([ethereum.Value.fromUnsignedBigInt(expectedValue)])
}