-- CreateEnum
CREATE TYPE "AssetLifecycleStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'STANDBY', 'RETIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "AssetConditionStatus" AS ENUM ('GOOD', 'FAIR', 'POOR', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "MaintenanceIntervalType" AS ENUM ('DAYS', 'WEEKS', 'MONTHS', 'RUNNING_HOURS');

-- CreateTable
CREATE TABLE "asset_categories" (
    "asset_category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "parent_category_id" UUID,
    "default_is_safety_critical" BOOLEAN NOT NULL DEFAULT false,
    "requires_disposal_approval" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("asset_category_id")
);

-- CreateTable
CREATE TABLE "assets" (
    "asset_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID,
    "asset_category_id" UUID NOT NULL,
    "asset_code" VARCHAR(50) NOT NULL,
    "asset_name" VARCHAR(200) NOT NULL,
    "manufacturer" VARCHAR(150),
    "model_number" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "purchase_date" DATE,
    "is_safety_critical" BOOLEAN NOT NULL DEFAULT false,
    "lifecycle_status" "AssetLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "condition_status" "AssetConditionStatus" NOT NULL DEFAULT 'GOOD',
    "custom_fields" JSONB,
    "disposal_workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "maintenance_schedule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "maintenance_type" VARCHAR(100) NOT NULL,
    "interval_type" "MaintenanceIntervalType" NOT NULL,
    "interval_value" INTEGER NOT NULL,
    "next_due_date" DATE NOT NULL,
    "responsible_role_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("maintenance_schedule_id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "maintenance_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "maintenance_schedule_id" UUID,
    "performed_date" DATE NOT NULL,
    "performed_by" UUID NOT NULL,
    "findings" TEXT,
    "result_condition" "AssetConditionStatus" NOT NULL,
    "cost" DECIMAL(15,2),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("maintenance_record_id")
);

-- CreateTable
CREATE TABLE "asset_transfer_log" (
    "transfer_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "from_site_id" UUID NOT NULL,
    "to_site_id" UUID NOT NULL,
    "transfer_date" DATE NOT NULL,
    "requested_by" UUID,
    "approved_by" UUID,
    "reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_transfer_log_pkey" PRIMARY KEY ("transfer_id")
);

-- CreateIndex
CREATE INDEX "asset_categories_tenant_id_parent_category_id_idx" ON "asset_categories"("tenant_id", "parent_category_id");

-- CreateIndex
CREATE INDEX "assets_tenant_id_site_id_idx" ON "assets"("tenant_id", "site_id");

-- CreateIndex
CREATE INDEX "assets_tenant_id_lifecycle_status_idx" ON "assets"("tenant_id", "lifecycle_status");

-- CreateIndex
CREATE INDEX "assets_tenant_id_is_safety_critical_condition_status_idx" ON "assets"("tenant_id", "is_safety_critical", "condition_status");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenant_id_asset_code_key" ON "assets"("tenant_id", "asset_code");

-- CreateIndex
CREATE INDEX "maintenance_schedules_tenant_id_is_active_next_due_date_idx" ON "maintenance_schedules"("tenant_id", "is_active", "next_due_date");

-- CreateIndex
CREATE INDEX "maintenance_records_tenant_id_asset_id_idx" ON "maintenance_records"("tenant_id", "asset_id");

-- CreateIndex
CREATE INDEX "asset_transfer_log_tenant_id_asset_id_idx" ON "asset_transfer_log"("tenant_id", "asset_id");

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "asset_categories"("asset_category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_category_id_fkey" FOREIGN KEY ("asset_category_id") REFERENCES "asset_categories"("asset_category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_responsible_role_id_fkey" FOREIGN KEY ("responsible_role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_maintenance_schedule_id_fkey" FOREIGN KEY ("maintenance_schedule_id") REFERENCES "maintenance_schedules"("maintenance_schedule_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_from_site_id_fkey" FOREIGN KEY ("from_site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_to_site_id_fkey" FOREIGN KEY ("to_site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_log" ADD CONSTRAINT "asset_transfer_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
