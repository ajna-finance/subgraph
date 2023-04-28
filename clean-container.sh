#!/bin/bash
docker-compose down -v
sudo rm -rf data
source .env
docker-compose up --force-recreate