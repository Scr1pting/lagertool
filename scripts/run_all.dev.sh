#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"


# Kill a process and all its descendants. `go run` and `uv run` start the
# actual servers as child processes, so killing just their PID orphans them.
kill_tree() {
  local child
  for child in $(pgrep -P "$1"); do
    kill_tree "$child"
  done
  kill "$1" 2>/dev/null
}

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."

  [[ -n "$BACKEND_PID" ]] && kill_tree "$BACKEND_PID"
  [[ -n "$DESCGEN_PID" ]] && kill_tree "$DESCGEN_PID"

  cd "$ROOT/backend" || exit 1
  docker-compose down
}

trap cleanup EXIT


# Start db
echo "Starting db..."
cd "$ROOT/backend" || exit 1
docker-compose up -d
cd - > /dev/null


# Start backend (Go server)
echo "Starting backend..."
cd "$ROOT/backend" || exit 1
go run main.go -using_auth=false &
BACKEND_PID=$!
cd - > /dev/null


# Start description_gen (Python server)
echo "Starting description_gen..."
cd "$ROOT/description_gen" || exit 1
uv run uvicorn app.main:app --host 0.0.0.0 --port 8080 &
DESCGEN_PID=$!
cd - > /dev/null


# Start frontend (Vite dev server)
echo "Starting frontend..."
cd "$ROOT/frontend" || exit 1
npm run dev
