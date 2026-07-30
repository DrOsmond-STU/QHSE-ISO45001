-- CreateEnum
CREATE TYPE "RegulatoryFrameworkCategory" AS ENUM ('ISO_STANDARD', 'GOVERNMENT_REGULATION', 'INDUSTRY_GUIDELINE');

-- CreateEnum
CREATE TYPE "RegulationType" AS ENUM ('LAW_UU', 'GOVERNMENT_REGULATION_PP', 'MINISTERIAL_REGULATION_PERMEN', 'MINISTERIAL_DECREE_KEPMEN', 'LOCAL_REGULATION_PERDA', 'INTERNATIONAL_STANDARD', 'COMPANY_INTERNAL_STANDARD', 'GUIDELINE');

-- CreateEnum
CREATE TYPE "ComplianceApplicableScope" AS ENUM ('ALL_TENANT', 'SPECIFIC_COMPANY', 'SPECIFIC_SITE');

-- CreateEnum
CREATE TYPE "RegulatoryRegisterStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('REPORTING', 'LICENSING', 'TRAINING', 'INSPECTION', 'DOCUMENTATION', 'ORGANIZATIONAL', 'TECHNICAL_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "ObligationFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "EvaluationMethod" AS ENUM ('DOCUMENT_REVIEW', 'SITE_VERIFICATION', 'INTERVIEW', 'COMBINED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ComplianceEvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('ENVIRONMENTAL_PERMIT', 'OPERATIONAL_PERMIT', 'SIO_OPERATOR_CERT', 'BUILDING_PERMIT_PBG', 'HAZWASTE_PERMIT_TPS_LB3', 'PROPER_RATING', 'OTHER');

-- CreateEnum
CREATE TYPE "LicenseHolderType" AS ENUM ('COMPANY', 'SITE', 'EQUIPMENT', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'REVOKED', 'IN_RENEWAL_PROCESS');

-- CreateTable
CREATE TABLE "regulatory_frameworks" (
    "framework_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "RegulatoryFrameworkCategory" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "regulatory_frameworks_pkey" PRIMARY KEY ("framework_id")
);

-- CreateTable
CREATE TABLE "regulatory_register" (
    "regulatory_register_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "framework_id" UUID,
    "regulation_type" "RegulationType" NOT NULL,
    "regulation_number" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "issuing_authority" VARCHAR(150),
    "issue_date" DATE,
    "effective_date" DATE,
    "applicable_scope" "ComplianceApplicableScope" NOT NULL DEFAULT 'ALL_TENANT',
    "applicable_company_id" UUID,
    "applicable_site_id" UUID,
    "industry_relevance" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "source_url" VARCHAR(500),
    "status" "RegulatoryRegisterStatus" NOT NULL DEFAULT 'ACTIVE',
    "superseded_by_register_id" UUID,
    "review_cycle_months" INTEGER,
    "next_review_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "regulatory_register_pkey" PRIMARY KEY ("regulatory_register_id")
);

-- CreateTable
CREATE TABLE "compliance_obligations" (
    "obligation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "regulatory_register_id" UUID NOT NULL,
    "obligation_code" VARCHAR(50),
    "clause_reference" VARCHAR(100),
    "obligation_description" TEXT NOT NULL,
    "obligation_type" "ObligationType" NOT NULL,
    "responsible_user_id" UUID,
    "responsible_department_id" UUID,
    "applicable_site_id" UUID,
    "frequency" "ObligationFrequency" NOT NULL,
    "next_due_date" DATE,
    "status" "ObligationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "compliance_obligations_pkey" PRIMARY KEY ("obligation_id")
);

-- CreateTable
CREATE TABLE "compliance_evaluations" (
    "evaluation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "evaluation_number" VARCHAR(100) NOT NULL,
    "regulatory_register_id" UUID,
    "obligation_id" UUID,
    "site_id" UUID,
    "evaluation_period_start" DATE NOT NULL,
    "evaluation_period_end" DATE NOT NULL,
    "evaluator_user_id" UUID NOT NULL,
    "evaluation_date" DATE NOT NULL,
    "evaluation_method" "EvaluationMethod" NOT NULL,
    "compliance_status" "ComplianceStatus" NOT NULL,
    "findings_summary" TEXT,
    "capa_triggered" BOOLEAN NOT NULL DEFAULT false,
    "linked_capa_id" UUID,
    "next_evaluation_due_date" DATE,
    "status" "ComplianceEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "workflow_instance_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "compliance_evaluations_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateTable
CREATE TABLE "licenses_permits" (
    "license_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "site_id" UUID,
    "license_number" VARCHAR(100) NOT NULL,
    "license_name" VARCHAR(255) NOT NULL,
    "license_type" "LicenseType" NOT NULL,
    "issuing_authority" VARCHAR(150),
    "regulatory_register_id" UUID,
    "holder_type" "LicenseHolderType" NOT NULL,
    "holder_reference_id" UUID,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "renewal_lead_time_days" INTEGER NOT NULL DEFAULT 90,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "renewal_of_license_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "licenses_permits_pkey" PRIMARY KEY ("license_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_frameworks_code_key" ON "regulatory_frameworks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_register_superseded_by_register_id_key" ON "regulatory_register"("superseded_by_register_id");

-- CreateIndex
CREATE INDEX "regulatory_register_tenant_id_status_idx" ON "regulatory_register"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "regulatory_register_tenant_id_framework_id_idx" ON "regulatory_register"("tenant_id", "framework_id");

-- CreateIndex
CREATE INDEX "compliance_obligations_tenant_id_regulatory_register_id_idx" ON "compliance_obligations"("tenant_id", "regulatory_register_id");

-- CreateIndex
CREATE INDEX "compliance_obligations_tenant_id_status_next_due_date_idx" ON "compliance_obligations"("tenant_id", "status", "next_due_date");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_evaluations_workflow_instance_id_key" ON "compliance_evaluations"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "compliance_evaluations_tenant_id_status_idx" ON "compliance_evaluations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "compliance_evaluations_tenant_id_obligation_id_idx" ON "compliance_evaluations"("tenant_id", "obligation_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_evaluations_tenant_id_evaluation_number_key" ON "compliance_evaluations"("tenant_id", "evaluation_number");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_permits_renewal_of_license_id_key" ON "licenses_permits"("renewal_of_license_id");

-- CreateIndex
CREATE INDEX "licenses_permits_tenant_id_status_idx" ON "licenses_permits"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "licenses_permits_tenant_id_expiry_date_idx" ON "licenses_permits"("tenant_id", "expiry_date");

-- CreateIndex
CREATE INDEX "licenses_permits_tenant_id_holder_type_holder_reference_id_idx" ON "licenses_permits"("tenant_id", "holder_type", "holder_reference_id");

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "regulatory_frameworks"("framework_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_applicable_company_id_fkey" FOREIGN KEY ("applicable_company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_applicable_site_id_fkey" FOREIGN KEY ("applicable_site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_superseded_by_register_id_fkey" FOREIGN KEY ("superseded_by_register_id") REFERENCES "regulatory_register"("regulatory_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_register" ADD CONSTRAINT "regulatory_register_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_regulatory_register_id_fkey" FOREIGN KEY ("regulatory_register_id") REFERENCES "regulatory_register"("regulatory_register_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_responsible_department_id_fkey" FOREIGN KEY ("responsible_department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_applicable_site_id_fkey" FOREIGN KEY ("applicable_site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_regulatory_register_id_fkey" FOREIGN KEY ("regulatory_register_id") REFERENCES "regulatory_register"("regulatory_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "compliance_obligations"("obligation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_evaluator_user_id_fkey" FOREIGN KEY ("evaluator_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_regulatory_register_id_fkey" FOREIGN KEY ("regulatory_register_id") REFERENCES "regulatory_register"("regulatory_register_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_renewal_of_license_id_fkey" FOREIGN KEY ("renewal_of_license_id") REFERENCES "licenses_permits"("license_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses_permits" ADD CONSTRAINT "licenses_permits_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
