-- CreateEnum
CREATE TYPE "CalibrationItemStatus" AS ENUM ('ACTIVE', 'IN_CALIBRATION', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "CalibrationProviderType" AS ENUM ('INTERNAL_LAB', 'EXTERNAL_LAB');

-- CreateEnum
CREATE TYPE "CalibrationScheduleStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "CalibrationResult" AS ENUM ('PASS', 'CONDITIONAL_PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "CalibrationCertificateStatus" AS ENUM ('DRAFT', 'ISSUED', 'REVIEWED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "OotImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OotStatus" AS ENUM ('IDENTIFIED', 'ASSESSED', 'CAPA_INITIATED', 'CLOSED');

-- CreateTable
CREATE TABLE "calibration_items" (
    "calibration_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "equipment_tag_no" VARCHAR(50),
    "measurement_parameter" VARCHAR(100) NOT NULL,
    "measurement_range_min" DECIMAL,
    "measurement_range_max" DECIMAL,
    "measurement_range_unit" VARCHAR(20),
    "accuracy_class" VARCHAR(50),
    "resolution" VARCHAR(30),
    "calibration_interval_months" INTEGER NOT NULL,
    "calibration_method_standard" VARCHAR(150),
    "is_critical_measurement" BOOLEAN NOT NULL DEFAULT false,
    "calibration_status" "CalibrationItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "calibration_items_pkey" PRIMARY KEY ("calibration_item_id")
);

-- CreateTable
CREATE TABLE "calibration_providers" (
    "calibration_provider_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider_name" VARCHAR(150) NOT NULL,
    "provider_type" "CalibrationProviderType" NOT NULL,
    "accreditation_body" VARCHAR(100),
    "accreditation_number" VARCHAR(100),
    "accreditation_scope" JSONB,
    "accreditation_valid_until" DATE,
    "address" TEXT,
    "contact_person_name" VARCHAR(150),
    "contact_person_phone" VARCHAR(30),
    "contact_person_email" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "calibration_providers_pkey" PRIMARY KEY ("calibration_provider_id")
);

-- CreateTable
CREATE TABLE "calibration_schedules" (
    "calibration_schedule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "calibration_item_id" UUID NOT NULL,
    "calibration_wo_no" VARCHAR(50) NOT NULL,
    "scheduled_date" DATE,
    "due_date" DATE NOT NULL,
    "reminder_sent_at_day30" TIMESTAMPTZ,
    "reminder_sent_at_day14" TIMESTAMPTZ,
    "reminder_sent_at_day7" TIMESTAMPTZ,
    "reminder_sent_at_day1" TIMESTAMPTZ,
    "overdue_notified_at" TIMESTAMPTZ,
    "assigned_provider_id" UUID,
    "status" "CalibrationScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "calibration_schedules_pkey" PRIMARY KEY ("calibration_schedule_id")
);

-- CreateTable
CREATE TABLE "calibration_certificates" (
    "calibration_certificate_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "calibration_schedule_id" UUID,
    "calibration_item_id" UUID NOT NULL,
    "internal_reference_no" VARCHAR(50) NOT NULL,
    "certificate_no" VARCHAR(100) NOT NULL,
    "calibration_provider_id" UUID NOT NULL,
    "calibration_date" DATE NOT NULL,
    "next_due_date" DATE NOT NULL,
    "calibration_result" "CalibrationResult" NOT NULL,
    "as_found_condition" TEXT,
    "as_left_condition" TEXT,
    "measurement_uncertainty" VARCHAR(50),
    "reference_standard_used" VARCHAR(150),
    "environmental_conditions" JSONB,
    "is_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "status" "CalibrationCertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "calibration_certificates_pkey" PRIMARY KEY ("calibration_certificate_id")
);

-- CreateTable
CREATE TABLE "out_of_tolerance_records" (
    "oot_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "calibration_certificate_id" UUID NOT NULL,
    "calibration_item_id" UUID NOT NULL,
    "deviation_description" TEXT NOT NULL,
    "deviation_magnitude" VARCHAR(100),
    "potential_impact_assessment" TEXT,
    "affected_period_from" DATE,
    "affected_period_to" DATE,
    "impact_level" "OotImpactLevel",
    "requires_capa" BOOLEAN NOT NULL DEFAULT false,
    "linked_capa_id" UUID,
    "requires_incident_report" BOOLEAN NOT NULL DEFAULT false,
    "linked_incident_id" UUID,
    "status" "OotStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "closed_by" UUID,
    "closed_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "out_of_tolerance_records_pkey" PRIMARY KEY ("oot_record_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calibration_items_asset_id_key" ON "calibration_items"("asset_id");

-- CreateIndex
CREATE INDEX "calibration_items_tenant_id_site_id_idx" ON "calibration_items"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "calibration_items_tenant_id_calibration_status_idx" ON "calibration_items"("tenant_id", "calibration_status");

-- CreateIndex
CREATE INDEX "calibration_providers_tenant_id_idx" ON "calibration_providers"("tenant_id");

-- CreateIndex
CREATE INDEX "calibration_schedules_tenant_id_status_due_date_idx" ON "calibration_schedules"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_schedules_tenant_id_calibration_wo_no_key" ON "calibration_schedules"("tenant_id", "calibration_wo_no");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_certificates_workflow_instance_id_key" ON "calibration_certificates"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "calibration_certificates_tenant_id_calibration_item_id_idx" ON "calibration_certificates"("tenant_id", "calibration_item_id");

-- CreateIndex
CREATE INDEX "calibration_certificates_tenant_id_status_idx" ON "calibration_certificates"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_certificates_tenant_id_internal_reference_no_key" ON "calibration_certificates"("tenant_id", "internal_reference_no");

-- CreateIndex
CREATE INDEX "out_of_tolerance_records_tenant_id_calibration_item_id_idx" ON "out_of_tolerance_records"("tenant_id", "calibration_item_id");

-- CreateIndex
CREATE INDEX "out_of_tolerance_records_tenant_id_status_idx" ON "out_of_tolerance_records"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_providers" ADD CONSTRAINT "calibration_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_providers" ADD CONSTRAINT "calibration_providers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_providers" ADD CONSTRAINT "calibration_providers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_schedules" ADD CONSTRAINT "calibration_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_schedules" ADD CONSTRAINT "calibration_schedules_calibration_item_id_fkey" FOREIGN KEY ("calibration_item_id") REFERENCES "calibration_items"("calibration_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_schedules" ADD CONSTRAINT "calibration_schedules_assigned_provider_id_fkey" FOREIGN KEY ("assigned_provider_id") REFERENCES "calibration_providers"("calibration_provider_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_schedules" ADD CONSTRAINT "calibration_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_schedules" ADD CONSTRAINT "calibration_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_calibration_schedule_id_fkey" FOREIGN KEY ("calibration_schedule_id") REFERENCES "calibration_schedules"("calibration_schedule_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_calibration_item_id_fkey" FOREIGN KEY ("calibration_item_id") REFERENCES "calibration_items"("calibration_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_calibration_provider_id_fkey" FOREIGN KEY ("calibration_provider_id") REFERENCES "calibration_providers"("calibration_provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_calibration_certificate_id_fkey" FOREIGN KEY ("calibration_certificate_id") REFERENCES "calibration_certificates"("calibration_certificate_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_calibration_item_id_fkey" FOREIGN KEY ("calibration_item_id") REFERENCES "calibration_items"("calibration_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_linked_capa_id_fkey" FOREIGN KEY ("linked_capa_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_linked_incident_id_fkey" FOREIGN KEY ("linked_incident_id") REFERENCES "incident_reports"("incident_report_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_tolerance_records" ADD CONSTRAINT "out_of_tolerance_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
