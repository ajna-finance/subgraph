#!/bin/bash
ABI_PATH_CONTRACTS="${1:-../ajna-core/forge_out}"
ABI_PATH_GRANTS="${2:-../ajna-grants/out}"

# This script generates ABIs from forge output.
# Before running, ensure forge output in your ABI_PATHs have been compiled from the 
# appropriate branches and commits.

rm abis/*

jq '.abi' "${ABI_PATH_CONTRACTS}/ERC20.sol/ERC20.json" > abis/ERC20.json
jq '.abi' "${ABI_PATH_CONTRACTS}/ERC20Pool.sol/ERC20Pool.json" > abis/ERC20Pool.json
jq '.abi' "${ABI_PATH_CONTRACTS}/ERC20PoolFactory.sol/ERC20PoolFactory.json" > abis/ERC20PoolFactory.json
jq '.abi' "${ABI_PATH_CONTRACTS}/ERC721.sol/ERC721.json" > abis/ERC721.json
jq '.abi' "${ABI_PATH_CONTRACTS}/ERC721Pool.sol/ERC721Pool.json" > abis/ERC721Pool.json
jq '.abi' "${ABI_PATH_CONTRACTS}/ERC721PoolFactory.sol/ERC721PoolFactory.json" > abis/ERC721PoolFactory.json
jq '.abi' "${ABI_PATH_CONTRACTS}/PoolInfoUtils.sol/PoolInfoUtils.json" > abis/PoolInfoUtils.json
jq '.abi' "${ABI_PATH_CONTRACTS}/PoolInfoUtilsMulticall.sol/PoolInfoUtilsMulticall.json" > abis/PoolInfoUtilsMulticall.json

jq '.abi' "${ABI_PATH_CONTRACTS}/PositionManager.sol/PositionManager.json" > abis/PositionManager.json

jq '.abi' "${ABI_PATH_GRANTS}/GrantFund.sol/GrantFund.json" > abis/GrantFund.json
jq '.abi' "${ABI_PATH_GRANTS}/AjnaToken.sol/AjnaToken.json" > abis/AjnaToken.json

# Note this removes the needed BurnWrappedAjna ABI
