# Ajna Pools Subgraph

[Ajna](https://www.ajna.finance/) is a non-custodial, peer-to-peer, permissionless lending, borrowing and trading system that requires no governance or external price feeds to function.

This Subgraph ingests the core Pool contracts used by the Ajna Protocol. These contracts can be found [here](https://github.com/ajna-finance/contracts).

This repository doesn't index the GrantFund contract found [here](https://github.com/ajna-finance/ecosystem-coordination). That indexing will be handled in a separate repository. The PoolInfoUtils contract is also not indexed here, as no events are emitted that can be indexed.

## Development

Commands for adding new data sources to the subgraph are listed in the [add-commands.txt](./add-commands.txt) file.

This subgraph can be run locally, with instructions available in the [Graph Protocols Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

## Tests

Tests are written using the [Matchstick unit testing framework](https://github.com/LimeChain/matchstick/blob/main/README.md). Tests require a local graph node to be available for saving artifacts used in the tests.

Run the Matchstick tests by executing: 
```
npm run test
```
