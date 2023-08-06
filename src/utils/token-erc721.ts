
import { Address, BigInt } from "@graphprotocol/graph-ts"

import { ERC721 } from "../../generated/ERC721PoolFactory/ERC721"
import { Pool, Token } from "../../generated/schema"
import { ONE_BI } from "./constants"

export function getTokenName(tokenAddress: Address): string {
    const tokenNameCall = ERC721.bind(tokenAddress).try_name()
    if (tokenNameCall.reverted) {
        return "unknown"
    } else {
        return tokenNameCall.value
    }
}

export function getTokenSymbol(tokenAddress: Address): string {
    const tokenSymbolCall = ERC721.bind(tokenAddress).try_symbol()
    if (tokenSymbolCall.reverted) {
        return "N/A"
    } else {
        return tokenSymbolCall.value
    }
}

export function getTokenURI(tokenAddress: Address, tokenId: BigInt): string {
    const tokenURICall = ERC721.bind(tokenAddress).try_tokenURI(tokenId)
    if (tokenURICall.reverted) {
        return "N/A"
    } else {
        return tokenURICall.value
    }
}

export function incrementTokenTxCount(pool: Pool): void {
    // increment token tx count
    const collateralToken = Token.load(pool.collateralToken)!
    collateralToken.txCount = collateralToken.txCount.plus(ONE_BI)
    collateralToken.save()
    const quoteToken = Token.load(pool.quoteToken)!
    quoteToken.txCount = quoteToken.txCount.plus(ONE_BI)
    quoteToken.save()
}
