-- CreateEnum
CREATE TYPE "AuditProgramStatus" AS ENUM ('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditProgramPlanItemStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'REPORT_DRAFTED', 'REPORT_APPROVED', 'PENDING_CAPA_CLOSURE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditTeamRole" AS ENUM ('LEAD_AUDITOR', 'AUDITOR', 'TECHNICAL_EXPERT', 'OBSERVER', 'TRAINEE_AUDITOR');

-- CreateEnum
CREATE TYPE "AuditFindingClassification" AS ENUM ('MAJOR_NC', 'MINOR_NC', 'OBSERVATION', 'OFI');

-- CreateEnum
CREATE TYPE "AuditFindingStatus" AS ENUM ('OPEN', 'CAPA_LINKED', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditorCompetencyType" AS ENUM ('LEAD_AUDITOR_CERT', 'AUDITOR_CERT', 'TECHNICAL_EXPERT_QUALIFICATION');

-- CreateEnum
CREATE TYPE "AuditorCompetencyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "audit_types" (
    "audit_type_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "requires_external_body" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_types_pkey" PRIMARY KEY ("audit_type_id")
);

-- CreateTable
CREATE TABLE "audit_checklists" (
    "audit_checklist_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "standard_code" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_checklists_pkey" PRIMARY KEY ("audit_checklist_id")
);

-- CreateTable
CREATE TABLE "audit_checklist_items" (
    "checklist_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_checklist_id" UUID NOT NULL,
    "clause_reference" VARCHAR(30) NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "criteria_text" TEXT NOT NULL,
    "guidance_note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_checklist_items_pkey" PRIMARY KEY ("checklist_item_id")
);

-- CreateTable
CREATE TABLE "audit_programs" (
    "audit_program_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "program_year" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "objective" TEXT,
    "status" "AuditProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "workflow_instance_id" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_programs_pkey" PRIMARY KEY ("audit_program_id")
);

-- CreateTable
CREATE TABLE "audit_program_plan_items" (
    "plan_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_program_id" UUID NOT NULL,
    "planned_month" INTEGER NOT NULL,
    "audit_type_id" UUID NOT NULL,
    "site_id" UUID,
    "department_id" UUID,
    "standard_reference" VARCHAR(200) NOT NULL,
    "planned_lead_auditor_id" UUID,
    "status" "AuditProgramPlanItemStatus" NOT NULL DEFAULT 'PLANNED',
    "linked_audit_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_program_plan_items_pkey" PRIMARY KEY ("plan_item_id")
);

-- CreateTable
CREATE TABLE "audits" (
    "audit_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_number" VARCHAR(50) NOT NULL,
    "audit_program_plan_item_id" UUID,
    "audit_type_id" UUID NOT NULL,
    "audit_checklist_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "lead_auditor_id" UUID NOT NULL,
    "planned_start_date" DATE NOT NULL,
    "planned_end_date" DATE NOT NULL,
    "actual_start_date" DATE,
    "actual_end_date" DATE,
    "opening_meeting_datetime" TIMESTAMPTZ,
    "opening_meeting_notes" TEXT,
    "closing_meeting_datetime" TIMESTAMPTZ,
    "closing_meeting_notes" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'PLANNED',
    "overall_conclusion" TEXT,
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "audit_team_members" (
    "audit_team_member_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_in_team" "AuditTeamRole" NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_team_members_pkey" PRIMARY KEY ("audit_team_member_id")
);

-- CreateTable
CREATE TABLE "audit_auditee_scopes" (
    "auditee_scope_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "department_id" UUID,
    "process_area" VARCHAR(200),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_auditee_scopes_pkey" PRIMARY KEY ("auditee_scope_id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "audit_finding_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "checklist_item_id" UUID,
    "finding_number" VARCHAR(30) NOT NULL,
    "classification" "AuditFindingClassification" NOT NULL,
    "clause_reference" VARCHAR(30),
    "description" TEXT NOT NULL,
    "evidence_description" TEXT,
    "auditee_response" TEXT,
    "requires_capa" BOOLEAN NOT NULL DEFAULT true,
    "capa_register_id" UUID,
    "status" "AuditFindingStatus" NOT NULL DEFAULT 'OPEN',
    "identified_by" UUID NOT NULL,
    "identified_at" TIMESTAMPTZ NOT NULL,
    "target_closure_date" DATE,
    "closed_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("audit_finding_id")
);

-- CreateTable
CREATE TABLE "auditor_competency_records" (
    "competency_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "competency_type" "AuditorCompetencyType" NOT NULL,
    "standard_scope" VARCHAR(100) NOT NULL,
    "certification_body" VARCHAR(150),
    "certificate_number" VARCHAR(100),
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE,
    "status" "AuditorCompetencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "related_training_record_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "auditor_competency_records_pkey" PRIMARY KEY ("competency_record_id")
);

-- CreateTable
CREATE TABLE "audit_reports" (
    "audit_report_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "executive_summary" TEXT,
    "scope_description" TEXT,
    "methodology_description" TEXT,
    "conclusion" TEXT,
    "total_major_nc" INTEGER NOT NULL DEFAULT 0,
    "total_minor_nc" INTEGER NOT NULL DEFAULT 0,
    "total_observation" INTEGER NOT NULL DEFAULT 0,
    "total_ofi" INTEGER NOT NULL DEFAULT 0,
    "prepared_by" UUID NOT NULL,
    "prepared_at" TIMESTAMPTZ NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "workflow_instance_id" UUID,
    "document_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_reports_pkey" PRIMARY KEY ("audit_report_id")
);

-- CreateIndex
CREATE INDEX "audit_types_tenant_id_is_active_idx" ON "audit_types"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "audit_types_tenant_id_code_key" ON "audit_types"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "audit_checklists_tenant_id_standard_code_is_active_idx" ON "audit_checklists"("tenant_id", "standard_code", "is_active");

-- CreateIndex
CREATE INDEX "audit_checklist_items_tenant_id_audit_checklist_id_sequence_idx" ON "audit_checklist_items"("tenant_id", "audit_checklist_id", "sequence_no");

-- CreateIndex
CREATE UNIQUE INDEX "audit_programs_workflow_instance_id_key" ON "audit_programs"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "audit_programs_tenant_id_status_idx" ON "audit_programs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_programs_company_id_idx" ON "audit_programs"("company_id");

-- CreateIndex
CREATE INDEX "audit_programs_branch_id_idx" ON "audit_programs"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_program_plan_items_linked_audit_id_key" ON "audit_program_plan_items"("linked_audit_id");

-- CreateIndex
CREATE INDEX "audit_program_plan_items_tenant_id_audit_program_id_idx" ON "audit_program_plan_items"("tenant_id", "audit_program_id");

-- CreateIndex
CREATE INDEX "audit_program_plan_items_audit_type_id_idx" ON "audit_program_plan_items"("audit_type_id");

-- CreateIndex
CREATE INDEX "audit_program_plan_items_site_id_idx" ON "audit_program_plan_items"("site_id");

-- CreateIndex
CREATE INDEX "audit_program_plan_items_department_id_idx" ON "audit_program_plan_items"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "audits_audit_program_plan_item_id_key" ON "audits"("audit_program_plan_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "audits_workflow_instance_id_key" ON "audits"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "audits_tenant_id_status_idx" ON "audits"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audits_audit_type_id_idx" ON "audits"("audit_type_id");

-- CreateIndex
CREATE INDEX "audits_audit_checklist_id_idx" ON "audits"("audit_checklist_id");

-- CreateIndex
CREATE INDEX "audits_company_id_idx" ON "audits"("company_id");

-- CreateIndex
CREATE INDEX "audits_branch_id_idx" ON "audits"("branch_id");

-- CreateIndex
CREATE INDEX "audits_site_id_idx" ON "audits"("site_id");

-- CreateIndex
CREATE INDEX "audits_lead_auditor_id_idx" ON "audits"("lead_auditor_id");

-- CreateIndex
CREATE UNIQUE INDEX "audits_tenant_id_audit_number_key" ON "audits"("tenant_id", "audit_number");

-- CreateIndex
CREATE INDEX "audit_team_members_tenant_id_audit_id_idx" ON "audit_team_members"("tenant_id", "audit_id");

-- CreateIndex
CREATE INDEX "audit_team_members_user_id_idx" ON "audit_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_team_members_audit_id_user_id_key" ON "audit_team_members"("audit_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_auditee_scopes_tenant_id_audit_id_idx" ON "audit_auditee_scopes"("tenant_id", "audit_id");

-- CreateIndex
CREATE INDEX "audit_auditee_scopes_department_id_idx" ON "audit_auditee_scopes"("department_id");

-- CreateIndex
CREATE INDEX "audit_findings_tenant_id_audit_id_idx" ON "audit_findings"("tenant_id", "audit_id");

-- CreateIndex
CREATE INDEX "audit_findings_tenant_id_status_idx" ON "audit_findings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_findings_checklist_item_id_idx" ON "audit_findings"("checklist_item_id");

-- CreateIndex
CREATE INDEX "auditor_competency_records_tenant_id_user_id_idx" ON "auditor_competency_records"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "auditor_competency_records_tenant_id_status_idx" ON "auditor_competency_records"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_reports_audit_id_key" ON "audit_reports"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_reports_workflow_instance_id_key" ON "audit_reports"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "audit_reports_tenant_id_audit_id_idx" ON "audit_reports"("tenant_id", "audit_id");

-- AddForeignKey
ALTER TABLE "audit_types" ADD CONSTRAINT "audit_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_types" ADD CONSTRAINT "audit_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_types" ADD CONSTRAINT "audit_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklists" ADD CONSTRAINT "audit_checklists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklists" ADD CONSTRAINT "audit_checklists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklists" ADD CONSTRAINT "audit_checklists_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklist_items" ADD CONSTRAINT "audit_checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklist_items" ADD CONSTRAINT "audit_checklist_items_audit_checklist_id_fkey" FOREIGN KEY ("audit_checklist_id") REFERENCES "audit_checklists"("audit_checklist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklist_items" ADD CONSTRAINT "audit_checklist_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_checklist_items" ADD CONSTRAINT "audit_checklist_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_audit_program_id_fkey" FOREIGN KEY ("audit_program_id") REFERENCES "audit_programs"("audit_program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_audit_type_id_fkey" FOREIGN KEY ("audit_type_id") REFERENCES "audit_types"("audit_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_planned_lead_auditor_id_fkey" FOREIGN KEY ("planned_lead_auditor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_linked_audit_id_fkey" FOREIGN KEY ("linked_audit_id") REFERENCES "audits"("audit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_program_plan_items" ADD CONSTRAINT "audit_program_plan_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_audit_program_plan_item_id_fkey" FOREIGN KEY ("audit_program_plan_item_id") REFERENCES "audit_program_plan_items"("plan_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_audit_type_id_fkey" FOREIGN KEY ("audit_type_id") REFERENCES "audit_types"("audit_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_audit_checklist_id_fkey" FOREIGN KEY ("audit_checklist_id") REFERENCES "audit_checklists"("audit_checklist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_lead_auditor_id_fkey" FOREIGN KEY ("lead_auditor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("audit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_auditee_scopes" ADD CONSTRAINT "audit_auditee_scopes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_auditee_scopes" ADD CONSTRAINT "audit_auditee_scopes_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("audit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_auditee_scopes" ADD CONSTRAINT "audit_auditee_scopes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_auditee_scopes" ADD CONSTRAINT "audit_auditee_scopes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_auditee_scopes" ADD CONSTRAINT "audit_auditee_scopes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("audit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "audit_checklist_items"("checklist_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_identified_by_fkey" FOREIGN KEY ("identified_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditor_competency_records" ADD CONSTRAINT "auditor_competency_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditor_competency_records" ADD CONSTRAINT "auditor_competency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditor_competency_records" ADD CONSTRAINT "auditor_competency_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditor_competency_records" ADD CONSTRAINT "auditor_competency_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("audit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
