import { Address, BigInt } from "@graphprotocol/graph-ts";

import { ERC20 } from "../../generated/ERC20PoolFactory/ERC20";
import { DSToken } from "../../generated/ERC20PoolFactory/DSToken";
import { Pool, Token } from "../../generated/schema";
import { ONE_BI, ZERO_BI } from "./constants";

export function getTokenBalance(
  tokenAddress: Address,
  address: Address
): BigInt {
  const balanceOfCall = ERC20.bind(tokenAddress).try_balanceOf(address);
  if (balanceOfCall.reverted) {
    return ZERO_BI;
  } else {
    return balanceOfCall.value;
  }
}

export function getTokenName(tokenAddress: Address): string {
  const tokenNameCall = ERC20.bind(tokenAddress).try_name();
  if (tokenNameCall.reverted) {
    const tokenBytes32NameCall = DSToken.bind(tokenAddress).try_name();
    if (tokenBytes32NameCall.value) {
      return tokenBytes32NameCall.value.toString();
    }

    return "unknown";
  } else {
    return tokenNameCall.value;
  }
}

export function getTokenSymbol(tokenAddress: Address): string {
  const tokenSymbolCall = ERC20.bind(tokenAddress).try_symbol();
  if (tokenSymbolCall.reverted) {
    const tokenBytes32SymbolCall = DSToken.bind(tokenAddress).try_symbol();
    if (tokenBytes32SymbolCall.value) {
      return tokenBytes32SymbolCall.value.toString();
    }

    return "unknown";
  } else {
    return tokenSymbolCall.value;
  }
}

export function getTokenDecimals(tokenAddress: Address): u32 {
  const tokenDecimalsCall = ERC20.bind(tokenAddress).try_decimals();
  if (tokenDecimalsCall.reverted) {
    return 18;
  } else {
    return tokenDecimalsCall.value;
  }
}

export function getTokenTotalSupply(tokenAddress: Address): BigInt {
  const tokenTotalSupplyCall = ERC20.bind(tokenAddress).try_totalSupply();
  if (tokenTotalSupplyCall.reverted) {
    return BigInt.fromI32(0);
  } else {
    return tokenTotalSupplyCall.value;
  }
}

export function incrementTokenTxCount(pool: Pool): void {
  // increment token tx count
  const collateralToken = Token.load(pool.collateralToken)!;
  collateralToken.txCount = collateralToken.txCount.plus(ONE_BI);
  collateralToken.save();
  const quoteToken = Token.load(pool.quoteToken)!;
  quoteToken.txCount = quoteToken.txCount.plus(ONE_BI);
  quoteToken.save();
}
