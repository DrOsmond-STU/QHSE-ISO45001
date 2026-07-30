-- CreateEnum
CREATE TYPE "WorkPermitRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WorkPermitStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_ISSUER_APPROVAL', 'PENDING_HSE_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'EXTENSION_REQUESTED', 'PENDING_CLOSURE', 'CLOSED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GasType" AS ENUM ('OXYGEN', 'LEL_FLAMMABLE', 'H2S', 'CO', 'VOC', 'OTHER');

-- CreateEnum
CREATE TYPE "GasTestResultValue" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "IsolationType" AS ENUM ('ELECTRICAL', 'MECHANICAL', 'PROCESS_PIPING', 'PNEUMATIC', 'HYDRAULIC', 'OTHER');

-- CreateEnum
CREATE TYPE "IsolationLotoStatus" AS ENUM ('APPLIED', 'VERIFIED', 'REMOVED');

-- CreateEnum
CREATE TYPE "WorkPermitApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "work_permit_types" (
    "work_permit_type_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "requires_gas_test" BOOLEAN NOT NULL DEFAULT false,
    "requires_loto" BOOLEAN NOT NULL DEFAULT false,
    "requires_hse_approval" BOOLEAN NOT NULL DEFAULT false,
    "default_risk_level" "WorkPermitRiskLevel" NOT NULL DEFAULT 'LOW',
    "default_validity_hours" INTEGER NOT NULL DEFAULT 8,
    "max_extension_count" INTEGER NOT NULL DEFAULT 1,
    "gas_retest_interval_hours" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_permit_types_pkey" PRIMARY KEY ("work_permit_type_id")
);

-- CreateTable
CREATE TABLE "work_permits" (
    "work_permit_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "permit_number" VARCHAR(50) NOT NULL,
    "work_permit_type_id" UUID NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "location_detail" VARCHAR(200),
    "requester_id" UUID NOT NULL,
    "contractor_company_id" UUID,
    "related_jsa_id" UUID,
    "risk_level" "WorkPermitRiskLevel" NOT NULL,
    "planned_start_datetime" TIMESTAMPTZ NOT NULL,
    "planned_end_datetime" TIMESTAMPTZ NOT NULL,
    "actual_start_datetime" TIMESTAMPTZ,
    "actual_end_datetime" TIMESTAMPTZ,
    "number_of_workers" INTEGER,
    "status" "WorkPermitStatus" NOT NULL DEFAULT 'DRAFT',
    "workflow_instance_id" UUID,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_permits_pkey" PRIMARY KEY ("work_permit_id")
);

-- CreateTable
CREATE TABLE "work_permit_hazard_checklist" (
    "work_permit_hazard_checklist_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_permit_id" UUID NOT NULL,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "all_mandatory_items_checked" BOOLEAN NOT NULL DEFAULT false,
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_permit_hazard_checklist_pkey" PRIMARY KEY ("work_permit_hazard_checklist_id")
);

-- CreateTable
CREATE TABLE "gas_test_results" (
    "gas_test_result_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_permit_id" UUID NOT NULL,
    "gas_type" "GasType" NOT NULL,
    "reading_value" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "acceptable_min" DECIMAL(10,3),
    "acceptable_max" DECIMAL(10,3),
    "result" "GasTestResultValue" NOT NULL,
    "test_datetime" TIMESTAMPTZ NOT NULL,
    "retest_due_at" TIMESTAMPTZ,
    "instrument_name" VARCHAR(100) NOT NULL,
    "instrument_calibration_ref" UUID,
    "tested_by" UUID NOT NULL,
    "location_detail" VARCHAR(200),
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "gas_test_results_pkey" PRIMARY KEY ("gas_test_result_id")
);

-- CreateTable
CREATE TABLE "isolation_loto_records" (
    "isolation_loto_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_permit_id" UUID NOT NULL,
    "isolation_point_description" VARCHAR(200) NOT NULL,
    "isolation_type" "IsolationType" NOT NULL,
    "lock_number" VARCHAR(50),
    "tag_number" VARCHAR(50),
    "applied_by" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ NOT NULL,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "removed_by" UUID,
    "removed_at" TIMESTAMPTZ,
    "status" "IsolationLotoStatus" NOT NULL DEFAULT 'APPLIED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "isolation_loto_records_pkey" PRIMARY KEY ("isolation_loto_id")
);

-- CreateTable
CREATE TABLE "work_permit_approvals" (
    "work_permit_approval_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_permit_id" UUID NOT NULL,
    "workflow_instance_id" UUID NOT NULL,
    "current_stage_name" VARCHAR(100),
    "issuer_approved_by" UUID,
    "issuer_approved_at" TIMESTAMPTZ,
    "hse_approved_by" UUID,
    "hse_approved_at" TIMESTAMPTZ,
    "final_decision" "WorkPermitApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_permit_approvals_pkey" PRIMARY KEY ("work_permit_approval_id")
);

-- CreateIndex
CREATE INDEX "work_permit_types_tenant_id_is_active_idx" ON "work_permit_types"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_types_tenant_id_code_key" ON "work_permit_types"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "work_permits_workflow_instance_id_key" ON "work_permits"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "work_permits_tenant_id_status_idx" ON "work_permits"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "work_permits_tenant_id_site_id_idx" ON "work_permits"("tenant_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_permits_tenant_id_permit_number_key" ON "work_permits"("tenant_id", "permit_number");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_hazard_checklist_work_permit_id_key" ON "work_permit_hazard_checklist"("work_permit_id");

-- CreateIndex
CREATE INDEX "gas_test_results_tenant_id_work_permit_id_idx" ON "gas_test_results"("tenant_id", "work_permit_id");

-- CreateIndex
CREATE INDEX "isolation_loto_records_tenant_id_work_permit_id_idx" ON "isolation_loto_records"("tenant_id", "work_permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_approvals_work_permit_id_key" ON "work_permit_approvals"("work_permit_id");

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_types" ADD CONSTRAINT "work_permit_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_types" ADD CONSTRAINT "work_permit_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_types" ADD CONSTRAINT "work_permit_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_work_permit_type_id_fkey" FOREIGN KEY ("work_permit_type_id") REFERENCES "work_permit_types"("work_permit_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_related_jsa_id_fkey" FOREIGN KEY ("related_jsa_id") REFERENCES "jsa_records"("jsa_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_hazard_checklist" ADD CONSTRAINT "work_permit_hazard_checklist_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_hazard_checklist" ADD CONSTRAINT "work_permit_hazard_checklist_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_hazard_checklist" ADD CONSTRAINT "work_permit_hazard_checklist_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_hazard_checklist" ADD CONSTRAINT "work_permit_hazard_checklist_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_hazard_checklist" ADD CONSTRAINT "work_permit_hazard_checklist_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_test_results" ADD CONSTRAINT "gas_test_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_test_results" ADD CONSTRAINT "gas_test_results_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_test_results" ADD CONSTRAINT "gas_test_results_tested_by_fkey" FOREIGN KEY ("tested_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_test_results" ADD CONSTRAINT "gas_test_results_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_test_results" ADD CONSTRAINT "gas_test_results_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_loto_records" ADD CONSTRAINT "isolation_loto_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_issuer_approved_by_fkey" FOREIGN KEY ("issuer_approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_hse_approved_by_fkey" FOREIGN KEY ("hse_approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_approvals" ADD CONSTRAINT "work_permit_approvals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
