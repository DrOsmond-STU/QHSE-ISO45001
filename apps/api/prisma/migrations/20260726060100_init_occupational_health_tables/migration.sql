-- Task 5.3 — 31 enum baru + 13 tabel domain Modul 13 Occupational Health
-- + tenant_encryption_keys (platform/field-encryption, task 252).
-- ALTER TYPE CapaSourceType di migrasi TERPISAH sebelumnya (20260726060000).

-- CreateEnum
CREATE TYPE "OhMcuType" AS ENUM ('PRE_EMPLOYMENT', 'PERIODIC', 'SPECIAL', 'EXIT');

-- CreateEnum
CREATE TYPE "OhMcuScheduleStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OhMcuResultOverall" AS ENUM ('NORMAL', 'MINOR_FINDING', 'MAJOR_FINDING', 'REQUIRES_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "OhMcuResultStatus" AS ENUM ('DRAFT', 'FINALIZED', 'SHARED_WITH_EMPLOYEE');

-- CreateEnum
CREATE TYPE "OhFitToWorkTrigger" AS ENUM ('POST_MCU', 'POST_INCIDENT', 'POST_SICK_LEAVE', 'PRE_ASSIGNMENT_HIGH_RISK_TASK', 'RANDOM_CHECK', 'ROUTINE');

-- CreateEnum
CREATE TYPE "OhFitStatus" AS ENUM ('FIT', 'FIT_WITH_RESTRICTION', 'TEMPORARY_UNFIT', 'UNFIT');

-- CreateEnum
CREATE TYPE "OhFitToWorkAssessmentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "OhDiseaseCategory" AS ENUM ('RESPIRATORY', 'MUSCULOSKELETAL', 'HEARING_LOSS_NIHL', 'SKIN_DERMATITIS', 'CHEMICAL_POISONING', 'OTHER');

-- CreateEnum
CREATE TYPE "OhSeverityClassification" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'PERMANENT_DISABILITY', 'FATAL');

-- CreateEnum
CREATE TYPE "OhWorkRelatedness" AS ENUM ('CONFIRMED_WORK_RELATED', 'SUSPECTED', 'NOT_WORK_RELATED', 'UNDER_INVESTIGATION');

-- CreateEnum
CREATE TYPE "OhPakCaseStatus" AS ENUM ('OPEN', 'UNDER_TREATMENT', 'RECOVERED', 'PERMANENT_IMPAIRMENT', 'CLOSED', 'DECEASED');

-- CreateEnum
CREATE TYPE "OhVisitorType" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'VISITOR');

-- CreateEnum
CREATE TYPE "OhVisitType" AS ENUM ('ILLNESS', 'INJURY_MINOR', 'FOLLOW_UP', 'MEDICATION_REQUEST', 'CONSULTATION', 'ROUTINE_CHECK');

-- CreateEnum
CREATE TYPE "OhWorkStatusAfterVisit" AS ENUM ('RETURN_TO_WORK', 'SENT_HOME_REST', 'REFERRED_HOSPITAL', 'LOST_TIME');

-- CreateEnum
CREATE TYPE "OhClinicVisitStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "OhExposureType" AS ENUM ('NOISE', 'DUST_RESPIRABLE', 'CHEMICAL_HAZARD', 'RADIATION', 'VIBRATION', 'ERGONOMIC', 'BIOLOGICAL_HAZARD', 'EXTREME_TEMPERATURE', 'OTHER');

-- CreateEnum
CREATE TYPE "OhMonitoringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "OhSurveillanceProgramStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OhRestrictionType" AS ENUM ('NO_HEIGHT_WORK', 'NO_HEAVY_LIFTING', 'NO_CONFINED_SPACE', 'LIGHT_DUTY_ONLY', 'REDUCED_HOURS', 'NO_NIGHT_SHIFT', 'NO_CHEMICAL_EXPOSURE', 'OTHER');

