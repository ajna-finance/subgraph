#!/bin/bash
pushd "$(dirname "$0")"

if docker compose version ; then
    compose="docker compose" # use docker plugin, newer preferred method
elif docker-compose --version ; then
    compose="docker-compose" # use standalone compose app
else
    echo Please install docker compose.
    exit 1
fi

$compose down
