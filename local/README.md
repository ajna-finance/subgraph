# Ajna Local Development Environment
This folder contains a dockerized environment which sets up a local ganache testnet with subgraph indexer.

## Prerequisites
`docker` and `compose` plugin are required. Tooling assumes your user is a member of `docker` group.

## Installation
Install using `yarn`, because `npm` has an issue installing [Gluegun](https://github.com/infinitered/gluegun).
```
sudo yarn global add @graphprotocol/graph-cli
yarn install
```

## Usage
Utility scripts have been provided to facilitate setup:
- `start-dev-env.sh` - Handles first-time setup and starts the containers.
- `stop-dev-env.sh` - Stops the containers cleanly. Chain state will be saved upon restart unless reset.
- `reset-dev-env.sh` - Does a hard reset of your environment.
