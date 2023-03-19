#!/bin/bash
ABI_PATH="${1:-../sdk/packages/sdk-api/src/abis}"

rm abis/*
cp "${ABI_PATH}/ERC20.json" abis/
cp "${ABI_PATH}/ERC20Pool.json" abis/
cp "${ABI_PATH}/ERC20PoolFactory.json" abis/
cp "${ABI_PATH}/ERC721PoolFactory.json" abis/
cp "${ABI_PATH}/PoolInfoUtils.json" abis/
cp "${ABI_PATH}/PositionManager.json" abis/
cp "${ABI_PATH}/RewardsManager.json" abis/
