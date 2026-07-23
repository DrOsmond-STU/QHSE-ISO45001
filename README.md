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

Dibangun bertahap mengikuti `../TASK_INSTRUCTION.md` Phase 0 (Bootstrap & Shared Platform Layer) — cek task tracker untuk progres per-task. **Belum ada Docker/Postgres/Redis lokal di environment build ini** — task yang butuh database sungguhan (0.2 dst.) akan ditandai jelas begitu blocked oleh itu.

## Perintah

```bash
pnpm install       # install semua dependency workspace
pnpm build         # turbo run build (affected packages)
pnpm dev           # jalankan semua app dalam mode dev
pnpm lint
pnpm test
```
