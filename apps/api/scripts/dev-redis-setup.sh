#!/usr/bin/env bash
# Start Redis lokal untuk dev (task 0.6 — session store, auth-code store,
# rate-limit counter, lihat TDD §12).
#
# Prasyarat: Redis portable (tporadowski/redis, Windows build) sudah
# di-extract. Environment ini tidak punya Docker/hak admin Windows, jadi
# dipakai binary portable (bukan installer/service), dijalankan sebagai
# proses user biasa — lihat ../../../.local-redis/ (satu level di atas
# qhse-platform, di luar repo git, sejajar .local-pgsql/).
#
# Idempotent: kalau sudah jalan (PING sukses), tidak start ulang.
#
# Jalankan:
#   ./dev-redis-setup.sh

set -euo pipefail

REDIS_BIN="${REDIS_BIN:-../../../.local-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

if "$REDIS_BIN/redis-cli.exe" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
  echo "Redis sudah jalan di port $REDIS_PORT."
  exit 0
fi

cd "$REDIS_BIN"
nohup ./redis-server.exe redis.windows.conf --port "$REDIS_PORT" --daemonize no > redis.log 2>&1 &
disown

for _ in $(seq 1 20); do
  sleep 0.5
  if ./redis-cli.exe -p "$REDIS_PORT" ping >/dev/null 2>&1; then
    echo "Redis siap di port $REDIS_PORT."
    exit 0
  fi
done

echo "Redis gagal start dalam waktu yang diharapkan — cek $REDIS_BIN/redis.log" >&2
exit 1
