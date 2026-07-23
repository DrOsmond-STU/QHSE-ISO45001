# qhse-platform

Monorepo implementasi **QHSE Enterprise Platform**, mengikuti struktur [TDD §4.1](../tdd/00-MASTER-TDD.md#41-keputusan-monorepo).

Dokumen desain & keputusan produk/teknis ada satu level di atas folder ini:
[`../prd/`](../prd/00-MASTER-PRD.md) · [`../tdd/`](../tdd/00-MASTER-TDD.md) · [`../SECURITY.md`](../SECURITY.md) · [`../DESIGN.md`](../DESIGN.md) · [`../ARCHITECTURE.md`](../ARCHITECTURE.md) · [`../BRAND.md`](../BRAND.md) · [`../TESTING.md`](../TESTING.md) · [`../DEPLOYMENT.md`](../DEPLOYMENT.md) · [`../TASK_INSTRUCTION.md`](../TASK_INSTRUCTION.md)

## Struktur

```
apps/
  api/      NestJS backend (REST API)
  web/      Next.js frontend
  worker/   Job consumer (BullMQ), reuse module code dari api
packages/
  shared-types/   DTO & tipe TypeScript dipakai bareng FE/BE
  ui-components/  Design system component library
  i18n/           Kamus label i18n_labels ID/EN
  eslint-config/  Konfigurasi lint & boundary rules bersama
infra/            IaC (Terraform/k8s manifests, disi belakangan)
```

## Status

Dibangun bertahap mengikuti `../TASK_INSTRUCTION.md` Phase 0 (Bootstrap & Shared Platform Layer) — cek task tracker untuk progres per-task.

- [x] 0.1 Monorepo (pnpm + Turborepo) — `turbo build` sukses 6/6 package.
- [x] 0.2 Database, ORM & tenant context — PostgreSQL 16 lokal (portable, TANPA Docker/admin — lihat `apps/api/scripts/dev-db-setup.sh`), Prisma 5.22, `TenantContextMiddleware` (AsyncLocalStorage) + `PrismaService.withRls()` (SET LOCAL per transaksi) terverifikasi end-to-end lewat endpoint `GET /platform/tenancy-smoke-test`.
- [x] 0.3 RLS policy template & generic test harness — `prisma/rls-policy.template.sql` + `test/rls/generic-tenant-isolation.integration-spec.ts` (Jest), introspeksi `information_schema` otomatis menemukan tabel domain baru. 4/4 test lulus (`pnpm test:integration`).

**Environment ini tidak punya Docker maupun hak admin Windows** — Postgres jalan sebagai proses user biasa dari binary portable (`.local-pgsql/` satu level di atas repo ini, di luar git). Redis (dibutuhkan mulai task 0.6+ untuk sesi/cache/BullMQ) belum disiapkan — akan ditandai jelas begitu jadi blocker.

## Perintah

```bash
pnpm install       # install semua dependency workspace
pnpm build         # turbo run build (affected packages)
pnpm dev           # jalankan semua app dalam mode dev
pnpm lint
pnpm test
```

### Database lokal (apps/api)

```bash
# 1) Pastikan PostgreSQL portable sudah running (lihat ../../.local-pgsql/, satu
#    level di atas repo ini) — start manual:
#    .local-pgsql/pgsql/bin/pg_ctl.exe -D .local-pgsql/data -l .local-pgsql/logfile.log start

cd apps/api
pnpm db:setup      # sekali saja: buat role qhse_app + database qhse_dev
pnpm db:migrate    # jalankan migration Prisma (prisma migrate dev)
```
