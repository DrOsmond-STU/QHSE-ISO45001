-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('FIRE', 'EARTHQUAKE', 'HAZMAT_SPILL', 'MEDICAL_EMERGENCY', 'FLOOD', 'CIVIL_UNREST', 'EXPLOSION', 'STRUCTURAL_COLLAPSE', 'SEVERE_WEATHER', 'SECURITY_THREAT', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyPlanSeverityLevel" AS ENUM ('LEVEL_1_LOCAL', 'LEVEL_2_SITE_WIDE', 'LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY');

-- CreateEnum
CREATE TYPE "EmergencyPlanReviewFrequency" AS ENUM ('ANNUAL', 'BIENNIAL');

-- CreateEnum
CREATE TYPE "EmergencyPlanStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED_ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ErtRole" AS ENUM ('INCIDENT_COMMANDER', 'DEPUTY_INCIDENT_COMMANDER', 'FIRE_WARDEN', 'FIRST_AIDER', 'EVACUATION_MARSHAL', 'SECURITY_COORDINATOR', 'COMMUNICATION_OFFICER', 'HAZMAT_RESPONSE_OFFICER', 'ASSEMBLY_POINT_COORDINATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyTeamType" AS ENUM ('SITE_WIDE', 'SHIFT_BASED', 'BUILDING_SPECIFIC');

-- CreateEnum
CREATE TYPE "EmergencyTeamMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmergencyContactCategory" AS ENUM ('INTERNAL_ERT', 'HOSPITAL', 'FIRE_DEPARTMENT', 'POLICE', 'AMBULANCE', 'GOVERNMENT_AGENCY', 'SKK_MIGAS', 'ENVIRONMENTAL_AGENCY', 'UTILITY_PLN_PDAM', 'POISON_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyDrillType" AS ENUM ('TABLETOP', 'FUNCTIONAL', 'FULL_SCALE_EVACUATION');

-- CreateEnum
CREATE TYPE "EmergencyDrillStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyPersonType" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'VISITOR');

-- CreateEnum
CREATE TYPE "DrillAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "EmergencyActivationTriggerContext" AS ENUM ('DRILL', 'REAL_EMERGENCY');

-- CreateEnum
CREATE TYPE "EmergencyActivationStatus" AS ENUM ('ACTIVE', 'ALL_CLEAR_DECLARED', 'STOOD_DOWN');

-- CreateEnum
CREATE TYPE "MusterCheckinMethod" AS ENUM ('SELF_APP_CHECKIN', 'MARSHAL_MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "EquipmentReadinessStatus" AS ENUM ('READY', 'NEEDS_ATTENTION', 'OUT_OF_SERVICE', 'MISSING');

-- CreateTable
CREATE TABLE "emergency_muster_points" (
    "muster_point_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "muster_point_code" VARCHAR(50) NOT NULL,
    "muster_point_name" VARCHAR(150) NOT NULL,
    "location_description" TEXT,
    "gps_lat" DECIMAL(10,6),
    "gps_long" DECIMAL(10,6),
    "capacity_estimate" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_muster_points_pkey" PRIMARY KEY ("muster_point_id")
);

-- CreateTable
CREATE TABLE "emergency_response_plans" (
    "emergency_response_plan_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "plan_number" VARCHAR(50) NOT NULL,
    "plan_title" VARCHAR(200) NOT NULL,
    "emergency_type" "EmergencyType" NOT NULL,
    "scenario_description" TEXT NOT NULL,
    "default_muster_point_id" UUID,
    "related_document_id" UUID,
    "severity_level" "EmergencyPlanSeverityLevel" NOT NULL,
    "review_frequency" "EmergencyPlanReviewFrequency" NOT NULL DEFAULT 'ANNUAL',
    "last_reviewed_date" DATE,
    "next_review_due_date" DATE,
    "reviewed_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "effective_date" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "workflow_instance_id" UUID,
    "status" "EmergencyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_response_plans_pkey" PRIMARY KEY ("emergency_response_plan_id")
);

-- CreateTable
CREATE TABLE "emergency_response_plan_steps" (
    "plan_step_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "emergency_response_plan_id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "step_description" TEXT NOT NULL,
    "responsible_ert_role" "ErtRole",
    "max_time_target_minutes" INTEGER,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_response_plan_steps_pkey" PRIMARY KEY ("plan_step_id")
);

-- CreateTable
CREATE TABLE "emergency_response_teams" (
    "emergency_response_team_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "team_name" VARCHAR(150) NOT NULL,
    "team_type" "EmergencyTeamType" NOT NULL,
    "effective_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_response_teams_pkey" PRIMARY KEY ("emergency_response_team_id")
);

-- CreateTable
CREATE TABLE "emergency_response_team_members" (
    "team_member_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "emergency_response_team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ert_role" "ErtRole" NOT NULL,
    "backup_for_member_id" UUID,
    "certification_reference_id" UUID,
    "assigned_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "EmergencyTeamMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_response_team_members_pkey" PRIMARY KEY ("team_member_id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "emergency_contact_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID,
    "contact_category" "EmergencyContactCategory" NOT NULL,
    "contact_name" VARCHAR(200) NOT NULL,
    "organization_name" VARCHAR(200),
    "phone_primary" VARCHAR(50) NOT NULL,
    "phone_secondary" VARCHAR(50),
    "email" VARCHAR(150),
    "address" TEXT,
    "distance_from_site_km" DECIMAL(6,2),
    "estimated_response_time_minutes" INTEGER,
    "is_24_7" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("emergency_contact_id")
);

-- CreateTable
CREATE TABLE "emergency_drills" (
    "emergency_drill_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "drill_number" VARCHAR(50) NOT NULL,
    "emergency_response_plan_id" UUID NOT NULL,
    "drill_type" "EmergencyDrillType" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "actual_date" DATE,
    "objective" TEXT,
    "scenario_description" TEXT,
    "planned_participant_count" INTEGER,
    "actual_participant_count" INTEGER,
    "evacuation_time_target_minutes" INTEGER,
    "evacuation_time_actual_minutes" INTEGER,
    "observer_notes" TEXT,
    "gaps_identified" TEXT,
    "capa_id" UUID,
    "conducted_by" UUID NOT NULL,
    "status" "EmergencyDrillStatus" NOT NULL DEFAULT 'PLANNED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_drills_pkey" PRIMARY KEY ("emergency_drill_id")
);

-- CreateTable
CREATE TABLE "drill_participation_logs" (
    "drill_participation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "emergency_drill_id" UUID NOT NULL,
    "user_id" UUID,
    "participant_name" VARCHAR(150),
    "participant_type" "EmergencyPersonType" NOT NULL,
    "role_during_drill" VARCHAR(100),
    "attendance_status" "DrillAttendanceStatus" NOT NULL,
    "performance_notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "drill_participation_logs_pkey" PRIMARY KEY ("drill_participation_id")
);

-- CreateTable
CREATE TABLE "emergency_activations" (
    "emergency_activation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "emergency_response_plan_id" UUID,
    "trigger_context" "EmergencyActivationTriggerContext" NOT NULL,
    "related_emergency_drill_id" UUID,
    "emergency_type" "EmergencyType" NOT NULL,
    "activation_datetime" TIMESTAMPTZ NOT NULL,
    "activated_by" UUID NOT NULL,
    "description" TEXT,
    "total_expected_headcount" INTEGER,
    "related_incident_report_id" UUID,
    "all_clear_datetime" TIMESTAMPTZ,
    "status" "EmergencyActivationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_activations_pkey" PRIMARY KEY ("emergency_activation_id")
);

-- CreateTable
CREATE TABLE "muster_point_checkins" (
    "muster_checkin_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "muster_point_id" UUID NOT NULL,
    "emergency_activation_id" UUID NOT NULL,
    "user_id" UUID,
    "checkin_person_name" VARCHAR(150),
    "checkin_person_type" "EmergencyPersonType",
    "checkin_timestamp" TIMESTAMPTZ NOT NULL,
    "checkin_method" "MusterCheckinMethod" NOT NULL,
    "gps_lat" DECIMAL(10,6),
    "gps_long" DECIMAL(10,6),
    "device_info" VARCHAR(255),
    "recorded_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "muster_point_checkins_pkey" PRIMARY KEY ("muster_checkin_id")
);

-- CreateTable
CREATE TABLE "emergency_equipment_readiness_checklist" (
    "readiness_checklist_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "checklist_number" VARCHAR(50),
    "asset_id" UUID NOT NULL,
    "inspection_date" DATE NOT NULL,
    "checked_by" UUID NOT NULL,
    "readiness_status" "EquipmentReadinessStatus" NOT NULL,
    "issue_description" TEXT,
    "capa_id" UUID,
    "linked_maintenance_record_id" UUID,
    "next_check_due_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "emergency_equipment_readiness_checklist_pkey" PRIMARY KEY ("readiness_checklist_id")
);

-- CreateIndex
CREATE INDEX "emergency_muster_points_tenant_id_site_id_is_active_idx" ON "emergency_muster_points"("tenant_id", "site_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_response_plans_workflow_instance_id_key" ON "emergency_response_plans"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "emergency_response_plans_tenant_id_site_id_status_idx" ON "emergency_response_plans"("tenant_id", "site_id", "status");

-- CreateIndex
CREATE INDEX "emergency_response_plans_tenant_id_status_next_review_due_d_idx" ON "emergency_response_plans"("tenant_id", "status", "next_review_due_date");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_response_plans_tenant_id_plan_number_key" ON "emergency_response_plans"("tenant_id", "plan_number");

-- CreateIndex
CREATE INDEX "emergency_response_plan_steps_tenant_id_emergency_response__idx" ON "emergency_response_plan_steps"("tenant_id", "emergency_response_plan_id", "sequence_no");

-- CreateIndex
CREATE INDEX "emergency_response_teams_tenant_id_site_id_is_active_idx" ON "emergency_response_teams"("tenant_id", "site_id", "is_active");

-- CreateIndex
CREATE INDEX "emergency_response_team_members_tenant_id_emergency_respons_idx" ON "emergency_response_team_members"("tenant_id", "emergency_response_team_id", "status");

-- CreateIndex
CREATE INDEX "emergency_contacts_tenant_id_site_id_is_active_idx" ON "emergency_contacts"("tenant_id", "site_id", "is_active");

-- CreateIndex
CREATE INDEX "emergency_drills_tenant_id_site_id_status_idx" ON "emergency_drills"("tenant_id", "site_id", "status");

-- CreateIndex
CREATE INDEX "emergency_drills_tenant_id_emergency_response_plan_id_idx" ON "emergency_drills"("tenant_id", "emergency_response_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_drills_tenant_id_drill_number_key" ON "emergency_drills"("tenant_id", "drill_number");

-- CreateIndex
CREATE INDEX "drill_participation_logs_tenant_id_emergency_drill_id_idx" ON "drill_participation_logs"("tenant_id", "emergency_drill_id");

-- CreateIndex
CREATE INDEX "emergency_activations_tenant_id_site_id_status_idx" ON "emergency_activations"("tenant_id", "site_id", "status");

-- CreateIndex
CREATE INDEX "emergency_activations_tenant_id_trigger_context_idx" ON "emergency_activations"("tenant_id", "trigger_context");

-- CreateIndex
CREATE INDEX "muster_point_checkins_tenant_id_emergency_activation_id_idx" ON "muster_point_checkins"("tenant_id", "emergency_activation_id");

-- CreateIndex
CREATE INDEX "muster_point_checkins_tenant_id_muster_point_id_idx" ON "muster_point_checkins"("tenant_id", "muster_point_id");

-- CreateIndex
CREATE INDEX "emergency_equipment_readiness_checklist_tenant_id_site_id_r_idx" ON "emergency_equipment_readiness_checklist"("tenant_id", "site_id", "readiness_status");

-- CreateIndex
CREATE INDEX "emergency_equipment_readiness_checklist_tenant_id_asset_id_idx" ON "emergency_equipment_readiness_checklist"("tenant_id", "asset_id");

-- AddForeignKey
ALTER TABLE "emergency_muster_points" ADD CONSTRAINT "emergency_muster_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_muster_points" ADD CONSTRAINT "emergency_muster_points_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_muster_points" ADD CONSTRAINT "emergency_muster_points_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_muster_points" ADD CONSTRAINT "emergency_muster_points_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_default_muster_point_id_fkey" FOREIGN KEY ("default_muster_point_id") REFERENCES "emergency_muster_points"("muster_point_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_related_document_id_fkey" FOREIGN KEY ("related_document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plans" ADD CONSTRAINT "emergency_response_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plan_steps" ADD CONSTRAINT "emergency_response_plan_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plan_steps" ADD CONSTRAINT "emergency_response_plan_steps_emergency_response_plan_id_fkey" FOREIGN KEY ("emergency_response_plan_id") REFERENCES "emergency_response_plans"("emergency_response_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plan_steps" ADD CONSTRAINT "emergency_response_plan_steps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_plan_steps" ADD CONSTRAINT "emergency_response_plan_steps_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_teams" ADD CONSTRAINT "emergency_response_teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_teams" ADD CONSTRAINT "emergency_response_teams_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_teams" ADD CONSTRAINT "emergency_response_teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_teams" ADD CONSTRAINT "emergency_response_teams_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_team_members" ADD CONSTRAINT "emergency_response_team_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_team_members" ADD CONSTRAINT "emergency_response_team_members_emergency_response_team_id_fkey" FOREIGN KEY ("emergency_response_team_id") REFERENCES "emergency_response_teams"("emergency_response_team_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_team_members" ADD CONSTRAINT "emergency_response_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_team_members" ADD CONSTRAINT "emergency_response_team_members_backup_for_member_id_fkey" FOREIGN KEY ("backup_for_member_id") REFERENCES "emergency_response_team_members"("team_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_team_members" ADD CONSTRAINT "emergency_response_team_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_response_team_members" ADD CONSTRAINT "emergency_response_team_members_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_emergency_response_plan_id_fkey" FOREIGN KEY ("emergency_response_plan_id") REFERENCES "emergency_response_plans"("emergency_response_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drill_participation_logs" ADD CONSTRAINT "drill_participation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drill_participation_logs" ADD CONSTRAINT "drill_participation_logs_emergency_drill_id_fkey" FOREIGN KEY ("emergency_drill_id") REFERENCES "emergency_drills"("emergency_drill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drill_participation_logs" ADD CONSTRAINT "drill_participation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drill_participation_logs" ADD CONSTRAINT "drill_participation_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drill_participation_logs" ADD CONSTRAINT "drill_participation_logs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_emergency_response_plan_id_fkey" FOREIGN KEY ("emergency_response_plan_id") REFERENCES "emergency_response_plans"("emergency_response_plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_related_emergency_drill_id_fkey" FOREIGN KEY ("related_emergency_drill_id") REFERENCES "emergency_drills"("emergency_drill_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_related_incident_report_id_fkey" FOREIGN KEY ("related_incident_report_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_activations" ADD CONSTRAINT "emergency_activations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_muster_point_id_fkey" FOREIGN KEY ("muster_point_id") REFERENCES "emergency_muster_points"("muster_point_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_emergency_activation_id_fkey" FOREIGN KEY ("emergency_activation_id") REFERENCES "emergency_activations"("emergency_activation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muster_point_checkins" ADD CONSTRAINT "muster_point_checkins_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment_readiness_checklist" ADD CONSTRAINT "emergency_equipment_readiness_checklist_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment_readiness_checklist" ADD CONSTRAINT "emergency_equipment_readiness_checklist_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment_readiness_checklist" ADD CONSTRAINT "emergency_equipment_readiness_checklist_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment_readiness_checklist" ADD CONSTRAINT "emergency_equipment_readiness_checklist_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment_readiness_checklist" ADD CONSTRAINT "emergency_equipment_readiness_checklist_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
