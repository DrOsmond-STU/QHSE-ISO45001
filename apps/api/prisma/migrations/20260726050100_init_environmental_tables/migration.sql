-- Task 5.2 (Modul 12 Environmental Management) — 7 tabel baru + 21 enum.

-- CreateEnum
CREATE TYPE "EnvLifeCycleStage" AS ENUM ('INPUT_PROCUREMENT', 'PRODUCTION', 'STORAGE', 'DISTRIBUTION', 'USE', 'END_OF_LIFE');

-- CreateEnum
CREATE TYPE "EnvConditionType" AS ENUM ('NORMAL', 'ABNORMAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "EnvImpactType" AS ENUM ('AIR', 'WATER', 'LAND_SOIL', 'WASTE', 'NOISE', 'RESOURCE_CONSUMPTION', 'BIODIVERSITY', 'OTHER');

-- CreateEnum
CREATE TYPE "EnvSignificanceLevel" AS ENUM ('NOT_SIGNIFICANT', 'SIGNIFICANT');

-- CreateEnum
CREATE TYPE "EnvAspectImpactStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnvMonitoringType" AS ENUM ('AIR_EMISSION', 'AMBIENT_AIR', 'WASTEWATER_EFFLUENT', 'NOISE', 'VIBRATION', 'SOIL', 'GROUNDWATER');

-- CreateEnum
CREATE TYPE "EnvComplianceStatus" AS ENUM ('COMPLIANT', 'EXCEED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EnvMonitoringRecordStatus" AS ENUM ('RECORDED', 'VERIFIED', 'REPORTED_TO_REGULATOR');

-- CreateEnum
CREATE TYPE "EnvWasteType" AS ENUM ('HAZARDOUS_B3', 'NON_HAZARDOUS');

-- CreateEnum
CREATE TYPE "EnvWasteUnitOfMeasure" AS ENUM ('KG', 'TON', 'LITER', 'DRUM');

-- CreateEnum
CREATE TYPE "EnvWastePackagingType" AS ENUM ('DRUM', 'IBC_TANK', 'JUMBO_BAG', 'OTHER');

-- CreateEnum
CREATE TYPE "EnvManifestStatus" AS ENUM ('DRAFT', 'ISSUED', 'IN_TRANSIT', 'RECEIVED_BY_TRANSPORTER', 'RECEIVED_BY_PROCESSOR', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EnvFestronikSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED', 'SYNC_FAILED');

-- CreateEnum
CREATE TYPE "EnvProperAssessmentType" AS ENUM ('INTERNAL_SELF_ASSESSMENT', 'PRE_SUBMISSION_REVIEW');

-- CreateEnum
CREATE TYPE "EnvProperRating" AS ENUM ('HITAM', 'MERAH', 'BIRU', 'HIJAU', 'EMAS');

-- CreateEnum
CREATE TYPE "EnvProperSubmissionStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEWED', 'SUBMITTED_TO_KLHK', 'RESULT_RECEIVED');

-- CreateEnum
CREATE TYPE "EnvProperCriteriaCategory" AS ENUM ('AIR_POLLUTION_CONTROL', 'WATER_POLLUTION_CONTROL', 'HAZARDOUS_WASTE_MANAGEMENT', 'NON_HAZARDOUS_WASTE_3R', 'AMDAL_UKL_UPL_COMPLIANCE', 'COMMUNITY_DEVELOPMENT_CSR', 'BIODIVERSITY_CONSERVATION', 'ENERGY_EFFICIENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "EnvProperCriteriaComplianceStatus" AS ENUM ('FULLY_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EnvProperEvidenceReferenceType" AS ENUM ('ENVIRONMENTAL_MONITORING_RECORD', 'WASTE_MANIFEST_RECORD', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EnvPermitMedia" AS ENUM ('AIR_EMISSION', 'WASTEWATER', 'AMDAL', 'UKL_UPL', 'HAZARDOUS_WASTE_STORAGE_TPS_LB3', 'WASTE_UTILIZATION', 'WATER_ABSTRACTION', 'OTHER');

-- CreateEnum
CREATE TYPE "EnvPermitMonitoringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateTable
CREATE TABLE "environmental_aspects_impacts" (
    "aspect_impact_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "register_number" VARCHAR(50) NOT NULL,
    "life_cycle_stage" "EnvLifeCycleStage",
    "condition_type" "EnvConditionType" NOT NULL,
    "activity_process_area" VARCHAR(200) NOT NULL,
    "environmental_aspect" TEXT NOT NULL,
    "environmental_impact" TEXT NOT NULL,
    "impact_type" "EnvImpactType" NOT NULL,
    "likelihood_score" INTEGER NOT NULL,
    "severity_score" INTEGER NOT NULL,
    "frequency_score" INTEGER NOT NULL,
    "regulatory_score" INTEGER NOT NULL,
    "stakeholder_concern_score" INTEGER NOT NULL,
    "scoring_weight_detail" JSONB,
    "significance_score" DECIMAL(6,2) NOT NULL,
    "significance_threshold" DECIMAL(6,2) NOT NULL,
    "significance_level" "EnvSignificanceLevel" NOT NULL,
    "existing_controls" TEXT,
    "is_regulated" BOOLEAN NOT NULL DEFAULT false,
    "related_permit_id" UUID,
    "capa_id" UUID,
    "workflow_instance_id" UUID,
    "review_date" DATE,
    "next_review_date" DATE,
    "reviewed_by" UUID,
    "status" "EnvAspectImpactStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "environmental_aspects_impacts_pkey" PRIMARY KEY ("aspect_impact_id")
);

-- CreateTable
CREATE TABLE "environmental_monitoring_records" (
    "monitoring_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "monitoring_number" VARCHAR(50) NOT NULL,
    "monitoring_type" "EnvMonitoringType" NOT NULL,
    "monitoring_point_code" VARCHAR(50) NOT NULL,
    "monitoring_point_name" VARCHAR(150) NOT NULL,
    "parameter_name" VARCHAR(100) NOT NULL,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "result_value" DECIMAL NOT NULL,
    "baku_mutu_min" DECIMAL,
    "baku_mutu_max" DECIMAL,
    "regulatory_reference" VARCHAR(200),
    "compliance_status" "EnvComplianceStatus" NOT NULL,
    "sampling_date" DATE NOT NULL,
    "sampling_time" TIME,
    "analysis_method" VARCHAR(150),
    "lab_name" VARCHAR(200),
    "lab_accreditation_no" VARCHAR(100),
    "sample_taken_by" UUID,
    "analyzed_by" VARCHAR(150),
    "report_number" VARCHAR(100),
    "weather_condition" VARCHAR(100),
    "related_permit_id" UUID,
    "capa_id" UUID,
    "status" "EnvMonitoringRecordStatus" NOT NULL DEFAULT 'RECORDED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "environmental_monitoring_records_pkey" PRIMARY KEY ("monitoring_record_id")
);

-- CreateTable
CREATE TABLE "waste_manifest_records" (
    "waste_manifest_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "manifest_number" VARCHAR(50) NOT NULL,
    "festronik_manifest_no" VARCHAR(100),
    "waste_type" "EnvWasteType" NOT NULL,
    "waste_code" VARCHAR(20),
    "waste_name" VARCHAR(200) NOT NULL,
    "waste_description" TEXT,
    "waste_source_process" VARCHAR(200),
    "quantity" DECIMAL NOT NULL,
    "unit_of_measure" "EnvWasteUnitOfMeasure" NOT NULL,
    "packaging_type" "EnvWastePackagingType" NOT NULL,
    "generation_date" DATE NOT NULL,
    "storage_location" VARCHAR(150),
    "tps_lb3_permit_id" UUID,
    "transporter_name" VARCHAR(200),
    "transporter_license_no" VARCHAR(100),
    "transporter_vehicle_no" VARCHAR(50),
    "transport_date" DATE,
    "destination_facility_name" VARCHAR(200),
    "destination_facility_license_no" VARCHAR(100),
    "receiving_confirmation_date" DATE,
    "manifest_status" "EnvManifestStatus" NOT NULL DEFAULT 'DRAFT',
    "festronik_sync_status" "EnvFestronikSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "waste_manifest_records_pkey" PRIMARY KEY ("waste_manifest_id")
);

-- CreateTable
CREATE TABLE "waste_generation_log" (
    "waste_generation_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "log_date" DATE NOT NULL,
    "waste_code" VARCHAR(20),
    "waste_name" VARCHAR(200) NOT NULL,
    "waste_type" "EnvWasteType" NOT NULL,
    "quantity_generated" DECIMAL NOT NULL,
    "unit_of_measure" "EnvWasteUnitOfMeasure" NOT NULL,
    "storage_location" VARCHAR(150),
    "storage_start_date" DATE,
    "max_storage_duration_days" INTEGER,
    "cumulative_stored_quantity" DECIMAL,
    "storage_duration_warning_sent_at" TIMESTAMPTZ,
    "linked_waste_manifest_id" UUID,
    "recorded_by" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "waste_generation_log_pkey" PRIMARY KEY ("waste_generation_log_id")
);

-- CreateTable
CREATE TABLE "proper_self_assessment" (
    "proper_self_assessment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "assessment_period" VARCHAR(10) NOT NULL,
    "assessment_type" "EnvProperAssessmentType" NOT NULL,
    "overall_predicted_rating" "EnvProperRating",
    "override_justification" TEXT,
    "compliance_score_percentage" DECIMAL(5,2),
    "assessed_by" UUID NOT NULL,
    "assessment_date" DATE NOT NULL,
    "reviewed_by" UUID,
    "review_date" DATE,
    "workflow_instance_id" UUID,
    "submission_status" "EnvProperSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "klhk_official_rating" "EnvProperRating",
    "klhk_rating_received_date" DATE,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "proper_self_assessment_pkey" PRIMARY KEY ("proper_self_assessment_id")
);

-- CreateTable
CREATE TABLE "proper_self_assessment_criteria_scores" (
    "criteria_score_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "proper_self_assessment_id" UUID NOT NULL,
    "criteria_category" "EnvProperCriteriaCategory" NOT NULL,
    "criteria_description" TEXT NOT NULL,
    "compliance_status" "EnvProperCriteriaComplianceStatus" NOT NULL,
    "evidence_reference_type" "EnvProperEvidenceReferenceType",
    "evidence_reference_id" UUID,
    "score_value" DECIMAL(5,2) NOT NULL,
    "weight_percentage" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "proper_self_assessment_criteria_scores_pkey" PRIMARY KEY ("criteria_score_id")
);

-- CreateTable
CREATE TABLE "environmental_permits" (
    "environmental_permit_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "license_permit_id" UUID NOT NULL,
    "permit_media" "EnvPermitMedia" NOT NULL,
    "required_monitoring_parameters" JSONB,
    "required_monitoring_frequency" "EnvPermitMonitoringFrequency",
    "reporting_obligation_to" VARCHAR(150),
    "last_report_submitted_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "environmental_permits_pkey" PRIMARY KEY ("environmental_permit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "environmental_aspects_impacts_workflow_instance_id_key" ON "environmental_aspects_impacts"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "environmental_aspects_impacts_tenant_id_status_idx" ON "environmental_aspects_impacts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "environmental_aspects_impacts_tenant_id_site_id_idx" ON "environmental_aspects_impacts"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "environmental_aspects_impacts_capa_id_idx" ON "environmental_aspects_impacts"("capa_id");

-- CreateIndex
CREATE INDEX "environmental_aspects_impacts_related_permit_id_idx" ON "environmental_aspects_impacts"("related_permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "environmental_aspects_impacts_tenant_id_register_number_key" ON "environmental_aspects_impacts"("tenant_id", "register_number");

-- CreateIndex
CREATE INDEX "environmental_monitoring_records_tenant_id_status_idx" ON "environmental_monitoring_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "environmental_monitoring_records_tenant_id_site_id_idx" ON "environmental_monitoring_records"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "environmental_monitoring_records_capa_id_idx" ON "environmental_monitoring_records"("capa_id");

-- CreateIndex
CREATE INDEX "environmental_monitoring_records_related_permit_id_idx" ON "environmental_monitoring_records"("related_permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "environmental_monitoring_records_tenant_id_monitoring_numbe_key" ON "environmental_monitoring_records"("tenant_id", "monitoring_number");

-- CreateIndex
CREATE UNIQUE INDEX "waste_manifest_records_festronik_manifest_no_key" ON "waste_manifest_records"("festronik_manifest_no");

-- CreateIndex
CREATE INDEX "waste_manifest_records_tenant_id_manifest_status_idx" ON "waste_manifest_records"("tenant_id", "manifest_status");

-- CreateIndex
CREATE INDEX "waste_manifest_records_tenant_id_site_id_idx" ON "waste_manifest_records"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "waste_manifest_records_tps_lb3_permit_id_idx" ON "waste_manifest_records"("tps_lb3_permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "waste_manifest_records_tenant_id_manifest_number_key" ON "waste_manifest_records"("tenant_id", "manifest_number");

-- CreateIndex
CREATE INDEX "waste_generation_log_tenant_id_site_id_idx" ON "waste_generation_log"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "waste_generation_log_linked_waste_manifest_id_idx" ON "waste_generation_log"("linked_waste_manifest_id");

-- CreateIndex
CREATE UNIQUE INDEX "proper_self_assessment_workflow_instance_id_key" ON "proper_self_assessment"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "proper_self_assessment_tenant_id_submission_status_idx" ON "proper_self_assessment"("tenant_id", "submission_status");

-- CreateIndex
CREATE UNIQUE INDEX "proper_self_assessment_tenant_id_site_id_assessment_period__key" ON "proper_self_assessment"("tenant_id", "site_id", "assessment_period", "assessment_type");

-- CreateIndex
CREATE INDEX "proper_self_assessment_criteria_scores_tenant_id_proper_sel_idx" ON "proper_self_assessment_criteria_scores"("tenant_id", "proper_self_assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "environmental_permits_license_permit_id_key" ON "environmental_permits"("license_permit_id");

-- CreateIndex
CREATE INDEX "environmental_permits_tenant_id_permit_media_idx" ON "environmental_permits"("tenant_id", "permit_media");

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_related_permit_id_fkey" FOREIGN KEY ("related_permit_id") REFERENCES "environmental_permits"("environmental_permit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_aspects_impacts" ADD CONSTRAINT "environmental_aspects_impacts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_sample_taken_by_fkey" FOREIGN KEY ("sample_taken_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_related_permit_id_fkey" FOREIGN KEY ("related_permit_id") REFERENCES "environmental_permits"("environmental_permit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_monitoring_records" ADD CONSTRAINT "environmental_monitoring_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_manifest_records" ADD CONSTRAINT "waste_manifest_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_manifest_records" ADD CONSTRAINT "waste_manifest_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_manifest_records" ADD CONSTRAINT "waste_manifest_records_tps_lb3_permit_id_fkey" FOREIGN KEY ("tps_lb3_permit_id") REFERENCES "environmental_permits"("environmental_permit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_manifest_records" ADD CONSTRAINT "waste_manifest_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_manifest_records" ADD CONSTRAINT "waste_manifest_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_linked_waste_manifest_id_fkey" FOREIGN KEY ("linked_waste_manifest_id") REFERENCES "waste_manifest_records"("waste_manifest_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_generation_log" ADD CONSTRAINT "waste_generation_log_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_assessed_by_fkey" FOREIGN KEY ("assessed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment" ADD CONSTRAINT "proper_self_assessment_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment_criteria_scores" ADD CONSTRAINT "proper_self_assessment_criteria_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment_criteria_scores" ADD CONSTRAINT "proper_self_assessment_criteria_scores_proper_self_assessm_fkey" FOREIGN KEY ("proper_self_assessment_id") REFERENCES "proper_self_assessment"("proper_self_assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment_criteria_scores" ADD CONSTRAINT "proper_self_assessment_criteria_scores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proper_self_assessment_criteria_scores" ADD CONSTRAINT "proper_self_assessment_criteria_scores_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_permits" ADD CONSTRAINT "environmental_permits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_permits" ADD CONSTRAINT "environmental_permits_license_permit_id_fkey" FOREIGN KEY ("license_permit_id") REFERENCES "licenses_permits"("license_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_permits" ADD CONSTRAINT "environmental_permits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environmental_permits" ADD CONSTRAINT "environmental_permits_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
