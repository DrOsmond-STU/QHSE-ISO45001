#!/usr/bin/env bash
# Start MinIO lokal untuk dev (task 0.12 — object storage, lihat TDD §11).
#
# Prasyarat: minio.exe portable sudah di-download. Environment ini tidak
# punya Docker/hak admin Windows, jadi dipakai binary portable (bukan
# installer/service), dijalankan sebagai proses user biasa — lihat
# ../../../.local-minio/ (satu level di atas qhse-platform, di luar repo
# git, sejajar .local-pgsql/ dan .local-redis/).
#
# Kredensial dev lokal HARDCODE (BUKAN pola production — production pakai
# Vault/KMS, lihat SECURITY.md & TDD §16), sama seperti password Postgres
# app role di dev-db-setup.sh.
#
# Idempotent: kalau sudah jalan (health check sukses), tidak start ulang.
#
# Jalankan:
#   ./dev-minio-setup.sh

set -euo pipefail

MINIO_BIN="${MINIO_BIN:-../../../.local-minio}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-qhse_app}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-qhse_dev_local_minio}"

if curl -sf "http://127.0.0.1:$MINIO_PORT/minio/health/live" >/dev/null 2>&1; then
  echo "MinIO sudah jalan di port $MINIO_PORT."
else
  cd "$MINIO_BIN"
  nohup ./minio.exe server ./data --address ":$MINIO_PORT" --console-address ":$MINIO_CONSOLE_PORT" > minio.log 2>&1 &
  disown

  ready=0
  for _ in $(seq 1 20); do
    sleep 0.5
    if curl -sf "http://127.0.0.1:$MINIO_PORT/minio/health/live" >/dev/null 2>&1; then
      ready=1
      break
    fi
  done

  if [ "$ready" -ne 1 ]; then
    echo "MinIO gagal start dalam waktu yang diharapkan — cek $MINIO_BIN/minio.log" >&2
    exit 1
  fi
  echo "MinIO siap di port $MINIO_PORT (console: $MINIO_CONSOLE_PORT)."
fi

# Bucket qhse-attachments SENGAJA tidak dibuat di sini (tidak download
# mc.exe terpisah demi minimalkan footprint download) — ObjectStorageService
# ensure create-if-not-exists (HeadBucket -> CreateBucket) lewat S3 SDK
# saat NestJS module init, idempotent sama seperti script ini.
