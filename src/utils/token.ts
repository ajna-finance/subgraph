
import { Address, BigInt } from "@graphprotocol/graph-ts"

import { ERC20 } from "../../generated/ERC20PoolFactory/ERC20"

export function getTokenName(tokenAddress: Address): string {
    const tokenNameCall = ERC20.bind(tokenAddress).try_name()
    if (tokenNameCall.reverted) {
        return "unknown"
    } else {
        return tokenNameCall.value
    }
}

export function getTokenSymbol(tokenAddress: Address): string {
    const tokenSymbolCall = ERC20.bind(tokenAddress).try_symbol()
    if (tokenSymbolCall.reverted) {
        return "unknown"
    } else {
        return tokenSymbolCall.value
    }
}

export function getTokenDecimals(tokenAddress: Address): BigInt {
    const tokenDecimalsCall = ERC20.bind(tokenAddress).try_decimals()
    if (tokenDecimalsCall.reverted) {
        return BigInt.fromI32(18)
    } else {
        return BigInt.fromI32(tokenDecimalsCall.value)
    }
}

export function getTokenTotalSupply(tokenAddress: Address): BigInt {
    const tokenTotalSupplyCall = ERC20.bind(tokenAddress).try_totalSupply()
    if (tokenTotalSupplyCall.reverted) {
        return BigInt.fromI32(0)
    } else {
        return tokenTotalSupplyCall.value
    }
}
