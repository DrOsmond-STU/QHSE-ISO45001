#!/usr/bin/env bash
# Provisioning database lokal untuk dev (BUKAN pola production — production
# pakai Vault/KMS + Postgres terkelola, lihat SECURITY.md & TDD §16).
#
# Prasyarat: PostgreSQL 16 portable sudah di-extract & server sudah running.
# Environment ini tidak punya Docker/hak admin Windows, jadi dipakai binary
# portable (bukan installer), dijalankan sebagai proses user biasa — lihat
# ../../../.local-pgsql/ (satu level di atas qhse-platform, di luar repo git).
#
# Jalankan sekali saja setelah initdb + pg_ctl start:
#   ./dev-db-setup.sh

set -euo pipefail

PG_BIN="${PG_BIN:-../../../.local-pgsql/pgsql/bin}"
PGPORT="${PGPORT:-5432}"

"$PG_BIN/psql.exe" -U postgres -p "$PGPORT" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'qhse_app') THEN
    CREATE ROLE qhse_app LOGIN PASSWORD 'qhse_dev_local';
  END IF;
END
$$;
SQL

"$PG_BIN/psql.exe" -U postgres -p "$PGPORT" -tc "SELECT 1 FROM pg_database WHERE datname = 'qhse_dev'" | grep -q 1 \
  || "$PG_BIN/psql.exe" -U postgres -p "$PGPORT" -c "CREATE DATABASE qhse_dev OWNER qhse_app;"

echo "qhse_app role + qhse_dev database siap. Jalankan 'npx prisma migrate dev' berikutnya."
