# Ajna Pools Subgraph

This Subgraph ingests the core Pool contracts used by the Ajna Protocol. These contracts can be found [here](https://github.com/ajna-finance/contracts).

This repository doesn't index the GrantFund contract found [here](https://github.com/ajna-finance/ecosystem-coordination). That indexing will be handled in a separate repository. The PoolInfoUtils contract is also not indexed here, as no events are emitted that can be indexed.

## Development

Commands for adding new data sources to the subgraph are listed in the [add-commands.txt](./add-commands.txt) file.

This subgraph can be run locally, with instructions available in the [Graph Protocols Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).
