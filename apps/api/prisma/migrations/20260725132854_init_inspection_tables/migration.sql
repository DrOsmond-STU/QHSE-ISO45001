-- CreateEnum
CREATE TYPE "InspectionScoringMethod" AS ENUM ('PASS_FAIL_ONLY', 'WEIGHTED_SCORE', 'CHECKLIST_NO_SCORE');

-- CreateEnum
CREATE TYPE "InspectionResponseType" AS ENUM ('PASS_FAIL', 'YES_NO', 'SCALE_1_5', 'TEXT', 'NUMERIC');

-- CreateEnum
CREATE TYPE "InspectionRecurrencePattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM_CRON');

-- CreateEnum
CREATE TYPE "InspectionRecordStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionOverallResult" AS ENUM ('PASS', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "InspectionFindingSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "InspectionFindingStatus" AS ENUM ('OPEN', 'ACTION_ASSIGNED', 'IN_PROGRESS', 'CLOSED', 'ESCALATED_TO_CAPA');

-- CreateTable
CREATE TABLE "inspection_types" (
    "inspection_type_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_types_pkey" PRIMARY KEY ("inspection_type_id")
);

-- CreateTable
CREATE TABLE "inspection_checklist_templates" (
    "inspection_checklist_template_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_type_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scoring_method" "InspectionScoringMethod" NOT NULL,
    "passing_score_threshold" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_date" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_checklist_templates_pkey" PRIMARY KEY ("inspection_checklist_template_id")
);

-- CreateTable
CREATE TABLE "inspection_checklist_template_items" (
    "template_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_checklist_template_id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "item_text" TEXT NOT NULL,
    "category" VARCHAR(100),
    "response_type" "InspectionResponseType" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "requires_photo_if_fail" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_checklist_template_items_pkey" PRIMARY KEY ("template_item_id")
);

-- CreateTable
CREATE TABLE "inspection_schedules" (
    "inspection_schedule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_checklist_template_id" UUID NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "recurrence_pattern" "InspectionRecurrencePattern" NOT NULL,
    "recurrence_detail" VARCHAR(100),
    "default_assigned_inspector_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "next_generation_date" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_schedules_pkey" PRIMARY KEY ("inspection_schedule_id")
);

-- CreateTable
CREATE TABLE "inspection_records" (
    "inspection_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_record_number" VARCHAR(50),
    "inspection_schedule_id" UUID,
    "inspection_checklist_template_id" UUID NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "planned_date" DATE,
    "actual_date" TIMESTAMPTZ,
    "inspector_id" UUID NOT NULL,
    "status" "InspectionRecordStatus" NOT NULL DEFAULT 'SCHEDULED',
    "overall_score" DECIMAL(5,2),
    "overall_result" "InspectionOverallResult",
    "notes" TEXT,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("inspection_record_id")
);

-- CreateTable
CREATE TABLE "inspection_record_items" (
    "record_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_record_id" UUID NOT NULL,
    "template_item_id" UUID NOT NULL,
    "response_value" VARCHAR(200) NOT NULL,
    "score_obtained" DECIMAL(5,2),
    "comment" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_record_items_pkey" PRIMARY KEY ("record_item_id")
);

-- CreateTable
CREATE TABLE "inspection_findings" (
    "inspection_finding_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_record_id" UUID NOT NULL,
    "record_item_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "InspectionFindingSeverity" NOT NULL,
    "area_location" VARCHAR(200),
    "status" "InspectionFindingStatus" NOT NULL DEFAULT 'OPEN',
    "action_tracking_id" UUID,
    "escalated_capa_register_id" UUID,
    "identified_by" UUID NOT NULL,
    "identified_at" TIMESTAMPTZ NOT NULL,
    "target_close_date" DATE,
    "closed_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("inspection_finding_id")
);

-- CreateTable
CREATE TABLE "inspection_scores" (
    "inspection_score_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_record_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "score_obtained" DECIMAL(6,2) NOT NULL,
    "max_possible_score" DECIMAL(6,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inspection_scores_pkey" PRIMARY KEY ("inspection_score_id")
);

-- CreateIndex
CREATE INDEX "inspection_types_tenant_id_is_active_idx" ON "inspection_types"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_types_tenant_id_code_key" ON "inspection_types"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "inspection_checklist_templates_tenant_id_is_active_idx" ON "inspection_checklist_templates"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_checklist_templates_inspection_type_id_version_key" ON "inspection_checklist_templates"("inspection_type_id", "version");

-- CreateIndex
CREATE INDEX "inspection_checklist_template_items_tenant_id_inspection_ch_idx" ON "inspection_checklist_template_items"("tenant_id", "inspection_checklist_template_id", "sequence_no");

-- CreateIndex
CREATE INDEX "inspection_schedules_tenant_id_is_active_next_generation_da_idx" ON "inspection_schedules"("tenant_id", "is_active", "next_generation_date");

-- CreateIndex
CREATE INDEX "inspection_records_tenant_id_status_idx" ON "inspection_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "inspection_records_tenant_id_site_id_idx" ON "inspection_records"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "inspection_records_tenant_id_status_planned_date_idx" ON "inspection_records"("tenant_id", "status", "planned_date");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_records_tenant_id_inspection_record_number_key" ON "inspection_records"("tenant_id", "inspection_record_number");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_record_items_inspection_record_id_template_item__key" ON "inspection_record_items"("inspection_record_id", "template_item_id");

-- CreateIndex
CREATE INDEX "inspection_findings_tenant_id_inspection_record_id_idx" ON "inspection_findings"("tenant_id", "inspection_record_id");

-- CreateIndex
CREATE INDEX "inspection_findings_tenant_id_severity_action_tracking_id_idx" ON "inspection_findings"("tenant_id", "severity", "action_tracking_id");

-- CreateIndex
CREATE INDEX "inspection_scores_tenant_id_inspection_record_id_idx" ON "inspection_scores"("tenant_id", "inspection_record_id");

-- AddForeignKey
ALTER TABLE "inspection_types" ADD CONSTRAINT "inspection_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_types" ADD CONSTRAINT "inspection_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_types" ADD CONSTRAINT "inspection_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_templates" ADD CONSTRAINT "inspection_checklist_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_templates" ADD CONSTRAINT "inspection_checklist_templates_inspection_type_id_fkey" FOREIGN KEY ("inspection_type_id") REFERENCES "inspection_types"("inspection_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_templates" ADD CONSTRAINT "inspection_checklist_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_templates" ADD CONSTRAINT "inspection_checklist_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_template_items" ADD CONSTRAINT "inspection_checklist_template_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_template_items" ADD CONSTRAINT "inspection_checklist_template_items_inspection_checklist_t_fkey" FOREIGN KEY ("inspection_checklist_template_id") REFERENCES "inspection_checklist_templates"("inspection_checklist_template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_template_items" ADD CONSTRAINT "inspection_checklist_template_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_template_items" ADD CONSTRAINT "inspection_checklist_template_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_inspection_checklist_template_id_fkey" FOREIGN KEY ("inspection_checklist_template_id") REFERENCES "inspection_checklist_templates"("inspection_checklist_template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_default_assigned_inspector_id_fkey" FOREIGN KEY ("default_assigned_inspector_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_inspection_schedule_id_fkey" FOREIGN KEY ("inspection_schedule_id") REFERENCES "inspection_schedules"("inspection_schedule_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_inspection_checklist_template_id_fkey" FOREIGN KEY ("inspection_checklist_template_id") REFERENCES "inspection_checklist_templates"("inspection_checklist_template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_inspection_record_id_fkey" FOREIGN KEY ("inspection_record_id") REFERENCES "inspection_records"("inspection_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "inspection_checklist_template_items"("template_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_record_id_fkey" FOREIGN KEY ("inspection_record_id") REFERENCES "inspection_records"("inspection_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_record_item_id_fkey" FOREIGN KEY ("record_item_id") REFERENCES "inspection_record_items"("record_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_identified_by_fkey" FOREIGN KEY ("identified_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_scores" ADD CONSTRAINT "inspection_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_scores" ADD CONSTRAINT "inspection_scores_inspection_record_id_fkey" FOREIGN KEY ("inspection_record_id") REFERENCES "inspection_records"("inspection_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_scores" ADD CONSTRAINT "inspection_scores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_scores" ADD CONSTRAINT "inspection_scores_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
