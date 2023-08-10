#!/bin/bash

graphql_http=8000
graphql_wss=8001
graphql_admin=8020
graphql_indexer=8030
graphql_metrics=8040
graphql_ipfs=5001

offset=${1:-0}

export GRAPHQL_HTTP=$(($graphql_http+offset))
export GRAPHQL_WSS=$(($graphql_wss+offset))
export GRAPHQL_ADMIN=$(($graphql_admin+offset))
export GRAPHQL_INDEXER=$(($graphql_indexer+offset))
export GRAPHQL_METRICS=$(($graphql_metrics+offset))
export GRAPHQL_IPFS=$(($graphql_ipfs+offset))

# adjust package.json using sed
git checkout package.json
sed -i 's|http://localhost:'${graphql_admin}'|http://localhost:'${GRAPHQL_ADMIN}'|g' package.json
sed -i 's|http://localhost:'${graphql_ipfs}'|http://localhost:'${GRAPHQL_IPFS}'|g' package.json

echo "Set environment to use the following ports:"
echo "GRAPHQL_HTTP    $GRAPHQL_HTTP"
echo "GRAPHQL_WSS     $GRAPHQL_WSS"
echo "GRAPHQL_ADMIN   $GRAPHQL_ADMIN"
echo "GRAPHQL_INDEXER $GRAPHQL_INDEXER"
echo "GRAPHQL_METRICS $GRAPHQL_METRICS"
echo "GRAPHQL_IPFS    $GRAPHQL_IPFS"
