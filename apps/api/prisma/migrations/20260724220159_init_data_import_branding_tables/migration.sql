-- CreateEnum
CREATE TYPE "DataImportJobStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateTable
CREATE TABLE "data_import_jobs" (
    "data_import_job_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "target_module_code" VARCHAR(50) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "status" "DataImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "total_rows" INTEGER,
    "success_rows" INTEGER,
    "error_rows" INTEGER,
    "initiated_by" UUID NOT NULL,
    "source_data_import_job_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "data_import_jobs_pkey" PRIMARY KEY ("data_import_job_id")
);

-- CreateTable
CREATE TABLE "data_import_errors" (
    "data_import_error_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "data_import_job_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "error_message" TEXT NOT NULL,
    "raw_row_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_import_errors_pkey" PRIMARY KEY ("data_import_error_id")
);

-- CreateTable
CREATE TABLE "tenant_branding_configs" (
    "tenant_branding_config_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "logo_url" VARCHAR(500),
    "primary_color" VARCHAR(20),
    "display_name" VARCHAR(200),
    "custom_domain" VARCHAR(200),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenant_branding_configs_pkey" PRIMARY KEY ("tenant_branding_config_id")
);

-- CreateIndex
CREATE INDEX "data_import_jobs_tenant_id_status_idx" ON "data_import_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "data_import_jobs_source_data_import_job_id_idx" ON "data_import_jobs"("source_data_import_job_id");

-- CreateIndex
CREATE INDEX "data_import_errors_tenant_id_idx" ON "data_import_errors"("tenant_id");

-- CreateIndex
CREATE INDEX "data_import_errors_data_import_job_id_row_number_idx" ON "data_import_errors"("data_import_job_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_configs_tenant_id_key" ON "tenant_branding_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_configs_custom_domain_key" ON "tenant_branding_configs"("custom_domain");

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_source_data_import_job_id_fkey" FOREIGN KEY ("source_data_import_job_id") REFERENCES "data_import_jobs"("data_import_job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_errors" ADD CONSTRAINT "data_import_errors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_errors" ADD CONSTRAINT "data_import_errors_data_import_job_id_fkey" FOREIGN KEY ("data_import_job_id") REFERENCES "data_import_jobs"("data_import_job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding_configs" ADD CONSTRAINT "tenant_branding_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding_configs" ADD CONSTRAINT "tenant_branding_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding_configs" ADD CONSTRAINT "tenant_branding_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
