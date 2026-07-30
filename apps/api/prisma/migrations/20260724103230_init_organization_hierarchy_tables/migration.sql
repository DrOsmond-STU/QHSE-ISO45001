-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TenantDeploymentMode" AS ENUM ('SHARED_CLOUD', 'DEDICATED_CLOUD', 'ON_PREMISE');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ID', 'EN');

-- CreateEnum
CREATE TYPE "OrgEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('HEAD_OFFICE', 'REGIONAL_OFFICE', 'PLANT_OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('PERMANENT', 'PROJECT');

-- CreateEnum
CREATE TYPE "SiteCategory" AS ENUM ('PLANT_FACTORY', 'RIG', 'WELL_PAD', 'WAREHOUSE', 'OFFICE', 'CONSTRUCTION_SITE', 'MINE_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "SiteRiskProfile" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('OPERATIONAL', 'SUPPORT', 'HSE', 'QUALITY', 'MAINTENANCE', 'ADMIN', 'OTHER');

-- CreateTable
CREATE TABLE "tenants" (
    "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_code" VARCHAR(30) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "industry_template_id" UUID,
    "tax_id" VARCHAR(30),
    "primary_domain" VARCHAR(100),
    "default_timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    "default_language" "Language" NOT NULL DEFAULT 'ID',
    "deployment_mode" "TenantDeploymentMode" NOT NULL DEFAULT 'SHARED_CLOUD',
    "data_residency_region" VARCHAR(50) NOT NULL DEFAULT 'ID',
    "status" "TenantStatus" NOT NULL DEFAULT 'PROVISIONING',
    "trial_ends_at" TIMESTAMPTZ,
    "activated_at" TIMESTAMPTZ,
    "suspended_at" TIMESTAMPTZ,
    "logo_url" VARCHAR(500),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "company_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_code" VARCHAR(30) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "business_registration_no" VARCHAR(50),
    "tax_id" VARCHAR(30),
    "industry_template_id" UUID,
    "location_id" UUID,
    "effective_date" DATE,
    "status" "OrgEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "branch_type" "BranchType" NOT NULL DEFAULT 'REGIONAL_OFFICE',
    "location_id" UUID,
    "status" "OrgEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "sites" (
    "site_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "site_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "site_type" "SiteType" NOT NULL,
    "category" "SiteCategory" NOT NULL DEFAULT 'OTHER',
    "start_date" DATE,
    "end_date" DATE,
    "actual_closure_date" DATE,
    "location_id" UUID,
    "geo_lat" DECIMAL(9,6),
    "geo_long" DECIMAL(9,6),
    "timezone" VARCHAR(50),
    "holiday_calendar_id" UUID,
    "risk_profile" "SiteRiskProfile",
    "auto_archive_on_end_date" BOOLEAN NOT NULL DEFAULT true,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("site_id")
);

-- CreateTable
CREATE TABLE "departments" (
    "department_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "parent_department_id" UUID,
    "department_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "department_type" "DepartmentType" NOT NULL DEFAULT 'OPERATIONAL',
    "cost_center_id" UUID,
    "head_user_id" UUID,
    "status" "OrgEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "cost_center_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cost_center_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "gl_account_ref" VARCHAR(50),
    "status" "OrgEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("cost_center_id")
);

-- CreateTable
CREATE TABLE "locations" (
    "location_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "village" VARCHAR(100),
    "district" VARCHAR(100),
    "city_regency" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(10),
    "country" VARCHAR(2) NOT NULL DEFAULT 'ID',
    "geo_lat" DECIMAL(9,6),
    "geo_long" DECIMAL(9,6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "organization_charts" (
    "position_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "position_code" VARCHAR(30),
    "position_title" VARCHAR(150) NOT NULL,
    "reports_to_position_id" UUID,
    "is_management_position" BOOLEAN NOT NULL DEFAULT false,
    "headcount_planned" INTEGER NOT NULL DEFAULT 1,
    "status" "OrgEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "organization_charts_pkey" PRIMARY KEY ("position_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");

-- CreateIndex
CREATE INDEX "companies_tenant_id_status_idx" ON "companies"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenant_id_company_code_key" ON "companies"("tenant_id", "company_code");

-- CreateIndex
CREATE INDEX "branches_tenant_id_status_idx" ON "branches"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_company_id_branch_code_key" ON "branches"("company_id", "branch_code");

-- CreateIndex
CREATE INDEX "sites_tenant_id_status_idx" ON "sites"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sites_company_id_idx" ON "sites"("company_id");

-- CreateIndex
CREATE INDEX "sites_branch_id_idx" ON "sites"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_tenant_id_site_code_key" ON "sites"("tenant_id", "site_code");

-- CreateIndex
CREATE INDEX "departments_tenant_id_status_idx" ON "departments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "departments_company_id_idx" ON "departments"("company_id");

-- CreateIndex
CREATE INDEX "departments_branch_id_idx" ON "departments"("branch_id");

-- CreateIndex
CREATE INDEX "departments_parent_department_id_idx" ON "departments"("parent_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_site_id_department_code_key" ON "departments"("site_id", "department_code");

-- CreateIndex
CREATE INDEX "cost_centers_tenant_id_status_idx" ON "cost_centers"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_company_id_cost_center_code_key" ON "cost_centers"("company_id", "cost_center_code");

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE INDEX "organization_charts_tenant_id_status_idx" ON "organization_charts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "organization_charts_department_id_idx" ON "organization_charts"("department_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("cost_center_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_charts" ADD CONSTRAINT "organization_charts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_charts" ADD CONSTRAINT "organization_charts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_charts" ADD CONSTRAINT "organization_charts_reports_to_position_id_fkey" FOREIGN KEY ("reports_to_position_id") REFERENCES "organization_charts"("position_id") ON DELETE SET NULL ON UPDATE CASCADE;
