# Multi-stage build — pola turbo-prune + Next.js standalone output
# (TDD §4.1, §17.1). Sama seperti apps/api/Dockerfile: BELUM di-build-test
# di environment ini (tidak ada Docker lokal) — verifikasi wajib begitu
# CI (GitHub Actions runner) jalan.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN npx turbo prune @qhse/web --docker

FROM base AS installer
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /repo
COPY --from=installer /repo/ .
COPY --from=pruner /repo/out/full/ .
RUN npx turbo run build --filter=@qhse/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
