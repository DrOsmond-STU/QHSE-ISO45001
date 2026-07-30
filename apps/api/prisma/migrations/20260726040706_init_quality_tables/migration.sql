-- CreateEnum
CREATE TYPE "QualityNcrSource" AS ENUM ('INTERNAL', 'CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "QualityNcrDetectionStage" AS ENUM ('INCOMING', 'IN_PROCESS', 'FINAL', 'POST_DELIVERY', 'AUDIT_FINDING');

-- CreateEnum
CREATE TYPE "QualityNcrSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QualityNcrDisposition" AS ENUM ('USE_AS_IS', 'REWORK', 'REPAIR', 'SCRAP', 'RETURN_TO_SUPPLIER', 'REGRADE', 'PENDING');

-- CreateEnum
CREATE TYPE "QualityNcrReInspectionResult" AS ENUM ('PASS', 'FAIL', 'NOT_YET');

-- CreateEnum
CREATE TYPE "QualityNcrStatus" AS ENUM ('OPEN', 'CONTAINMENT', 'DISPOSITION_PENDING', 'DISPOSITIONED', 'CAPA_LINKED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityComplaintChannel" AS ENUM ('EMAIL', 'PHONE', 'PORTAL', 'LETTER', 'SALES_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityComplaintCategory" AS ENUM ('PRODUCT_QUALITY', 'DELIVERY', 'DOCUMENTATION', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityComplaintSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QualityComplaintStatus" AS ENUM ('RECEIVED', 'UNDER_INVESTIGATION', 'CAPA_IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED_INVALID');

-- CreateEnum
CREATE TYPE "QualityInspectionType" AS ENUM ('INCOMING', 'IN_PROCESS', 'FINAL', 'PRE_SHIPMENT');

-- CreateEnum
CREATE TYPE "QualityInspectionResultStatus" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING');

-- CreateEnum
CREATE TYPE "QualityInspectionDisposition" AS ENUM ('ACCEPT', 'REJECT', 'REWORK', 'USE_AS_IS_DEVIATION');

-- CreateEnum
CREATE TYPE "QualityInspectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QualityInspectionParameterResult" AS ENUM ('PASS', 'FAIL', 'NOT_MEASURED');

-- CreateEnum
CREATE TYPE "QualitySupplierCategory" AS ENUM ('RAW_MATERIAL', 'PACKAGING', 'SERVICE', 'SUBCONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "QualitySupplierEvaluationType" AS ENUM ('INITIAL_QUALIFICATION', 'PERIODIC_EVALUATION', 'RE_EVALUATION_POST_NCR');

-- CreateEnum
CREATE TYPE "QualitySupplierRating" AS ENUM ('APPROVED', 'CONDITIONAL', 'SUSPENDED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "QualitySupplierRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QualityObjectiveMeasurementFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "QualityObjectiveStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED', 'NOT_ACHIEVED', 'DISCONTINUED');

-- CreateTable
CREATE TABLE "ncr_records" (
    "ncr_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "ncr_number" VARCHAR(50) NOT NULL,
    "ncr_source" "QualityNcrSource" NOT NULL,
    "product_code" VARCHAR(50),
    "product_name" VARCHAR(200),
    "batch_lot_number" VARCHAR(100),
    "process_area" VARCHAR(150),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "detected_date" DATE NOT NULL,
    "detected_by" UUID NOT NULL,
    "detection_stage" "QualityNcrDetectionStage" NOT NULL,
    "severity" "QualityNcrSeverity" NOT NULL DEFAULT 'MINOR',
    "defect_category" VARCHAR(100),
    "quantity_nonconforming" DECIMAL NOT NULL,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "immediate_containment_action" TEXT,
    "disposition" "QualityNcrDisposition" NOT NULL DEFAULT 'PENDING',
    "disposition_justification" TEXT,
    "disposition_approved_by" UUID,
    "disposition_approved_at" TIMESTAMPTZ,
    "customer_complaint_id" UUID,
    "supplier_code" VARCHAR(50),
    "supplier_name" VARCHAR(200),
    "re_inspection_required" BOOLEAN NOT NULL DEFAULT false,
    "re_inspection_result" "QualityNcrReInspectionResult",
    "capa_id" UUID,
    "workflow_instance_id" UUID,
    "status" "QualityNcrStatus" NOT NULL DEFAULT 'OPEN',
    "closed_date" DATE,
    "closed_by" UUID,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "ncr_records_pkey" PRIMARY KEY ("ncr_id")
);

-- CreateTable
CREATE TABLE "customer_complaints" (
    "complaint_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "site_id" UUID,
    "complaint_number" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_code" VARCHAR(50),
    "customer_contact_person" VARCHAR(150),
    "customer_contact_email" VARCHAR(150),
    "customer_contact_phone" VARCHAR(50),
    "product_code" VARCHAR(50),
    "product_name" VARCHAR(200),
    "batch_lot_number" VARCHAR(100),
    "quantity_affected" DECIMAL,
    "complaint_channel" "QualityComplaintChannel" NOT NULL,
    "complaint_date" DATE NOT NULL,
    "received_by" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "complaint_category" "QualityComplaintCategory" NOT NULL,
    "severity" "QualityComplaintSeverity" NOT NULL DEFAULT 'LOW',
    "initial_response_due_date" TIMESTAMPTZ NOT NULL,
    "initial_response_sent_at" TIMESTAMPTZ,
    "investigation_summary" TEXT,
    "ncr_id" UUID,
    "capa_id" UUID,
    "root_cause_summary" TEXT,
    "corrective_action_summary" TEXT,
    "customer_satisfaction_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "customer_feedback_date" DATE,
    "workflow_instance_id" UUID,
    "status" "QualityComplaintStatus" NOT NULL DEFAULT 'RECEIVED',
    "closed_date" DATE,
    "closed_by" UUID,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "customer_complaints_pkey" PRIMARY KEY ("complaint_id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "quality_inspection_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "inspection_number" VARCHAR(50) NOT NULL,
    "inspection_type" "QualityInspectionType" NOT NULL,
    "product_code" VARCHAR(50),
    "product_name" VARCHAR(200),
    "batch_lot_number" VARCHAR(100),
    "supplier_code" VARCHAR(50),
    "work_order_number" VARCHAR(50),
    "quantity_inspected" DECIMAL NOT NULL,
    "quantity_sampled" DECIMAL,
    "sampling_method" VARCHAR(100),
    "inspector_id" UUID NOT NULL,
    "inspection_date" DATE NOT NULL,
    "measuring_equipment_asset_id" UUID,
    "result_status" "QualityInspectionResultStatus" NOT NULL DEFAULT 'PENDING',
    "overall_disposition" "QualityInspectionDisposition",
    "deviation_workflow_instance_id" UUID,
    "auto_generated_ncr_id" UUID,
    "status" "QualityInspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("quality_inspection_id")
);

-- CreateTable
CREATE TABLE "quality_inspection_parameters" (
    "inspection_parameter_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quality_inspection_id" UUID NOT NULL,
    "parameter_name" VARCHAR(150) NOT NULL,
    "specification_min" DECIMAL,
    "specification_max" DECIMAL,
    "unit_of_measure" VARCHAR(20),
    "measured_value" DECIMAL,
    "result" "QualityInspectionParameterResult" NOT NULL DEFAULT 'NOT_MEASURED',
    "sequence_no" INTEGER NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "quality_inspection_parameters_pkey" PRIMARY KEY ("inspection_parameter_id")
);

-- CreateTable
CREATE TABLE "supplier_quality_records" (
    "supplier_quality_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supplier_code" VARCHAR(50) NOT NULL,
    "supplier_name" VARCHAR(200) NOT NULL,
    "supplier_category" "QualitySupplierCategory" NOT NULL,
    "evaluation_type" "QualitySupplierEvaluationType" NOT NULL,
    "evaluation_period_start" DATE NOT NULL,
    "evaluation_period_end" DATE NOT NULL,
    "quality_score" DECIMAL(5,2),
    "delivery_score" DECIMAL(5,2),
    "responsiveness_score" DECIMAL(5,2),
    "overall_score" DECIMAL(5,2) NOT NULL,
    "scoring_detail" JSONB,
    "ncr_count_period" INTEGER NOT NULL DEFAULT 0,
    "rating" "QualitySupplierRating" NOT NULL,
    "corrective_action_required" BOOLEAN NOT NULL DEFAULT false,
    "capa_id" UUID,
    "evaluated_by" UUID NOT NULL,
    "evaluation_date" DATE NOT NULL,
    "next_evaluation_due_date" DATE,
    "workflow_instance_id" UUID,
    "status" "QualitySupplierRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "supplier_quality_records_pkey" PRIMARY KEY ("supplier_quality_record_id")
);

-- CreateTable
CREATE TABLE "quality_objectives" (
    "quality_objective_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "site_id" UUID,
    "department_id" UUID,
    "objective_code" VARCHAR(50) NOT NULL,
    "objective_title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "iso_clause_ref" VARCHAR(20) NOT NULL DEFAULT '6.2',
    "related_policy_document_id" UUID,
    "kpi_metric_name" VARCHAR(150) NOT NULL,
    "target_value" DECIMAL NOT NULL,
    "target_unit" VARCHAR(20),
    "baseline_value" DECIMAL,
    "current_value" DECIMAL,
    "at_risk_threshold_percentage" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "measurement_frequency" "QualityObjectiveMeasurementFrequency" NOT NULL,
    "owner_user_id" UUID,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "QualityObjectiveStatus" NOT NULL DEFAULT 'ON_TRACK',
    "last_reviewed_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "quality_objectives_pkey" PRIMARY KEY ("quality_objective_id")
);

-- CreateTable
CREATE TABLE "quality_objective_progress_logs" (
    "progress_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quality_objective_id" UUID NOT NULL,
    "period_label" VARCHAR(20) NOT NULL,
    "actual_value" DECIMAL NOT NULL,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "quality_objective_progress_logs_pkey" PRIMARY KEY ("progress_log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ncr_records_workflow_instance_id_key" ON "ncr_records"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "ncr_records_tenant_id_status_idx" ON "ncr_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ncr_records_tenant_id_site_id_idx" ON "ncr_records"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "ncr_records_capa_id_idx" ON "ncr_records"("capa_id");

-- CreateIndex
CREATE UNIQUE INDEX "ncr_records_tenant_id_ncr_number_key" ON "ncr_records"("tenant_id", "ncr_number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_complaints_workflow_instance_id_key" ON "customer_complaints"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "customer_complaints_tenant_id_status_idx" ON "customer_complaints"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "customer_complaints_ncr_id_idx" ON "customer_complaints"("ncr_id");

-- CreateIndex
CREATE INDEX "customer_complaints_capa_id_idx" ON "customer_complaints"("capa_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_complaints_tenant_id_complaint_number_key" ON "customer_complaints"("tenant_id", "complaint_number");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_deviation_workflow_instance_id_key" ON "quality_inspections"("deviation_workflow_instance_id");

-- CreateIndex
CREATE INDEX "quality_inspections_tenant_id_status_idx" ON "quality_inspections"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "quality_inspections_tenant_id_site_id_idx" ON "quality_inspections"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "quality_inspections_auto_generated_ncr_id_idx" ON "quality_inspections"("auto_generated_ncr_id");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_tenant_id_inspection_number_key" ON "quality_inspections"("tenant_id", "inspection_number");

-- CreateIndex
CREATE INDEX "quality_inspection_parameters_tenant_id_quality_inspection__idx" ON "quality_inspection_parameters"("tenant_id", "quality_inspection_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_quality_records_workflow_instance_id_key" ON "supplier_quality_records"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "supplier_quality_records_tenant_id_supplier_code_idx" ON "supplier_quality_records"("tenant_id", "supplier_code");

-- CreateIndex
CREATE INDEX "supplier_quality_records_tenant_id_status_idx" ON "supplier_quality_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "quality_objectives_tenant_id_status_idx" ON "quality_objectives"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quality_objectives_tenant_id_objective_code_key" ON "quality_objectives"("tenant_id", "objective_code");

-- CreateIndex
CREATE INDEX "quality_objective_progress_logs_tenant_id_quality_objective_idx" ON "quality_objective_progress_logs"("tenant_id", "quality_objective_id");

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_detected_by_fkey" FOREIGN KEY ("detected_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_disposition_approved_by_fkey" FOREIGN KEY ("disposition_approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_customer_complaint_id_fkey" FOREIGN KEY ("customer_complaint_id") REFERENCES "customer_complaints"("complaint_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_ncr_id_fkey" FOREIGN KEY ("ncr_id") REFERENCES "ncr_records"("ncr_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_complaints" ADD CONSTRAINT "customer_complaints_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_deviation_workflow_instance_id_fkey" FOREIGN KEY ("deviation_workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_auto_generated_ncr_id_fkey" FOREIGN KEY ("auto_generated_ncr_id") REFERENCES "ncr_records"("ncr_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspection_parameters" ADD CONSTRAINT "quality_inspection_parameters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspection_parameters" ADD CONSTRAINT "quality_inspection_parameters_quality_inspection_id_fkey" FOREIGN KEY ("quality_inspection_id") REFERENCES "quality_inspections"("quality_inspection_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspection_parameters" ADD CONSTRAINT "quality_inspection_parameters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspection_parameters" ADD CONSTRAINT "quality_inspection_parameters_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capa_register"("capa_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quality_records" ADD CONSTRAINT "supplier_quality_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_related_policy_document_id_fkey" FOREIGN KEY ("related_policy_document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objectives" ADD CONSTRAINT "quality_objectives_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objective_progress_logs" ADD CONSTRAINT "quality_objective_progress_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objective_progress_logs" ADD CONSTRAINT "quality_objective_progress_logs_quality_objective_id_fkey" FOREIGN KEY ("quality_objective_id") REFERENCES "quality_objectives"("quality_objective_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objective_progress_logs" ADD CONSTRAINT "quality_objective_progress_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objective_progress_logs" ADD CONSTRAINT "quality_objective_progress_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_objective_progress_logs" ADD CONSTRAINT "quality_objective_progress_logs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
