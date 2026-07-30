-- CreateEnum
CREATE TYPE "IncidentClassification" AS ENUM ('NEAR_MISS', 'FIRST_AID', 'MEDICAL_TREATMENT', 'RESTRICTED_WORK_CASE', 'LOST_TIME_INJURY', 'FATALITY', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL_SPILL', 'PROCESS_SAFETY_EVENT');

-- CreateEnum
CREATE TYPE "IncidentSeverityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentReportStatus" AS ENUM ('REPORTED', 'UNDER_VERIFICATION', 'UNDER_INVESTIGATION', 'INVESTIGATION_COMPLETED', 'PENDING_REGULATORY_REPORT', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "IncidentInvestigationMethod" AS ENUM ('FIVE_WHY', 'FISHBONE', 'BOWTIE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentInvestigationStatus" AS ENUM ('IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "IncidentInvestigationTeamRole" AS ENUM ('LEAD', 'MEMBER', 'SME', 'OBSERVER');

-- CreateEnum
CREATE TYPE "IncidentRootCauseType" AS ENUM ('IMMEDIATE_CAUSE', 'ROOT_CAUSE', 'CONTRIBUTING_FACTOR');

-- CreateEnum
CREATE TYPE "IncidentRootCauseCategory" AS ENUM ('PEOPLE', 'EQUIPMENT_MATERIAL', 'PROCESS_PROCEDURE', 'ENVIRONMENT', 'MANAGEMENT_SYSTEM');

-- CreateEnum
CREATE TYPE "IncidentRegulatoryBody" AS ENUM ('KEMNAKER', 'BPJS_KETENAGAKERJAAN', 'DISNAKER', 'DLH_KLHK', 'SKK_MIGAS', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentRegulatoryReportStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "IncidentStatisticsPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ROLLING_12M');

-- CreateTable
CREATE TABLE "incident_reports" (
    "incident_report_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_number" VARCHAR(50) NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "classification" "IncidentClassification" NOT NULL,
    "initial_classification" "IncidentClassification" NOT NULL,
    "severity_level" "IncidentSeverityLevel" NOT NULL,
    "incident_datetime" TIMESTAMPTZ NOT NULL,
    "reported_datetime" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_detail" VARCHAR(200),
    "description" TEXT NOT NULL,
    "immediate_action_taken" TEXT,
    "reported_by" UUID,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "injured_person_id" UUID,
    "work_permit_id" UUID,
    "involves_contractor" BOOLEAN NOT NULL DEFAULT false,
    "contractor_company_id" UUID,
    "status" "IncidentReportStatus" NOT NULL DEFAULT 'REPORTED',
    "days_lost" INTEGER,
    "estimated_cost" DECIMAL(15,2),
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("incident_report_id")
);

-- CreateTable
CREATE TABLE "incident_investigations" (
    "incident_investigation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_report_id" UUID NOT NULL,
    "method" "IncidentInvestigationMethod" NOT NULL,
    "method_other_detail" VARCHAR(150),
    "lead_investigator_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "target_completion_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "findings_summary" TEXT,
    "status" "IncidentInvestigationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_investigations_pkey" PRIMARY KEY ("incident_investigation_id")
);

-- CreateTable
CREATE TABLE "incident_investigation_team" (
    "incident_investigation_team_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_investigation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_in_team" "IncidentInvestigationTeamRole" NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_investigation_team_pkey" PRIMARY KEY ("incident_investigation_team_id")
);

-- CreateTable
CREATE TABLE "incident_root_causes" (
    "incident_root_cause_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_investigation_id" UUID NOT NULL,
    "cause_type" "IncidentRootCauseType" NOT NULL,
    "category" "IncidentRootCauseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "method_reference" VARCHAR(100),
    "sequence_no" INTEGER,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_root_causes_pkey" PRIMARY KEY ("incident_root_cause_id")
);

-- CreateTable
CREATE TABLE "incident_corrective_actions" (
    "incident_corrective_action_link_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_report_id" UUID NOT NULL,
    "incident_investigation_id" UUID,
    "capa_register_id" UUID NOT NULL,
    "capa_status_cache" VARCHAR(50),
    "linked_by" UUID NOT NULL,
    "linked_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_corrective_actions_pkey" PRIMARY KEY ("incident_corrective_action_link_id")
);

-- CreateTable
CREATE TABLE "incident_witness_statements" (
    "incident_witness_statement_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_report_id" UUID NOT NULL,
    "witness_user_id" UUID,
    "witness_name_external" VARCHAR(150),
    "statement_text" TEXT NOT NULL,
    "statement_datetime" TIMESTAMPTZ NOT NULL,
    "recorded_by" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_witness_statements_pkey" PRIMARY KEY ("incident_witness_statement_id")
);

-- CreateTable
CREATE TABLE "incident_regulatory_reports" (
    "incident_regulatory_report_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "incident_report_id" UUID NOT NULL,
    "regulatory_body" "IncidentRegulatoryBody" NOT NULL,
    "report_type" VARCHAR(100) NOT NULL,
    "required_by_date" DATE NOT NULL,
    "submitted_date" DATE,
    "official_reference_number" VARCHAR(100),
    "status" "IncidentRegulatoryReportStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_by" UUID,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_regulatory_reports_pkey" PRIMARY KEY ("incident_regulatory_report_id")
);

-- CreateTable
CREATE TABLE "incident_statistics_cache" (
    "incident_statistics_cache_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "site_id" UUID,
    "period_type" "IncidentStatisticsPeriodType" NOT NULL,
    "period_start_date" DATE NOT NULL,
    "period_end_date" DATE NOT NULL,
    "total_manhours_worked" DECIMAL(18,2) NOT NULL,
    "fatality_count" INTEGER NOT NULL DEFAULT 0,
    "lti_count" INTEGER NOT NULL DEFAULT 0,
    "restricted_work_count" INTEGER NOT NULL DEFAULT 0,
    "medical_treatment_count" INTEGER NOT NULL DEFAULT 0,
    "first_aid_count" INTEGER NOT NULL DEFAULT 0,
    "near_miss_count" INTEGER NOT NULL DEFAULT 0,
    "property_damage_count" INTEGER NOT NULL DEFAULT 0,
    "environmental_spill_count" INTEGER NOT NULL DEFAULT 0,
    "process_safety_event_count" INTEGER NOT NULL DEFAULT 0,
    "total_days_lost" INTEGER NOT NULL DEFAULT 0,
    "rate_base_hours_used" DECIMAL(12,0) NOT NULL,
    "ltifr" DECIMAL(10,4) NOT NULL,
    "trir" DECIMAL(10,4) NOT NULL,
    "severity_rate" DECIMAL(10,4) NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "incident_statistics_cache_pkey" PRIMARY KEY ("incident_statistics_cache_id")
);

-- CreateIndex
CREATE INDEX "incident_reports_tenant_id_status_idx" ON "incident_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "incident_reports_tenant_id_site_id_idx" ON "incident_reports"("tenant_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "incident_reports_tenant_id_incident_number_key" ON "incident_reports"("tenant_id", "incident_number");

-- CreateIndex
CREATE UNIQUE INDEX "incident_investigations_workflow_instance_id_key" ON "incident_investigations"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "incident_investigations_tenant_id_incident_report_id_idx" ON "incident_investigations"("tenant_id", "incident_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "incident_investigation_team_incident_investigation_id_user__key" ON "incident_investigation_team"("incident_investigation_id", "user_id");

-- CreateIndex
CREATE INDEX "incident_root_causes_tenant_id_incident_investigation_id_idx" ON "incident_root_causes"("tenant_id", "incident_investigation_id");

-- CreateIndex
CREATE INDEX "incident_corrective_actions_tenant_id_incident_report_id_idx" ON "incident_corrective_actions"("tenant_id", "incident_report_id");

-- CreateIndex
CREATE INDEX "incident_witness_statements_tenant_id_incident_report_id_idx" ON "incident_witness_statements"("tenant_id", "incident_report_id");

-- CreateIndex
CREATE INDEX "incident_regulatory_reports_tenant_id_incident_report_id_idx" ON "incident_regulatory_reports"("tenant_id", "incident_report_id");

-- CreateIndex
CREATE INDEX "incident_regulatory_reports_tenant_id_status_idx" ON "incident_regulatory_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "incident_statistics_cache_tenant_id_period_type_period_star_idx" ON "incident_statistics_cache"("tenant_id", "period_type", "period_start_date");

-- CreateIndex
CREATE INDEX "incident_statistics_cache_tenant_id_site_id_idx" ON "incident_statistics_cache"("tenant_id", "site_id");

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_injured_person_id_fkey" FOREIGN KEY ("injured_person_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigations" ADD CONSTRAINT "incident_investigations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigations" ADD CONSTRAINT "incident_investigations_incident_report_id_fkey" FOREIGN KEY ("incident_report_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigations" ADD CONSTRAINT "incident_investigations_lead_investigator_id_fkey" FOREIGN KEY ("lead_investigator_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigations" ADD CONSTRAINT "incident_investigations_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigations" ADD CONSTRAINT "incident_investigations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigations" ADD CONSTRAINT "incident_investigations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigation_team" ADD CONSTRAINT "incident_investigation_team_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigation_team" ADD CONSTRAINT "incident_investigation_team_incident_investigation_id_fkey" FOREIGN KEY ("incident_investigation_id") REFERENCES "incident_investigations"("incident_investigation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigation_team" ADD CONSTRAINT "incident_investigation_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigation_team" ADD CONSTRAINT "incident_investigation_team_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_investigation_team" ADD CONSTRAINT "incident_investigation_team_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_root_causes" ADD CONSTRAINT "incident_root_causes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_root_causes" ADD CONSTRAINT "incident_root_causes_incident_investigation_id_fkey" FOREIGN KEY ("incident_investigation_id") REFERENCES "incident_investigations"("incident_investigation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_root_causes" ADD CONSTRAINT "incident_root_causes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_root_causes" ADD CONSTRAINT "incident_root_causes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_incident_report_id_fkey" FOREIGN KEY ("incident_report_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_incident_investigation_id_fkey" FOREIGN KEY ("incident_investigation_id") REFERENCES "incident_investigations"("incident_investigation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrective_actions" ADD CONSTRAINT "incident_corrective_actions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_witness_statements" ADD CONSTRAINT "incident_witness_statements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_witness_statements" ADD CONSTRAINT "incident_witness_statements_incident_report_id_fkey" FOREIGN KEY ("incident_report_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_witness_statements" ADD CONSTRAINT "incident_witness_statements_witness_user_id_fkey" FOREIGN KEY ("witness_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_witness_statements" ADD CONSTRAINT "incident_witness_statements_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_witness_statements" ADD CONSTRAINT "incident_witness_statements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_witness_statements" ADD CONSTRAINT "incident_witness_statements_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_regulatory_reports" ADD CONSTRAINT "incident_regulatory_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_regulatory_reports" ADD CONSTRAINT "incident_regulatory_reports_incident_report_id_fkey" FOREIGN KEY ("incident_report_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_regulatory_reports" ADD CONSTRAINT "incident_regulatory_reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_regulatory_reports" ADD CONSTRAINT "incident_regulatory_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_regulatory_reports" ADD CONSTRAINT "incident_regulatory_reports_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_statistics_cache" ADD CONSTRAINT "incident_statistics_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_statistics_cache" ADD CONSTRAINT "incident_statistics_cache_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_statistics_cache" ADD CONSTRAINT "incident_statistics_cache_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_statistics_cache" ADD CONSTRAINT "incident_statistics_cache_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_statistics_cache" ADD CONSTRAINT "incident_statistics_cache_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_statistics_cache" ADD CONSTRAINT "incident_statistics_cache_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
