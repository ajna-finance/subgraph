#!/bin/bash
docker-compose down -v
docker rm ajna-testnet-subgraph
sudo rm -rf data
