#!/bin/bash
ABI_PATH="${1:-../contracts/forge_out}"

# This script generates ABIs from forge output.
# Before running, ensure forge output in your ABI_PATH has been compiled from the 
# appropriate branch and commit.

rm abis/*

jq '.abi' "${ABI_PATH}/ERC20.sol/ERC20.json" > abis/ERC20.json
jq '.abi' "${ABI_PATH}/ERC20Pool.sol/ERC20Pool.json" > abis/ERC20Pool.json
jq '.abi' "${ABI_PATH}/ERC20PoolFactory.sol/ERC20PoolFactory.json" > abis/ERC20PoolFactory.json
jq '.abi' "${ABI_PATH}/ERC721PoolFactory.sol/ERC721PoolFactory.json" > abis/ERC721PoolFactory.json
jq '.abi' "${ABI_PATH}/PoolInfoUtils.sol/PoolInfoUtils.json" > abis/PoolInfoUtils.json
jq '.abi' "${ABI_PATH}/PositionManager.sol/PositionManager.json" > abis/PositionManager.json
jq '.abi' "${ABI_PATH}/RewardsManager.sol/RewardsManager.json" > abis/RewardsManager.json
