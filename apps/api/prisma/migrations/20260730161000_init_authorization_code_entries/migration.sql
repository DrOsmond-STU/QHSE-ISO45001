-- Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti authcode:{code}
-- Redis. TIDAK ada RLS/audit_log_trigger di sini SENGAJA — lihat banner
-- comment AuthorizationCodeEntry di schema.prisma.
CREATE TABLE "authorization_code_entries" (
    "code" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code_challenge" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_code_entries_pkey" PRIMARY KEY ("code")
);
