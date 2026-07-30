-- CreateEnum
CREATE TYPE "NumberingResetPeriod" AS ENUM ('YEARLY', 'MONTHLY', 'NEVER');

-- CreateEnum
CREATE TYPE "NumberingScopeLevel" AS ENUM ('TENANT', 'COMPANY', 'SITE');

-- CreateTable
CREATE TABLE "numbering_configs" (
    "numbering_config_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "module_code" VARCHAR(50) NOT NULL,
    "pattern" VARCHAR(200) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "reset_period" "NumberingResetPeriod" NOT NULL,
    "scope_level" "NumberingScopeLevel" NOT NULL,
    "scope_id" UUID,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "last_period_key" VARCHAR(10),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "numbering_configs_pkey" PRIMARY KEY ("numbering_config_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "numbering_configs_tenant_id_module_code_scope_id_key" ON "numbering_configs"("tenant_id", "module_code", "scope_id");

-- Postgres tidak menganggap dua NULL "sama" di unique index biasa, jadi
-- constraint di atas TIDAK mencegah dua baris scope_level=TENANT
-- (scope_id NULL) untuk (tenant_id, module_code) yang sama. Partial unique
-- index ini menutup celah itu khusus untuk kasus scope_id IS NULL — lihat
-- komentar banner "Task 0.10" di schema.prisma.
CREATE UNIQUE INDEX "numbering_configs_tenant_module_no_scope_key" ON "numbering_configs"("tenant_id", "module_code") WHERE "scope_id" IS NULL;
