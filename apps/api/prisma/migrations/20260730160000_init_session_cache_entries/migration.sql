-- Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti SessionStore
-- Redis. Lihat banner comment SessionCacheEntry di schema.prisma kenapa
-- tabel TERPISAH dari user_sessions.
CREATE TABLE "session_cache_entries" (
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "current_secret_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "session_cache_entries_pkey" PRIMARY KEY ("user_id", "session_id")
);

CREATE INDEX "session_cache_entries_user_id_idx" ON "session_cache_entries"("user_id");
CREATE INDEX "session_cache_entries_expires_at_idx" ON "session_cache_entries"("expires_at");
