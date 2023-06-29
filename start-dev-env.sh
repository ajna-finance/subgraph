#!/bin/bash

if docker compose version ; then
    compose="docker compose" # use docker plugin, newer preferred method
elif docker-compose --version ; then
    compose="docker-compose" # use standalone compose app
else
    echo Please install docker compose.
    exit 1
fi

subgraph_url=http://0.0.0.0:8000/subgraphs/name/ajna

$compose -f ganache-indexer.yml up -d
echo Waiting for container to start...
sleep 9

echo Checking whether subgraph deployment needed...
# set -x
curl -g -s ${subgraph_url} \
    --header "content-type: application/json" \
    --data "{\"query\": \"{pools{id}}\"}" > /dev/null
if [ $? -ne 0 ]; then
    echo Building and deploying subgraph...
    yarn codegen
    yarn build --network ganache
    yarn remove-local
    yarn create-local || exit 2
    yarn deploy-local || exit 3
else
    echo Subgraph already deployed.
fi

echo "=========================================================="
echo "Ganache endpoint:  http://0.0.0.0:8555"
echo "Subgraph endpoint: $subgraph_url"
echo "=========================================================="
