-- CreateEnum
CREATE TYPE "HiraAssessmentType" AS ENUM ('ROUTINE', 'NON_ROUTINE', 'PROJECT_BASED', 'PERIODIC_REVIEW');

-- CreateEnum
CREATE TYPE "HiraAssessmentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'REQUIRES_REVISION', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ControlHierarchy" AS ENUM ('ELIMINATION', 'SUBSTITUTION', 'ENGINEERING', 'ADMINISTRATIVE', 'PPE');

-- CreateEnum
CREATE TYPE "JsaRecordStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HiradcRecordStatus" AS ENUM ('DRAFT', 'VERIFIED', 'APPROVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('STRATEGIC', 'OPERATIONAL', 'FINANCIAL', 'COMPLIANCE', 'REPUTATIONAL', 'HSE', 'IT_SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskAppetiteStatus" AS ENUM ('WITHIN_APPETITE', 'EXCEEDS_APPETITE');

-- CreateEnum
CREATE TYPE "CorporateRiskStatus" AS ENUM ('IDENTIFIED', 'ASSESSED', 'TREATMENT_IN_PROGRESS', 'MONITORED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskTreatmentSourceType" AS ENUM ('RISK_REGISTER', 'HIRA_LINE', 'HIRADC_LINE');

-- CreateEnum
CREATE TYPE "RiskTreatmentStrategy" AS ENUM ('AVOID', 'REDUCE_MITIGATE', 'TRANSFER', 'ACCEPT');

-- CreateEnum
CREATE TYPE "RiskTreatmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_EFFECTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "risk_matrix_cells" ADD COLUMN     "requires_escalation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "hira_assessments" (
    "hira_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hira_number" VARCHAR(100) NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "activity_description" TEXT NOT NULL,
    "assessment_type" "HiraAssessmentType" NOT NULL,
    "risk_matrix_config_id" UUID NOT NULL,
    "assessment_date" DATE NOT NULL,
    "review_due_date" DATE,
    "status" "HiraAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "hira_assessments_pkey" PRIMARY KEY ("hira_id")
);

-- CreateTable
CREATE TABLE "hira_team_members" (
    "hira_team_member_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hira_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_in_team" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hira_team_members_pkey" PRIMARY KEY ("hira_team_member_id")
);

-- CreateTable
CREATE TABLE "hira_hazard_lines" (
    "hira_line_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hira_id" UUID NOT NULL,
    "hazard_id" UUID,
    "hazard_description_freetext" TEXT,
    "existing_controls" TEXT,
    "likelihood_before" INTEGER NOT NULL,
    "severity_before" INTEGER NOT NULL,
    "risk_score_before" INTEGER NOT NULL,
    "risk_level_before" VARCHAR(30) NOT NULL,
    "additional_controls_required" TEXT,
    "control_hierarchy" "ControlHierarchy",
    "likelihood_after" INTEGER NOT NULL,
    "severity_after" INTEGER NOT NULL,
    "risk_score_after" INTEGER NOT NULL,
    "risk_level_after" VARCHAR(30) NOT NULL,
    "requires_escalation" BOOLEAN NOT NULL DEFAULT false,
    "responsible_user_id" UUID,
    "target_completion_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "hira_hazard_lines_pkey" PRIMARY KEY ("hira_line_id")
);

-- CreateTable
CREATE TABLE "jsa_records" (
    "jsa_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "jsa_number" VARCHAR(100) NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "job_title" VARCHAR(255) NOT NULL,
    "job_description" TEXT,
    "prepared_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "assessment_date" DATE NOT NULL,
    "valid_until" DATE,
    "linked_hira_id" UUID,
    "status" "JsaRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "jsa_records_pkey" PRIMARY KEY ("jsa_id")
);

-- CreateTable
CREATE TABLE "jsa_job_steps" (
    "jsa_step_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "jsa_id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "step_description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jsa_job_steps_pkey" PRIMARY KEY ("jsa_step_id")
);

-- CreateTable
CREATE TABLE "jsa_step_hazards" (
    "jsa_step_hazard_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "jsa_step_id" UUID NOT NULL,
    "hazard_id" UUID,
    "hazard_description_freetext" TEXT,
    "potential_risk" TEXT,
    "control_measures" TEXT NOT NULL,
    "ppe_required" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jsa_step_hazards_pkey" PRIMARY KEY ("jsa_step_hazard_id")
);

-- CreateTable
CREATE TABLE "jsa_crew_acknowledgements" (
    "ack_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "jsa_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "acknowledged_at" TIMESTAMPTZ NOT NULL,
    "signature_ref" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jsa_crew_acknowledgements_pkey" PRIMARY KEY ("ack_id")
);

-- CreateTable
CREATE TABLE "hiradc_records" (
    "hiradc_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hiradc_number" VARCHAR(100) NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "related_hira_id" UUID,
    "related_jsa_id" UUID,
    "work_permit_id" UUID,
    "task_description" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "assessment_datetime" TIMESTAMPTZ NOT NULL,
    "status" "HiradcRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMPTZ,
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "hiradc_records_pkey" PRIMARY KEY ("hiradc_id")
);

-- CreateTable
CREATE TABLE "hiradc_lines" (
    "hiradc_line_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hiradc_id" UUID NOT NULL,
    "hazard_id" UUID,
    "hazard_description_freetext" TEXT,
    "likelihood" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_level" VARCHAR(30) NOT NULL,
    "requires_escalation" BOOLEAN NOT NULL DEFAULT false,
    "control_measures" TEXT NOT NULL,
    "ppe_required" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hiradc_lines_pkey" PRIMARY KEY ("hiradc_line_id")
);

-- CreateTable
CREATE TABLE "risk_register" (
    "risk_register_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "risk_number" VARCHAR(100) NOT NULL,
    "company_id" UUID,
    "risk_category" "RiskCategory" NOT NULL,
    "risk_title" VARCHAR(255) NOT NULL,
    "risk_description" TEXT NOT NULL,
    "risk_owner_user_id" UUID NOT NULL,
    "risk_matrix_config_id" UUID NOT NULL,
    "likelihood_inherent" INTEGER NOT NULL,
    "severity_inherent" INTEGER NOT NULL,
    "risk_score_inherent" INTEGER NOT NULL,
    "risk_level_inherent" VARCHAR(30) NOT NULL,
    "current_controls" TEXT,
    "likelihood_residual" INTEGER NOT NULL,
    "severity_residual" INTEGER NOT NULL,
    "risk_score_residual" INTEGER NOT NULL,
    "risk_level_residual" VARCHAR(30) NOT NULL,
    "requires_escalation" BOOLEAN NOT NULL DEFAULT false,
    "risk_appetite_status" "RiskAppetiteStatus",
    "identified_date" DATE NOT NULL,
    "last_review_date" DATE,
    "next_review_date" DATE,
    "status" "CorporateRiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "overdue_notified_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "risk_register_pkey" PRIMARY KEY ("risk_register_id")
);

-- CreateTable
CREATE TABLE "risk_treatment_plans" (
    "risk_treatment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "source_type" "RiskTreatmentSourceType" NOT NULL,
    "source_id" UUID NOT NULL,
    "treatment_strategy" "RiskTreatmentStrategy" NOT NULL,
    "treatment_description" TEXT NOT NULL,
    "responsible_user_id" UUID NOT NULL,
    "target_date" DATE NOT NULL,
    "action_tracking_id" UUID,
    "capa_id" UUID,
    "status" "RiskTreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "effectiveness_review_notes" TEXT,
    "top_management_approved_by" UUID,
    "top_management_approved_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "risk_treatment_plans_pkey" PRIMARY KEY ("risk_treatment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hira_assessments_workflow_instance_id_key" ON "hira_assessments"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "hira_assessments_tenant_id_status_idx" ON "hira_assessments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "hira_assessments_tenant_id_site_id_idx" ON "hira_assessments"("tenant_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "hira_assessments_tenant_id_hira_number_key" ON "hira_assessments"("tenant_id", "hira_number");

-- CreateIndex
CREATE INDEX "hira_team_members_tenant_id_hira_id_idx" ON "hira_team_members"("tenant_id", "hira_id");

-- CreateIndex
CREATE UNIQUE INDEX "hira_team_members_hira_id_user_id_key" ON "hira_team_members"("hira_id", "user_id");

-- CreateIndex
CREATE INDEX "hira_hazard_lines_tenant_id_hira_id_idx" ON "hira_hazard_lines"("tenant_id", "hira_id");

-- CreateIndex
CREATE INDEX "hira_hazard_lines_tenant_id_hazard_id_idx" ON "hira_hazard_lines"("tenant_id", "hazard_id");

-- CreateIndex
CREATE UNIQUE INDEX "jsa_records_workflow_instance_id_key" ON "jsa_records"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "jsa_records_tenant_id_status_idx" ON "jsa_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "jsa_records_tenant_id_site_id_idx" ON "jsa_records"("tenant_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "jsa_records_tenant_id_jsa_number_key" ON "jsa_records"("tenant_id", "jsa_number");

-- CreateIndex
CREATE INDEX "jsa_job_steps_tenant_id_jsa_id_idx" ON "jsa_job_steps"("tenant_id", "jsa_id");

-- CreateIndex
CREATE UNIQUE INDEX "jsa_job_steps_jsa_id_sequence_no_key" ON "jsa_job_steps"("jsa_id", "sequence_no");

-- CreateIndex
CREATE INDEX "jsa_step_hazards_tenant_id_jsa_step_id_idx" ON "jsa_step_hazards"("tenant_id", "jsa_step_id");

-- CreateIndex
CREATE INDEX "jsa_step_hazards_tenant_id_hazard_id_idx" ON "jsa_step_hazards"("tenant_id", "hazard_id");

-- CreateIndex
CREATE INDEX "jsa_crew_acknowledgements_tenant_id_jsa_id_idx" ON "jsa_crew_acknowledgements"("tenant_id", "jsa_id");

-- CreateIndex
CREATE UNIQUE INDEX "jsa_crew_acknowledgements_jsa_id_user_id_work_date_key" ON "jsa_crew_acknowledgements"("jsa_id", "user_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "hiradc_records_workflow_instance_id_key" ON "hiradc_records"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "hiradc_records_tenant_id_status_idx" ON "hiradc_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "hiradc_records_tenant_id_site_id_idx" ON "hiradc_records"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "hiradc_records_tenant_id_valid_until_idx" ON "hiradc_records"("tenant_id", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "hiradc_records_tenant_id_hiradc_number_key" ON "hiradc_records"("tenant_id", "hiradc_number");

-- CreateIndex
CREATE INDEX "hiradc_lines_tenant_id_hiradc_id_idx" ON "hiradc_lines"("tenant_id", "hiradc_id");

-- CreateIndex
CREATE INDEX "hiradc_lines_tenant_id_hazard_id_idx" ON "hiradc_lines"("tenant_id", "hazard_id");

-- CreateIndex
CREATE INDEX "risk_register_tenant_id_status_idx" ON "risk_register"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "risk_register_tenant_id_next_review_date_idx" ON "risk_register"("tenant_id", "next_review_date");

-- CreateIndex
CREATE UNIQUE INDEX "risk_register_tenant_id_risk_number_key" ON "risk_register"("tenant_id", "risk_number");

-- CreateIndex
CREATE INDEX "risk_treatment_plans_tenant_id_source_type_source_id_idx" ON "risk_treatment_plans"("tenant_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "risk_treatment_plans_tenant_id_status_idx" ON "risk_treatment_plans"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_risk_matrix_config_id_fkey" FOREIGN KEY ("risk_matrix_config_id") REFERENCES "risk_matrix_configs"("risk_matrix_config_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_assessments" ADD CONSTRAINT "hira_assessments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_team_members" ADD CONSTRAINT "hira_team_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_team_members" ADD CONSTRAINT "hira_team_members_hira_id_fkey" FOREIGN KEY ("hira_id") REFERENCES "hira_assessments"("hira_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_team_members" ADD CONSTRAINT "hira_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_hazard_lines" ADD CONSTRAINT "hira_hazard_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_hazard_lines" ADD CONSTRAINT "hira_hazard_lines_hira_id_fkey" FOREIGN KEY ("hira_id") REFERENCES "hira_assessments"("hira_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_hazard_lines" ADD CONSTRAINT "hira_hazard_lines_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "hazard_register"("hazard_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_hazard_lines" ADD CONSTRAINT "hira_hazard_lines_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_hazard_lines" ADD CONSTRAINT "hira_hazard_lines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hira_hazard_lines" ADD CONSTRAINT "hira_hazard_lines_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_linked_hira_id_fkey" FOREIGN KEY ("linked_hira_id") REFERENCES "hira_assessments"("hira_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_records" ADD CONSTRAINT "jsa_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_job_steps" ADD CONSTRAINT "jsa_job_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_job_steps" ADD CONSTRAINT "jsa_job_steps_jsa_id_fkey" FOREIGN KEY ("jsa_id") REFERENCES "jsa_records"("jsa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_step_hazards" ADD CONSTRAINT "jsa_step_hazards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_step_hazards" ADD CONSTRAINT "jsa_step_hazards_jsa_step_id_fkey" FOREIGN KEY ("jsa_step_id") REFERENCES "jsa_job_steps"("jsa_step_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_step_hazards" ADD CONSTRAINT "jsa_step_hazards_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "hazard_register"("hazard_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_crew_acknowledgements" ADD CONSTRAINT "jsa_crew_acknowledgements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_crew_acknowledgements" ADD CONSTRAINT "jsa_crew_acknowledgements_jsa_id_fkey" FOREIGN KEY ("jsa_id") REFERENCES "jsa_records"("jsa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_crew_acknowledgements" ADD CONSTRAINT "jsa_crew_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_related_hira_id_fkey" FOREIGN KEY ("related_hira_id") REFERENCES "hira_assessments"("hira_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_related_jsa_id_fkey" FOREIGN KEY ("related_jsa_id") REFERENCES "jsa_records"("jsa_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_records" ADD CONSTRAINT "hiradc_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_lines" ADD CONSTRAINT "hiradc_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_lines" ADD CONSTRAINT "hiradc_lines_hiradc_id_fkey" FOREIGN KEY ("hiradc_id") REFERENCES "hiradc_records"("hiradc_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_lines" ADD CONSTRAINT "hiradc_lines_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "hazard_register"("hazard_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiradc_lines" ADD CONSTRAINT "hiradc_lines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_risk_owner_user_id_fkey" FOREIGN KEY ("risk_owner_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_risk_matrix_config_id_fkey" FOREIGN KEY ("risk_matrix_config_id") REFERENCES "risk_matrix_configs"("risk_matrix_config_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_plans" ADD CONSTRAINT "risk_treatment_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_plans" ADD CONSTRAINT "risk_treatment_plans_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_plans" ADD CONSTRAINT "risk_treatment_plans_top_management_approved_by_fkey" FOREIGN KEY ("top_management_approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_plans" ADD CONSTRAINT "risk_treatment_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_plans" ADD CONSTRAINT "risk_treatment_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
