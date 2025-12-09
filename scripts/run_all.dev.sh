#!/bin/zsh
# Script to run frontend, backend, and description_gen servers in parallel


# Start db
echo "Starting backend..."
cd "$(dirname "$0")/../backend" || exit 1
docker-compose up -d
cd - > /dev/null


# Start backend (Go server)
echo "Starting backend..."
cd "$(dirname "$0")/../backend" || exit 1
go run main.go &
BACKEND_PID=$!
cd - > /dev/null


# Start description_gen (Python server)
echo "Starting description_gen..."
cd "$(dirname "$0")/../description_gen" || exit 1
uv run app/main.py &
DESCGEN_PID=$!
cd - > /dev/null


# Start frontend (Vite dev server)
echo "Starting frontend..."
cd "$(dirname "$0")/../frontend" || exit 1
npm run dev
