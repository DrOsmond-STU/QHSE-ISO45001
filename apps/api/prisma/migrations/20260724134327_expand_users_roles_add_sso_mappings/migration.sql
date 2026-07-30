-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL_EMPLOYEE', 'CONTRACTOR', 'VISITOR', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "SsoIdpProvider" AS ENUM ('AZURE_AD', 'GOOGLE_WORKSPACE', 'SAML_GENERIC', 'OIDC_GENERIC');

-- CreateEnum
CREATE TYPE "SsoMappingStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_fkey";

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "based_on_role_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activated_at" TIMESTAMPTZ,
ADD COLUMN     "avatar_url" VARCHAR(500),
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "deactivated_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "department_id" UUID,
ADD COLUMN     "employee_id" VARCHAR(50),
ADD COLUMN     "hris_last_synced_at" TIMESTAMPTZ,
ADD COLUMN     "hris_sync_source" VARCHAR(50),
ADD COLUMN     "invited_at" TIMESTAMPTZ,
ADD COLUMN     "job_title" VARCHAR(150),
ADD COLUMN     "phone_number" VARCHAR(30),
ADD COLUMN     "position_id" UUID,
ADD COLUMN     "preferred_language" "Language" NOT NULL DEFAULT 'ID',
ADD COLUMN     "reporting_to_user_id" UUID,
ADD COLUMN     "site_id" UUID,
ADD COLUMN     "suspended_at" TIMESTAMPTZ,
ADD COLUMN     "updated_by" UUID,
ADD COLUMN     "user_type" "UserType" NOT NULL DEFAULT 'INTERNAL_EMPLOYEE',
ADD COLUMN     "username" VARCHAR(100),
ALTER COLUMN "tenant_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "sso_mappings" (
    "sso_mapping_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "idp_provider" "SsoIdpProvider" NOT NULL,
    "idp_tenant_identifier" VARCHAR(255),
    "external_subject_id" VARCHAR(255) NOT NULL,
    "external_email" VARCHAR(150),
    "auto_provision" BOOLEAN NOT NULL DEFAULT false,
    "default_role_id_on_provision" UUID,
    "status" "SsoMappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_sso_login_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "sso_mappings_pkey" PRIMARY KEY ("sso_mapping_id")
);

-- CreateIndex
CREATE INDEX "sso_mappings_tenant_id_status_idx" ON "sso_mappings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sso_mappings_user_id_idx" ON "sso_mappings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sso_mappings_tenant_id_idp_provider_external_subject_id_key" ON "sso_mappings"("tenant_id", "idp_provider", "external_subject_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_status_idx" ON "users"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_site_id_idx" ON "users"("site_id");

-- CreateIndex
CREATE INDEX "users_reporting_to_user_id_idx" ON "users"("reporting_to_user_id");

-- AddForeignKey
-- ON DELETE RESTRICT (BUKAN default SET NULL yang Prisma infer utk FK
-- opsional) — tenant_id=NULL punya arti KHUSUS di skema ini (BR-11,
-- user_type=PLATFORM_ADMIN); cascade-null lewat DELETE tenant akan diam-diam
-- membuat user biasa terlihat seperti PLATFORM_ADMIN. Konsisten dgn SELURUH
-- FK tenant_id lain di skema (semua RESTRICT, tanpa kecuali).
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "organization_charts"("position_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_reporting_to_user_id_fkey" FOREIGN KEY ("reporting_to_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_based_on_role_id_fkey" FOREIGN KEY ("based_on_role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_mappings" ADD CONSTRAINT "sso_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_mappings" ADD CONSTRAINT "sso_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_mappings" ADD CONSTRAINT "sso_mappings_default_role_id_on_provision_fkey" FOREIGN KEY ("default_role_id_on_provision") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_mappings" ADD CONSTRAINT "sso_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_mappings" ADD CONSTRAINT "sso_mappings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
