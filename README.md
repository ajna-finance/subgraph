# Ajna Pools Subgraph

[Ajna](https://www.ajna.finance/) is a non-custodial, peer-to-peer, permissionless lending, borrowing and trading system that requires no governance or external price feeds to function.

This Subgraph ingests the core Pool contracts used by the Ajna Protocol. These contracts can be found [here](https://github.com/ajna-finance/contracts).

This repository doesn't index the GrantFund contract found [here](https://github.com/ajna-finance/ecosystem-coordination). That indexing will be handled in a separate repository. The PoolInfoUtils contract is also not indexed here, as no events are emitted that can be indexed.

## Installation
Install using `yarn`, because `npm` has an issue installing [Gluegun](https://github.com/infinitered/gluegun).
```
sudo yarn global add @graphprotocol/graph-cli
yarn install
```

## Development

Commands for adding new data sources to the subgraph are listed in the [add-commands.txt](./add-commands.txt) file.

Once data sources have been added, entites can be modified in the [schema.graphql](./schema.graphql) file. After any update, the following commands must be run to ensure the new types are available for the event handlers:
```
npm run codegen
npm run build
```

This subgraph can be run locally using provided docker containers. To start, set the environment variable *ETH_RPC_URL* in your .env file. Then, run `docker-compose up`. Once the node is running, deploy the subgraph with:
```
npm run build
npm run create-local
npm run deploy-local
```

Instructions on creating your own deployment are available in the [Graph Protocols Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

## Tests

Tests are written using the [Matchstick unit testing framework](https://github.com/LimeChain/matchstick/blob/main/README.md).

Run the Matchstick tests by executing: 
```
npm run test
```

## Querying

Below are some examples of queries that can be made to the Ajna Subgraph.

```
{
    pools {
        id
        createdAtBlockNumber
        createdAtTimestamp
        txCount
    }
}
```