-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('POLICY', 'MANUAL', 'SOP', 'WORK_INSTRUCTION', 'FORM', 'GUIDELINE', 'RECORD', 'EXTERNAL_STANDARD', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'UNDER_REVISION', 'OBSOLETE', 'RETIRED');

-- CreateEnum
CREATE TYPE "DocumentCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DistributionTargetType" AS ENUM ('USER', 'ROLE', 'DEPARTMENT', 'SITE', 'COMPANY', 'ALL_TENANT');

-- CreateEnum
CREATE TYPE "ReadAcknowledgementStatus" AS ENUM ('PENDING', 'VIEWED', 'ACKNOWLEDGED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AcknowledgementMethod" AS ENUM ('IN_APP_CLICK', 'E_SIGNATURE');

-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('NO_CHANGE_NEEDED', 'MINOR_REVISION', 'MAJOR_REVISION_TRIGGERED', 'RETIRE_DOCUMENT');

-- CreateEnum
CREATE TYPE "ReviewScheduleStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "WorkflowApproverType" ADD VALUE 'CONTEXT_USER';

-- CreateTable
CREATE TABLE "document_categories" (
    "document_category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "parent_category_id" UUID,
    "default_numbering_config_id" UUID,
    "default_review_cycle_months" INTEGER,
    "status" "DocumentCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("document_category_id")
);

-- CreateTable
CREATE TABLE "documents" (
    "document_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "site_id" UUID,
    "department_id" UUID,
    "document_number" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_category_id" UUID NOT NULL,
    "classification" "DocumentClassification" NOT NULL DEFAULT 'INTERNAL',
    "description" TEXT,
    "owner_user_id" UUID NOT NULL,
    "owner_department_id" UUID,
    "current_version_id" UUID,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_date" DATE,
    "review_cycle_months" INTEGER,
    "next_review_date" DATE,
    "retention_years" INTEGER,
    "related_regulatory_refs" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "document_version_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "major_version" INTEGER NOT NULL DEFAULT 1,
    "minor_version" INTEGER NOT NULL DEFAULT 0,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "change_summary" TEXT,
    "status" "DocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "superseded_by_version_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("document_version_id")
);

-- CreateTable
CREATE TABLE "document_distribution" (
    "document_distribution_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_version_id" UUID NOT NULL,
    "distribution_target_type" "DistributionTargetType" NOT NULL,
    "distribution_target_id" UUID,
    "requires_acknowledgement" BOOLEAN NOT NULL DEFAULT true,
    "acknowledgement_due_days" INTEGER,
    "distributed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributed_by" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_distribution_pkey" PRIMARY KEY ("document_distribution_id")
);

-- CreateTable
CREATE TABLE "read_acknowledgement_logs" (
    "ack_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "document_distribution_id" UUID NOT NULL,
    "document_version_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "ReadAcknowledgementStatus" NOT NULL DEFAULT 'PENDING',
    "viewed_at" TIMESTAMPTZ,
    "acknowledged_at" TIMESTAMPTZ,
    "acknowledgement_method" "AcknowledgementMethod",
    "e_signature_ref" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "read_acknowledgement_logs_pkey" PRIMARY KEY ("ack_log_id")
);

-- CreateTable
CREATE TABLE "document_review_schedule" (
    "review_schedule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "scheduled_review_date" DATE NOT NULL,
    "actual_review_date" DATE,
    "reviewer_user_id" UUID,
    "review_outcome" "ReviewOutcome",
    "resulting_document_version_id" UUID,
    "status" "ReviewScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_review_schedule_pkey" PRIMARY KEY ("review_schedule_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_categories_tenant_id_code_key" ON "document_categories"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "documents_current_version_id_key" ON "documents"("current_version_id");

-- CreateIndex
CREATE INDEX "documents_tenant_id_document_category_id_idx" ON "documents"("tenant_id", "document_category_id");

-- CreateIndex
CREATE INDEX "documents_tenant_id_status_idx" ON "documents"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenant_id_document_number_key" ON "documents"("tenant_id", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_superseded_by_version_id_key" ON "document_versions"("superseded_by_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_workflow_instance_id_key" ON "document_versions"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "document_versions_tenant_id_document_id_idx" ON "document_versions"("tenant_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_major_version_minor_version_key" ON "document_versions"("document_id", "major_version", "minor_version");

-- CreateIndex
CREATE INDEX "document_distribution_tenant_id_document_id_idx" ON "document_distribution"("tenant_id", "document_id");

-- CreateIndex
CREATE INDEX "document_distribution_tenant_id_document_version_id_idx" ON "document_distribution"("tenant_id", "document_version_id");

-- CreateIndex
CREATE INDEX "read_acknowledgement_logs_tenant_id_user_id_status_idx" ON "read_acknowledgement_logs"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "read_acknowledgement_logs_document_distribution_id_user_id_key" ON "read_acknowledgement_logs"("document_distribution_id", "user_id");

-- CreateIndex
CREATE INDEX "document_review_schedule_tenant_id_document_id_idx" ON "document_review_schedule"("tenant_id", "document_id");

-- CreateIndex
CREATE INDEX "document_review_schedule_tenant_id_status_scheduled_review__idx" ON "document_review_schedule"("tenant_id", "status", "scheduled_review_date");

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "document_categories"("document_category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_default_numbering_config_id_fkey" FOREIGN KEY ("default_numbering_config_id") REFERENCES "numbering_configs"("numbering_config_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_category_id_fkey" FOREIGN KEY ("document_category_id") REFERENCES "document_categories"("document_category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_department_id_fkey" FOREIGN KEY ("owner_department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("document_version_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_superseded_by_version_id_fkey" FOREIGN KEY ("superseded_by_version_id") REFERENCES "document_versions"("document_version_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("document_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_distributed_by_fkey" FOREIGN KEY ("distributed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_acknowledgement_logs" ADD CONSTRAINT "read_acknowledgement_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_acknowledgement_logs" ADD CONSTRAINT "read_acknowledgement_logs_document_distribution_id_fkey" FOREIGN KEY ("document_distribution_id") REFERENCES "document_distribution"("document_distribution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_acknowledgement_logs" ADD CONSTRAINT "read_acknowledgement_logs_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("document_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_acknowledgement_logs" ADD CONSTRAINT "read_acknowledgement_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_review_schedule" ADD CONSTRAINT "document_review_schedule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_review_schedule" ADD CONSTRAINT "document_review_schedule_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_review_schedule" ADD CONSTRAINT "document_review_schedule_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_review_schedule" ADD CONSTRAINT "document_review_schedule_resulting_document_version_id_fkey" FOREIGN KEY ("resulting_document_version_id") REFERENCES "document_versions"("document_version_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_review_schedule" ADD CONSTRAINT "document_review_schedule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_review_schedule" ADD CONSTRAINT "document_review_schedule_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
