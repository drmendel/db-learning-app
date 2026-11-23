#!/usr/bin/env bash
# Start the Adatbázis gyakorló practice app and open it in the browser.
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules/@electric-sql/pglite ] || [ ! -d node_modules/mingo ]; then
  echo "Installing dependencies (first run only)…"
  npm install --no-audit --no-fund
fi
PORT="${PORT:-8765}"
( for _ in $(seq 1 40); do
    if curl -s "http://localhost:$PORT/api/progress" >/dev/null 2>&1; then
      command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT" >/dev/null 2>&1
      break
    fi
    sleep 0.5
  done ) &
PORT="$PORT" exec node server.js