-- CreateEnum
CREATE TYPE "OhRestrictedDutyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ESCALATED_NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "OhAuthorizedScopeType" AS ENUM ('TENANT', 'COMPANY', 'BRANCH', 'SITE');

-- CreateEnum
CREATE TYPE "OhAuthorizationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OhAccessEntityType" AS ENUM ('MEDICAL_RECORD', 'MCU_RESULT', 'FIT_TO_WORK_ASSESSMENT', 'PAK_CASE', 'CLINIC_VISIT');

-- CreateEnum
CREATE TYPE "OhAccessType" AS ENUM ('VIEW', 'EXPORT', 'PRINT', 'EDIT', 'DELETE_REQUEST');

-- CreateEnum
CREATE TYPE "OhAccessReason" AS ENUM ('ROUTINE_CONSULTATION', 'MCU_REVIEW', 'PAK_INVESTIGATION', 'EMPLOYEE_REQUEST', 'AUDIT_REVIEW', 'LEGAL_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "OhConsentPurpose" AS ENUM ('MCU_PROCESSING', 'CLINIC_TREATMENT', 'PAK_INVESTIGATION', 'BPJS_INSURANCE_SHARING', 'AGGREGATE_STATISTICS_REPORTING', 'THIRD_PARTY_LAB_SHARING');

-- CreateEnum
CREATE TYPE "OhConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OhConsentChannel" AS ENUM ('DIGITAL_FORM_APP', 'PAPER_SCANNED', 'VERBAL_WITNESSED');

-- CreateEnum
CREATE TYPE "OhSubjectRequestType" AS ENUM ('ACCESS_COPY', 'CORRECTION', 'ERASURE_ANONYMIZATION', 'PROCESSING_RESTRICTION');

-- CreateEnum
CREATE TYPE "OhSubjectRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OhMedicalRecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'ANONYMIZED');


-- CreateTable
CREATE TABLE "medical_records" (
    "medical_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID,
    "blood_type_encrypted" TEXT,
    "known_allergies_encrypted" TEXT,
    "chronic_conditions_encrypted" TEXT,
    "current_medications_encrypted" TEXT,
    "disability_status_encrypted" TEXT,
    "immunization_history_encrypted" TEXT,
    "baseline_health_notes_encrypted" TEXT,
    "emergency_medical_contact_name" VARCHAR(150),
    "emergency_medical_contact_phone" VARCHAR(50),
    "emergency_medical_contact_relationship" VARCHAR(50),
    "consent_id" UUID,
    "last_updated_by_practitioner" UUID,
    "record_status" "OhMedicalRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("medical_record_id")
);

-- CreateTable
CREATE TABLE "mcu_schedules" (
    "mcu_schedule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "employee_user_id" UUID NOT NULL,
    "mcu_type" "OhMcuType" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "mcu_package_code" VARCHAR(50),
    "mcu_package_name" VARCHAR(150),
    "reason_for_special_encrypted" TEXT,
    "provider_clinic_name" VARCHAR(200),
    "linked_health_surveillance_program_id" UUID,
    "status" "OhMcuScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reminder_sent_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "mcu_schedules_pkey" PRIMARY KEY ("mcu_schedule_id")
);

-- CreateTable
CREATE TABLE "mcu_results" (
    "mcu_result_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "mcu_schedule_id" UUID NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "examination_date" DATE NOT NULL,
    "examining_physician_name" VARCHAR(150) NOT NULL,
    "examining_physician_license_no" VARCHAR(100),
    "height_cm_encrypted" TEXT,
    "weight_kg_encrypted" TEXT,
    "bmi_encrypted" TEXT,
    "blood_pressure_systolic_encrypted" TEXT,
    "blood_pressure_diastolic_encrypted" TEXT,
    "pulse_rate_encrypted" TEXT,
    "lab_results_encrypted" TEXT,
    "radiology_results_encrypted" TEXT,
    "audiometry_results_encrypted" TEXT,
    "spirometry_results_encrypted" TEXT,
    "physician_conclusion_encrypted" TEXT,
    "diagnosis_codes_encrypted" TEXT,
    "overall_mcu_result" "OhMcuResultOverall" NOT NULL,
    "fit_to_work_assessment_id" UUID,
    "report_file_attachment_note" TEXT,
    "status" "OhMcuResultStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "mcu_results_pkey" PRIMARY KEY ("mcu_result_id")
);

-- CreateTable
CREATE TABLE "fit_to_work_assessments" (
    "fit_to_work_assessment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "employee_user_id" UUID NOT NULL,
    "assessment_date" DATE NOT NULL,
    "assessment_trigger" "OhFitToWorkTrigger" NOT NULL,
    "related_mcu_result_id" UUID,
    "assessed_by" UUID NOT NULL,
    "fit_status" "OhFitStatus" NOT NULL,
    "restriction_details_encrypted" TEXT,
    "restriction_summary_for_supervisor" VARCHAR(255),
    "restriction_valid_from" DATE,
    "restriction_valid_until" DATE,
    "linked_restricted_duty_assignment_id" UUID,
    "next_reassessment_date" DATE,
    "status" "OhFitToWorkAssessmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "fit_to_work_assessments_pkey" PRIMARY KEY ("fit_to_work_assessment_id")
);

-- CreateTable
CREATE TABLE "occupational_disease_cases" (
    "pak_case_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "case_number" VARCHAR(50) NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "diagnosis_date" DATE NOT NULL,
    "diagnosed_by" VARCHAR(150) NOT NULL,
    "disease_category" "OhDiseaseCategory" NOT NULL,
    "diagnosis_detail_encrypted" TEXT,
    "suspected_causal_agent_exposure_encrypted" TEXT,
    "related_hira_id" UUID,
    "related_environmental_monitoring_record_id" UUID,
    "severity_classification" "OhSeverityClassification" NOT NULL,
    "work_relatedness_determination" "OhWorkRelatedness" NOT NULL DEFAULT 'UNDER_INVESTIGATION',
    "reported_to_disnaker" BOOLEAN NOT NULL DEFAULT false,
    "disnaker_report_date" DATE,
    "disnaker_report_number" VARCHAR(100),
    "bpjs_ketenagakerjaan_claim_number" VARCHAR(100),
    "capa_register_id" UUID,
    "workflow_instance_id" UUID,
    "case_status" "OhPakCaseStatus" NOT NULL DEFAULT 'OPEN',
    "closed_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "occupational_disease_cases_pkey" PRIMARY KEY ("pak_case_id")
);

-- CreateTable
CREATE TABLE "clinic_visit_logs" (
    "clinic_visit_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "visit_number" VARCHAR(50),
    "employee_user_id" UUID,
    "visitor_name" VARCHAR(150),
    "visitor_type" "OhVisitorType",
    "visit_datetime" TIMESTAMPTZ NOT NULL,
    "visit_type" "OhVisitType" NOT NULL,
    "chief_complaint_encrypted" TEXT,
    "vital_signs_encrypted" TEXT,
    "treatment_given_encrypted" TEXT,
    "medication_dispensed_encrypted" TEXT,
    "referral_required" BOOLEAN NOT NULL DEFAULT false,
    "referral_facility_name" VARCHAR(200),
    "referral_reason_encrypted" TEXT,
    "work_status_after_visit" "OhWorkStatusAfterVisit" NOT NULL,
    "linked_incident_id" UUID,
    "attended_by" UUID NOT NULL,
    "status" "OhClinicVisitStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "clinic_visit_logs_pkey" PRIMARY KEY ("clinic_visit_id")
);

-- CreateTable
CREATE TABLE "health_surveillance_programs" (
    "health_surveillance_program_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "program_name" VARCHAR(200) NOT NULL,
    "exposure_type" "OhExposureType" NOT NULL,
    "related_hira_id" UUID,
    "target_population_criteria" TEXT NOT NULL,
    "monitoring_frequency" "OhMonitoringFrequency" NOT NULL,
    "mcu_package_required" VARCHAR(50),
    "program_owner" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "review_date" DATE,
    "status" "OhSurveillanceProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "health_surveillance_programs_pkey" PRIMARY KEY ("health_surveillance_program_id")
);

-- CreateTable
CREATE TABLE "health_surveillance_enrollments" (
    "enrollment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "health_surveillance_program_id" UUID NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "enrollment_date" DATE NOT NULL,
    "exit_date" DATE,
    "exit_reason" VARCHAR(200),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "health_surveillance_enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "restricted_duty_assignments" (
    "restricted_duty_assignment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "fit_to_work_assessment_id" UUID NOT NULL,
    "restriction_type" "OhRestrictionType" NOT NULL,
    "alternative_task_description" TEXT NOT NULL,
    "assigned_by" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "compliance_confirmed_by_supervisor" BOOLEAN NOT NULL DEFAULT false,
    "status" "OhRestrictedDutyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "restricted_duty_assignments_pkey" PRIMARY KEY ("restricted_duty_assignment_id")
);

-- CreateTable
CREATE TABLE "occupational_health_authorized_users" (
    "authorization_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "authorized_scope_type" "OhAuthorizedScopeType" NOT NULL,
    "authorized_scope_id" UUID NOT NULL,
    "medical_practitioner_license_no" VARCHAR(100),
    "authorization_reason" TEXT NOT NULL,
    "authorized_by" UUID NOT NULL,
    "authorized_at" TIMESTAMPTZ NOT NULL,
    "expiry_date" DATE,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "status" "OhAuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "occupational_health_authorized_users_pkey" PRIMARY KEY ("authorization_id")
);

-- CreateTable
CREATE TABLE "medical_record_access_logs" (
    "access_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "accessed_by_user_id" UUID NOT NULL,
    "subject_employee_user_id" UUID NOT NULL,
    "accessed_entity_type" "OhAccessEntityType" NOT NULL,
    "accessed_entity_id" UUID NOT NULL,
    "access_type" "OhAccessType" NOT NULL,
    "reason_for_access" "OhAccessReason" NOT NULL,
    "reason_notes" TEXT,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" VARCHAR(255),
    "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_record_access_logs_pkey" PRIMARY KEY ("access_log_id")
);

-- CreateTable
CREATE TABLE "health_data_consents" (
    "consent_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "consent_purpose" "OhConsentPurpose" NOT NULL,
    "consent_status" "OhConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "consent_given_at" TIMESTAMPTZ NOT NULL,
    "consent_channel" "OhConsentChannel" NOT NULL,
    "withdrawal_date" TIMESTAMPTZ,
    "withdrawal_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "health_data_consents_pkey" PRIMARY KEY ("consent_id")
);

-- CreateTable
CREATE TABLE "health_data_subject_requests" (
    "subject_request_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_user_id" UUID NOT NULL,
    "request_type" "OhSubjectRequestType" NOT NULL,
    "request_date" TIMESTAMPTZ NOT NULL,
    "request_detail" TEXT NOT NULL,
    "handled_by" UUID NOT NULL,
    "resolution_notes" TEXT,
    "resolution_date" TIMESTAMPTZ,
    "status" "OhSubjectRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejection_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "health_data_subject_requests_pkey" PRIMARY KEY ("subject_request_id")
);

-- CreateTable
CREATE TABLE "tenant_encryption_keys" (
    "tenant_encryption_key_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "wrapped_data_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenant_encryption_keys_pkey" PRIMARY KEY ("tenant_encryption_key_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_employee_user_id_key" ON "medical_records"("employee_user_id");

-- CreateIndex
CREATE INDEX "medical_records_tenant_id_company_id_idx" ON "medical_records"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "mcu_schedules_tenant_id_employee_user_id_idx" ON "mcu_schedules"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "mcu_schedules_tenant_id_site_id_status_idx" ON "mcu_schedules"("tenant_id", "site_id", "status");

-- CreateIndex
CREATE INDEX "mcu_results_tenant_id_employee_user_id_idx" ON "mcu_results"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "mcu_results_tenant_id_mcu_schedule_id_idx" ON "mcu_results"("tenant_id", "mcu_schedule_id");

-- CreateIndex
CREATE INDEX "fit_to_work_assessments_tenant_id_employee_user_id_idx" ON "fit_to_work_assessments"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "occupational_disease_cases_case_number_key" ON "occupational_disease_cases"("case_number");

-- CreateIndex
CREATE UNIQUE INDEX "occupational_disease_cases_workflow_instance_id_key" ON "occupational_disease_cases"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "occupational_disease_cases_tenant_id_employee_user_id_idx" ON "occupational_disease_cases"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "occupational_disease_cases_tenant_id_site_id_case_status_idx" ON "occupational_disease_cases"("tenant_id", "site_id", "case_status");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_visit_logs_visit_number_key" ON "clinic_visit_logs"("visit_number");

-- CreateIndex
CREATE INDEX "clinic_visit_logs_tenant_id_site_id_visit_datetime_idx" ON "clinic_visit_logs"("tenant_id", "site_id", "visit_datetime");

-- CreateIndex
CREATE INDEX "clinic_visit_logs_tenant_id_employee_user_id_idx" ON "clinic_visit_logs"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "health_surveillance_programs_tenant_id_site_id_idx" ON "health_surveillance_programs"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "health_surveillance_enrollments_tenant_id_health_surveillan_idx" ON "health_surveillance_enrollments"("tenant_id", "health_surveillance_program_id");

-- CreateIndex
CREATE INDEX "health_surveillance_enrollments_tenant_id_employee_user_id_idx" ON "health_surveillance_enrollments"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "restricted_duty_assignments_tenant_id_employee_user_id_idx" ON "restricted_duty_assignments"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "occupational_health_authorized_users_tenant_id_user_id_stat_idx" ON "occupational_health_authorized_users"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "occupational_health_authorized_users_tenant_id_authorized_s_idx" ON "occupational_health_authorized_users"("tenant_id", "authorized_scope_type", "authorized_scope_id");

-- CreateIndex
CREATE INDEX "medical_record_access_logs_tenant_id_subject_employee_user__idx" ON "medical_record_access_logs"("tenant_id", "subject_employee_user_id", "accessed_at");

-- CreateIndex
CREATE INDEX "medical_record_access_logs_tenant_id_accessed_by_user_id_ac_idx" ON "medical_record_access_logs"("tenant_id", "accessed_by_user_id", "accessed_at");

-- CreateIndex
CREATE INDEX "medical_record_access_logs_tenant_id_accessed_entity_type_a_idx" ON "medical_record_access_logs"("tenant_id", "accessed_entity_type", "accessed_entity_id");

-- CreateIndex
CREATE INDEX "health_data_consents_tenant_id_employee_user_id_idx" ON "health_data_consents"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "health_data_subject_requests_tenant_id_employee_user_id_idx" ON "health_data_subject_requests"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE INDEX "health_data_subject_requests_tenant_id_status_idx" ON "health_data_subject_requests"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_encryption_keys_tenant_id_key" ON "tenant_encryption_keys"("tenant_id");

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "health_data_consents"("consent_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_last_updated_by_practitioner_fkey" FOREIGN KEY ("last_updated_by_practitioner") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_linked_health_surveillance_program_id_fkey" FOREIGN KEY ("linked_health_surveillance_program_id") REFERENCES "health_surveillance_programs"("health_surveillance_program_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_schedules" ADD CONSTRAINT "mcu_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_results" ADD CONSTRAINT "mcu_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_results" ADD CONSTRAINT "mcu_results_mcu_schedule_id_fkey" FOREIGN KEY ("mcu_schedule_id") REFERENCES "mcu_schedules"("mcu_schedule_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_results" ADD CONSTRAINT "mcu_results_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_results" ADD CONSTRAINT "mcu_results_fit_to_work_assessment_id_fkey" FOREIGN KEY ("fit_to_work_assessment_id") REFERENCES "fit_to_work_assessments"("fit_to_work_assessment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_results" ADD CONSTRAINT "mcu_results_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcu_results" ADD CONSTRAINT "mcu_results_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_related_mcu_result_id_fkey" FOREIGN KEY ("related_mcu_result_id") REFERENCES "mcu_results"("mcu_result_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_assessed_by_fkey" FOREIGN KEY ("assessed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_linked_restricted_duty_assignment__fkey" FOREIGN KEY ("linked_restricted_duty_assignment_id") REFERENCES "restricted_duty_assignments"("restricted_duty_assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_to_work_assessments" ADD CONSTRAINT "fit_to_work_assessments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_related_hira_id_fkey" FOREIGN KEY ("related_hira_id") REFERENCES "hira_assessments"("hira_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_related_environmental_monitorin_fkey" FOREIGN KEY ("related_environmental_monitoring_record_id") REFERENCES "environmental_monitoring_records"("monitoring_record_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_capa_register_id_fkey" FOREIGN KEY ("capa_register_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_disease_cases" ADD CONSTRAINT "occupational_disease_cases_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_linked_incident_id_fkey" FOREIGN KEY ("linked_incident_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_attended_by_fkey" FOREIGN KEY ("attended_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visit_logs" ADD CONSTRAINT "clinic_visit_logs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_related_hira_id_fkey" FOREIGN KEY ("related_hira_id") REFERENCES "hira_assessments"("hira_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_program_owner_fkey" FOREIGN KEY ("program_owner") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_programs" ADD CONSTRAINT "health_surveillance_programs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_enrollments" ADD CONSTRAINT "health_surveillance_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_enrollments" ADD CONSTRAINT "health_surveillance_enrollments_health_surveillance_progra_fkey" FOREIGN KEY ("health_surveillance_program_id") REFERENCES "health_surveillance_programs"("health_surveillance_program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_enrollments" ADD CONSTRAINT "health_surveillance_enrollments_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_enrollments" ADD CONSTRAINT "health_surveillance_enrollments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_surveillance_enrollments" ADD CONSTRAINT "health_surveillance_enrollments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_fit_to_work_assessment_id_fkey" FOREIGN KEY ("fit_to_work_assessment_id") REFERENCES "fit_to_work_assessments"("fit_to_work_assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_duty_assignments" ADD CONSTRAINT "restricted_duty_assignments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_health_authorized_users" ADD CONSTRAINT "occupational_health_authorized_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_health_authorized_users" ADD CONSTRAINT "occupational_health_authorized_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_health_authorized_users" ADD CONSTRAINT "occupational_health_authorized_users_authorized_by_fkey" FOREIGN KEY ("authorized_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_health_authorized_users" ADD CONSTRAINT "occupational_health_authorized_users_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_health_authorized_users" ADD CONSTRAINT "occupational_health_authorized_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_health_authorized_users" ADD CONSTRAINT "occupational_health_authorized_users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_access_logs" ADD CONSTRAINT "medical_record_access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_access_logs" ADD CONSTRAINT "medical_record_access_logs_accessed_by_user_id_fkey" FOREIGN KEY ("accessed_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_access_logs" ADD CONSTRAINT "medical_record_access_logs_subject_employee_user_id_fkey" FOREIGN KEY ("subject_employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_consents" ADD CONSTRAINT "health_data_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_consents" ADD CONSTRAINT "health_data_consents_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_consents" ADD CONSTRAINT "health_data_consents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_consents" ADD CONSTRAINT "health_data_consents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_subject_requests" ADD CONSTRAINT "health_data_subject_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_subject_requests" ADD CONSTRAINT "health_data_subject_requests_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_subject_requests" ADD CONSTRAINT "health_data_subject_requests_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_subject_requests" ADD CONSTRAINT "health_data_subject_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_subject_requests" ADD CONSTRAINT "health_data_subject_requests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_encryption_keys" ADD CONSTRAINT "tenant_encryption_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

