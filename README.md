# Ajna Subgraph

[Ajna](https://www.ajna.finance/) is a non-custodial, peer-to-peer, permissionless lending, borrowing and trading system that requires no governance or external price feeds to function.

This Subgraph ingests contracts used by the Ajna Protocol. Core contracts can be found [here](https://github.com/ajna-finance/contracts).


## Installation
Install using `yarn`, because `npm` has an issue installing [Gluegun](https://github.com/infinitered/gluegun).
```
sudo yarn global add @graphprotocol/graph-cli
yarn install
```

Set `ETH_NETWORK` environment for your target network to `network:endpoint.  For example, 
 `ETH_NETWORK=goerli:https://eth-goerli.g.alchemy.com/v2/<your_api_key_here>` configures your environment for Goerli using an Alchemy node.

If you will change ABIs, please install `jq`.

`docker` and `compose` plugin are required to work with dockerized deployments. Tooling assumes your user is a member of `docker` group.


## Querying
The dockerized deployment offers a query UI at http://localhost:8000/subgraphs/name/ajna/graphql.

Below are some examples of queries that can be made to the Ajna Subgraph.

List pools showing their tokens and how many transactions have been performed on them:
```
{
  pools {
    id
    txCount
    quoteToken {
      id
      symbol
    }
    collateralToken {
      id
      symbol
    }
  }
}
```

Positions for a specific lender across all pools:
```
{
  accounts(where: {id:"0x4eb7f19d6efcace59eaed70220da5002709f9b71"}) {
    id
    lends {
      pool {
        id
        quoteToken {
          symbol
        }
        collateralToken {
          symbol
        }
      }
      bucket {
        bucketIndex
        deposit
        collateral
      }
    }
  }
}
```

Details for a specific pool:
```
{
  pool(id: "0xc2b64ca87090fe79786a8773009d7fb1288d3db1") {
    id
    quoteToken { symbol }
    collateralToken { symbol }
    poolSize
    actualUtilization
    htp
    hpb
    lup
    reserves
    borrowRate
    lendRate
    totalAjnaBurned
    totalInterestEarned
  }
}
```


## Known issues
- TheGraph tooling does not handle ERC-55 checksum addresses elegantly.  Please convert addresses to lowercase when filtering.
- Support for ERC-721 collateral pools has not been implemented.
- Integration testing has not been completed.


## Design
### Types

| Value              | Type         |
| ------------------ | ------------ |
| Prices and amounts | `BigDecimal` |
| Bucket indicies    | `Int` (*u32* in AssemblyScript, *number* in TypeScript) |
| Counts and timestamps | `BigInt`  |

### Persistence / Rentention Policy

This subgraph does not retain a history of `Lends` and `Loans`.  `Lends` are discarded when all LP balance has been redeemed.  `Loans` are discarded when the lender has no debt and no collateral.

[Time-travel queries](https://thegraph.com/docs/en/querying/graphql-api/#time-travel-queries) can be used to query historical state.

This subgraph will retain a list of `Pools`, even if they have no liquidity. Pools will also retain a history of `LiquidationAuctions` and `ReserveAuctions`, which can be filtered by status.


## Development and Deployment
Commands for adding new data sources to the subgraph are listed in the [add-commands.txt](./add-commands.txt) file.

Once data sources have been added, entites can be modified in the [schema.graphql](./schema.graphql) file. After any update, the following commands must be run to ensure the new types are available for the event handlers.  Before running, ensure `ETH_NETWORK` is set as prescribed above. `[NETWORK_NAME]` should be defined in `networks.json` and specified by `ETH_NETWORK`.

```
yarn codegen
yarn build --network [NETWORK_NAME]
```

Upon building, `subgraph.yaml` will be updated with contract addresses and start blocks for the specified network.  When making other changes, feel free to commit this with whichever network you have built with.

To start, run `docker-compose up`.

Once _graph-node_ is running, deploy the subgraph with:
```
yarn create-local
yarn deploy-local
```

Indexing a public network from takes roughly ~15 minutes for each month of data.

Instructions on creating your own deployment are available in the [Graph Protocols Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

To facilitate running multiple containers on a single machine, host port mappings have been parameterized.  To shift all ports, source `set-ports.sh` passing the offset as the only argument.  This script will export environment variables (read by docker-compose) with the new ports, and will update `package.json` such that deployment scripts target the correct port.

Example:
```
$ ./set-ports.sh 200
Updated 0 paths from the index
Set environment to use the following ports:
GRAPHQL_HTTP    8200
GRAPHQL_WSS     8201
GRAPHQL_ADMIN   8220
GRAPHQL_INDEXER 8230
GRAPHQL_METRICS 8240
GRAPHQL_IPFS    5201
```

### Tests
Unit tests are written using the [Matchstick unit testing framework](https://github.com/LimeChain/matchstick/blob/main/README.md).  Unit tests do not guarantee your subgraph is deployable or functional.

Run the Matchstick tests by executing: 
```
yarn test
```

### Maintenance
To update for new release candidates:
1. Update ABIs using the provided `copy-abis.sh` script.  This script requires `jq` be installed.  Note `codegen` and `build` commands are not sensitive to ABI formatting, but deployment is.  ABIs formatted by Ethers.js will not work.  ABIs generated by `graph add` will not work.  In the ABI, note that all _output_ parameters must have a `name` field.  It may be blank, but the field must exist.
2. Update addresses in `networks.json` and `src/utils/constants.ts`.
3. Run `yarn codegen` to find and resolve errors in code generation.
4. Review contract changes, adjusting subgraph and schema accordingly.  
5. Run `yarn build --network [NETWORK_NAME]` to update `subgraph.yaml`.  Resolve compliation errors.  
6. Update handlers, test mocks, and unit tests.  Run `yarn test` to find and resolve issues.
7. Start the dockerized environment and perform a local deployment to confirm functionality.

To clean out container data and autogenerated code, run the `clean-container.sh` script.


### Debugging
To check health, visit http://localhost:8030/graphql/playground and paste the following query:
```
{
  indexingStatuses(subgraphs: ["Qm..."]) {
    subgraph
    synced
    health
    entityCount
    fatalError {
      handler
      message
      deterministic
      block {
        hash
        number
      }
    }
    chains {
      chainHeadBlock {
        number
      }
      earliestBlock {
        number
      }
      latestBlock {
        number
      }
    }
  }
}
```
Replace `Qm...` with the `subgraph_id` from logs, and query.  If the indexer has failed, this may reveal the error.

The following red herrings occassionally appear in logs:
- `ERRO registering metric [deployment_handler_execution_time] failed because it was already registered`
- `WARN Bytes contain invalid UTF8. This may be caused by attempting to convert a value such as an address that cannot be parsed to a unicode string. You may want to use 'toHexString()' instead.`
These sometimes disappear upon redeployment with no changes.