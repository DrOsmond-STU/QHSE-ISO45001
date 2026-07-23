# Multi-stage build — pola turbo-prune (TDD §4.1, §17.1). Menghasilkan image
# minimal cuma berisi package @qhse/api + dependency-nya (bukan seluruh monorepo).
#
# CATATAN JUJUR: belum bisa di-build-test di environment ini (tidak ada Docker
# lokal, lihat project_qhse_dev_environment memory) — struktur mengikuti pola
# resmi Turborepo (https://turborepo.dev/docs/guides/tools/docker), tapi WAJIB
# diverifikasi begitu CI (GitHub Actions runner, yang punya Docker) jalan.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN npx turbo prune @qhse/api --docker

FROM base AS installer
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /repo
COPY --from=installer /repo/ .
COPY --from=pruner /repo/out/full/ .
RUN pnpm exec prisma generate --schema=apps/api/prisma/schema.prisma
RUN npx turbo run build --filter=@qhse/api

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
USER nestjs
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
# DEPLOYMENT.md §11 — health check endpoint dipakai smoke test pasca-deploy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
