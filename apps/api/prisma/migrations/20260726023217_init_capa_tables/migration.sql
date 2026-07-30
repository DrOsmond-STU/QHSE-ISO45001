-- CreateEnum
CREATE TYPE "CapaSourceType" AS ENUM ('INCIDENT', 'AUDIT_FINDING', 'INSPECTION_FINDING', 'COMPLIANCE', 'RISK', 'CUSTOMER_COMPLAINT', 'QUALITY_NCR', 'MANAGEMENT_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "CapaCategory" AS ENUM ('CORRECTIVE', 'PREVENTIVE');

-- CreateEnum
CREATE TYPE "CapaPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CapaRegisterStatus" AS ENUM ('DRAFT', 'ROOT_CAUSE_ANALYSIS', 'ACTION_PLAN_DEFINED', 'PENDING_APPROVAL', 'IN_PROGRESS', 'PENDING_EFFECTIVENESS_VERIFICATION', 'EFFECTIVE_CLOSED', 'NOT_EFFECTIVE_REOPENED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CapaRootCauseMethod" AS ENUM ('FIVE_WHY', 'FISHBONE', 'FAULT_TREE', 'OTHER');

-- CreateEnum
CREATE TYPE "CapaActionType" AS ENUM ('CORRECTIVE', 'PREVENTIVE', 'INTERIM_CONTAINMENT');

-- CreateEnum
CREATE TYPE "CapaActionPlanStatusCache" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CapaVerificationMethod" AS ENUM ('RE_AUDIT', 'RE_INSPECTION', 'DATA_TREND_ANALYSIS', 'FIELD_OBSERVATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CapaVerificationResult" AS ENUM ('PENDING', 'EFFECTIVE', 'NOT_EFFECTIVE');

-- CreateEnum
CREATE TYPE "CapaApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateTable
CREATE TABLE "capa_register" (
    "capa_register_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "capa_number" VARCHAR(50) NOT NULL,
    "source_type" "CapaSourceType" NOT NULL,
    "source_id" UUID,
    "source_reference_number" VARCHAR(50),
    "category" "CapaCategory" NOT NULL,
    "priority" "CapaPriority" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "problem_statement" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "site_id" UUID,
    "department_id" UUID,
    "status" "CapaRegisterStatus" NOT NULL DEFAULT 'DRAFT',
    "initiated_by" UUID NOT NULL,
    "initiated_at" TIMESTAMPTZ NOT NULL,
    "target_closure_date" DATE,
    "actual_closure_date" DATE,
    "workflow_instance_id" UUID,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "capa_register_pkey" PRIMARY KEY ("capa_register_id")
);

-- CreateTable
CREATE TABLE "capa_root_cause_analysis" (
    "root_cause_analysis_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "capa_register_id" UUID NOT NULL,
    "method" "CapaRootCauseMethod" NOT NULL,
    "method_detail" JSONB NOT NULL,
    "root_cause_summary" TEXT NOT NULL,
    "contributing_factors" TEXT,
    "analyzed_by" UUID NOT NULL,
    "analyzed_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "capa_root_cause_analysis_pkey" PRIMARY KEY ("root_cause_analysis_id")
);

-- CreateTable
CREATE TABLE "capa_action_plans" (
    "capa_action_plan_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "capa_register_id" UUID NOT NULL,
    "root_cause_analysis_id" UUID,
    "action_description" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "action_type" "CapaActionType" NOT NULL,
    "pic_user_id" UUID NOT NULL,
    "due_date" DATE NOT NULL,
    "action_tracking_id" UUID,
    "status_cache" "CapaActionPlanStatusCache" NOT NULL DEFAULT 'OPEN',
    "completed_date_cache" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "capa_action_plans_pkey" PRIMARY KEY ("capa_action_plan_id")
);

-- CreateTable
CREATE TABLE "capa_effectiveness_verification" (
    "effectiveness_verification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "capa_register_id" UUID NOT NULL,
    "verification_method" "CapaVerificationMethod" NOT NULL,
    "observation_period_days" INTEGER NOT NULL,
    "verification_due_date" DATE NOT NULL,
    "verified_by" UUID NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "result" "CapaVerificationResult" NOT NULL DEFAULT 'PENDING',
    "evidence_description" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "capa_effectiveness_verification_pkey" PRIMARY KEY ("effectiveness_verification_id")
);

-- CreateTable
CREATE TABLE "capa_approvals" (
    "capa_approval_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "capa_register_id" UUID NOT NULL,
    "approval_stage" VARCHAR(100) NOT NULL,
    "workflow_instance_id" UUID NOT NULL,
    "decision" "CapaApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ,
    "comment" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "capa_approvals_pkey" PRIMARY KEY ("capa_approval_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capa_register_workflow_instance_id_key" ON "capa_register"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "capa_register_tenant_id_source_type_source_id_idx" ON "capa_register"("tenant_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "capa_register_tenant_id_status_idx" ON "capa_register"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "capa_register_company_id_idx" ON "capa_register"("company_id");

-- CreateIndex
CREATE INDEX "capa_register_branch_id_idx" ON "capa_register"("branch_id");

-- CreateIndex
CREATE INDEX "capa_register_site_id_idx" ON "capa_register"("site_id");

-- CreateIndex
CREATE INDEX "capa_register_department_id_idx" ON "capa_register"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "capa_register_tenant_id_capa_number_key" ON "capa_register"("tenant_id", "capa_number");

-- CreateIndex
CREATE INDEX "capa_root_cause_analysis_tenant_id_capa_register_id_idx" ON "capa_root_cause_analysis"("tenant_id", "capa_register_id");

-- CreateIndex
CREATE INDEX "capa_action_plans_tenant_id_capa_register_id_idx" ON "capa_action_plans"("tenant_id", "capa_register_id");

-- CreateIndex
CREATE INDEX "capa_action_plans_root_cause_analysis_id_idx" ON "capa_action_plans"("root_cause_analysis_id");

-- CreateIndex
CREATE INDEX "capa_action_plans_pic_user_id_idx" ON "capa_action_plans"("pic_user_id");

-- CreateIndex
CREATE INDEX "capa_effectiveness_verification_tenant_id_capa_register_id_idx" ON "capa_effectiveness_verification"("tenant_id", "capa_register_id");

-- CreateIndex
CREATE UNIQUE INDEX "capa_approvals_workflow_instance_id_key" ON "capa_approvals"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "capa_approvals_tenant_id_capa_register_id_idx" ON "capa_approvals"("tenant_id", "capa_register_id");

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_escalated_capa_register_id_fkey" FOREIGN KEY ("escalated_capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_root_cause_analysis" ADD CONSTRAINT "capa_root_cause_analysis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_root_cause_analysis" ADD CONSTRAINT "capa_root_cause_analysis_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_root_cause_analysis" ADD CONSTRAINT "capa_root_cause_analysis_analyzed_by_fkey" FOREIGN KEY ("analyzed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_root_cause_analysis" ADD CONSTRAINT "capa_root_cause_analysis_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_root_cause_analysis" ADD CONSTRAINT "capa_root_cause_analysis_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_action_plans" ADD CONSTRAINT "capa_action_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_action_plans" ADD CONSTRAINT "capa_action_plans_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_action_plans" ADD CONSTRAINT "capa_action_plans_root_cause_analysis_id_fkey" FOREIGN KEY ("root_cause_analysis_id") REFERENCES "capa_root_cause_analysis"("root_cause_analysis_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_action_plans" ADD CONSTRAINT "capa_action_plans_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_action_plans" ADD CONSTRAINT "capa_action_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_action_plans" ADD CONSTRAINT "capa_action_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_effectiveness_verification" ADD CONSTRAINT "capa_effectiveness_verification_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_effectiveness_verification" ADD CONSTRAINT "capa_effectiveness_verification_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_effectiveness_verification" ADD CONSTRAINT "capa_effectiveness_verification_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_effectiveness_verification" ADD CONSTRAINT "capa_effectiveness_verification_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_effectiveness_verification" ADD CONSTRAINT "capa_effectiveness_verification_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_approvals" ADD CONSTRAINT "capa_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_approvals" ADD CONSTRAINT "capa_approvals_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_approvals" ADD CONSTRAINT "capa_approvals_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_approvals" ADD CONSTRAINT "capa_approvals_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_approvals" ADD CONSTRAINT "capa_approvals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_approvals" ADD CONSTRAINT "capa_approvals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
