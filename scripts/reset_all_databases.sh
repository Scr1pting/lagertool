#!/bin/zsh


# Reser db
echo "Starting backend..."
cd "$(dirname "$0")/../backend" || exit 1
docker-compose down
docker volume rm backend_test-postgres-data
docker volume rm backend_postgres-data
docker volume rm backend_redis-data
docker-compose up - d
cd - > /dev/null


# Start backend (Go server) to insert testdata
echo "Starting backend..."
cd "$(dirname "$0")/../backend" || exit 1
go run main.go -testdata -noserver&
BACKEND_PID=$!
cd - > /dev/null
