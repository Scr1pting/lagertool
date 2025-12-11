#!/bin/bash


# Reset db
echo "Remove volumes ..."
cd "$(dirname "$0")/../backend" || exit 1
docker-compose down
docker volume rm backend_postgres-data
docker volume rm backend_redis-data
docker-compose up -d --wait
cd - > /dev/null


# Start backend (Go server) to insert testdata
echo "Starting backend..."
cd "$(dirname "$0")/../backend" || exit 1
go run main.go -testdata -noserver
docker-compose down
