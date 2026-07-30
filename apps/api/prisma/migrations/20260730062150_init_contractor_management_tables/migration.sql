-- CreateEnum
CREATE TYPE "ContractorType" AS ENUM ('CONSTRUCTION', 'ENGINEERING_SERVICES', 'LABOR_SUPPLY', 'LOGISTICS', 'CATERING', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractorCategory" AS ENUM ('TIER_1', 'SUB_CONTRACTOR');

-- CreateEnum
CREATE TYPE "ContractorRiskRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ContractorStatus" AS ENUM ('REGISTERED', 'PREQUALIFIED', 'ACTIVE', 'SUSPENDED', 'BLACKLISTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContractorPrequalificationType" AS ENUM ('NEW', 'RENEWAL', 'RE_EVALUATION');

-- CreateEnum
CREATE TYPE "ContractorPrequalificationResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING');

-- CreateEnum
CREATE TYPE "ContractorPrequalificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContractorDocumentType" AS ENUM ('SIUJK', 'NIB', 'NPWP', 'INSURANCE_CERT', 'K3_CERT_COMPANY', 'HSE_PLAN', 'EMERGENCY_RESPONSE_PLAN', 'IUJP', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractorPqDocumentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ContractorComplianceDocumentCategory" AS ENUM ('BPJS_KETENAGAKERJAAN', 'BPJS_KESEHATAN', 'INSURANCE_GENERAL_LIABILITY', 'INSURANCE_EQUIPMENT', 'SIO_EQUIPMENT', 'IUJP', 'CSMS_CERTIFICATE', 'TAX_COMPLIANCE_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractorComplianceStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWAL_IN_PROGRESS');

-- CreateEnum
CREATE TYPE "ContractorWorkerCategory" AS ENUM ('SKILLED', 'UNSKILLED', 'SUPERVISOR', 'OPERATOR', 'DRIVER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractorWorkerStatus" AS ENUM ('ACTIVE', 'DEMOBILIZED', 'SUSPENDED', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "ContractorAssignmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ContractorEvaluationPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'END_OF_CONTRACT');

-- CreateEnum
CREATE TYPE "ContractorEvaluationRating" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR', 'UNACCEPTABLE');

-- CreateEnum
CREATE TYPE "ContractorEvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateTable
CREATE TABLE "contractors" (
    "contractor_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contractor_name" VARCHAR(200) NOT NULL,
    "contractor_type" "ContractorType" NOT NULL,
    "business_registration_no" VARCHAR(100),
    "business_license_type" VARCHAR(100),
    "tax_id_npwp" VARCHAR(30),
    "address" TEXT,
    "city" VARCHAR(100),
    "province" VARCHAR(100),
    "contact_person_name" VARCHAR(150),
    "contact_person_phone" VARCHAR(30),
    "contact_person_email" VARCHAR(150),
    "contractor_category" "ContractorCategory" NOT NULL,
    "parent_contractor_id" UUID,
    "overall_risk_rating" "ContractorRiskRating" NOT NULL,
    "status" "ContractorStatus" NOT NULL DEFAULT 'REGISTERED',
    "registered_at" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("contractor_id")
);

-- CreateTable
CREATE TABLE "contractor_prequalification" (
    "prequalification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "prequalification_no" VARCHAR(50) NOT NULL,
    "prequalification_type" "ContractorPrequalificationType" NOT NULL,
    "scope_of_work" TEXT,
    "technical_capability_score" DECIMAL,
    "hse_capability_score" DECIMAL,
    "financial_capability_score" DECIMAL,
    "overall_score" DECIMAL,
    "min_passing_score" DECIMAL,
    "result" "ContractorPrequalificationResult" NOT NULL DEFAULT 'PENDING',
    "valid_from" DATE,
    "valid_until" DATE,
    "evaluated_by" UUID,
    "evaluation_date" DATE,
    "workflow_instance_id" UUID,
    "status" "ContractorPrequalificationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractor_prequalification_pkey" PRIMARY KEY ("prequalification_id")
);

-- CreateTable
CREATE TABLE "contractor_prequalification_documents" (
    "pq_document_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "prequalification_id" UUID NOT NULL,
    "document_type" "ContractorDocumentType" NOT NULL,
    "document_id" UUID,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContractorPqDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractor_prequalification_documents_pkey" PRIMARY KEY ("pq_document_id")
);

-- CreateTable
CREATE TABLE "contractor_document_compliance" (
    "compliance_document_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "document_category" "ContractorComplianceDocumentCategory" NOT NULL,
    "document_id" UUID,
    "document_number" VARCHAR(100),
    "issued_by" VARCHAR(150),
    "issue_date" DATE,
    "expiry_date" DATE NOT NULL,
    "reminder_days_before" INTEGER NOT NULL DEFAULT 30,
    "status" "ContractorComplianceStatus" NOT NULL DEFAULT 'VALID',
    "is_mandatory_for_ptk007" BOOLEAN NOT NULL DEFAULT false,
    "reminder_sent_at" TIMESTAMPTZ,
    "expired_notified_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractor_document_compliance_pkey" PRIMARY KEY ("compliance_document_id")
);

-- CreateTable
CREATE TABLE "contractor_workers" (
    "contractor_worker_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "project_assignment_id" UUID,
    "full_name" VARCHAR(150) NOT NULL,
    "id_number_ktp" VARCHAR(30),
    "date_of_birth" DATE,
    "job_position" VARCHAR(100),
    "worker_category" "ContractorWorkerCategory" NOT NULL,
    "is_authorized_permit_requester" BOOLEAN NOT NULL DEFAULT false,
    "site_induction_completed" BOOLEAN NOT NULL DEFAULT false,
    "site_induction_date" DATE,
    "status" "ContractorWorkerStatus" NOT NULL,
    "mobilization_date" DATE,
    "demobilization_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractor_workers_pkey" PRIMARY KEY ("contractor_worker_id")
);

-- CreateTable
CREATE TABLE "contractor_project_assignments" (
    "assignment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "site_id" UUID NOT NULL,
    "contract_no" VARCHAR(50),
    "contract_title" VARCHAR(200),
    "scope_of_work" TEXT,
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE,
    "contract_value" DECIMAL(15,2),
    "hse_plan_document_id" UUID,
    "pic_internal_user_id" UUID NOT NULL,
    "contractor_pic_worker_id" UUID,
    "risk_classification" "ContractorRiskRating" NOT NULL,
    "status" "ContractorAssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractor_project_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "contractor_performance_evaluations" (
    "evaluation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "project_assignment_id" UUID,
    "evaluation_period" "ContractorEvaluationPeriod" NOT NULL,
    "period_start_date" DATE NOT NULL,
    "period_end_date" DATE NOT NULL,
    "hse_compliance_score" DECIMAL,
    "incident_count" INTEGER NOT NULL DEFAULT 0,
    "near_miss_count" INTEGER NOT NULL DEFAULT 0,
    "man_hours_worked" DECIMAL,
    "trir_lti_metrics" JSONB,
    "document_compliance_score" DECIMAL,
    "overall_rating" "ContractorEvaluationRating" NOT NULL,
    "evaluated_by" UUID,
    "evaluation_date" DATE NOT NULL,
    "recommendation" TEXT,
    "workflow_instance_id" UUID,
    "status" "ContractorEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contractor_performance_evaluations_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateIndex
CREATE INDEX "contractors_tenant_id_status_idx" ON "contractors"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_prequalification_workflow_instance_id_key" ON "contractor_prequalification"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "contractor_prequalification_tenant_id_contractor_id_idx" ON "contractor_prequalification"("tenant_id", "contractor_id");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_prequalification_tenant_id_prequalification_no_key" ON "contractor_prequalification"("tenant_id", "prequalification_no");

-- CreateIndex
CREATE INDEX "contractor_prequalification_documents_tenant_id_prequalific_idx" ON "contractor_prequalification_documents"("tenant_id", "prequalification_id");

-- CreateIndex
CREATE INDEX "contractor_document_compliance_tenant_id_contractor_id_idx" ON "contractor_document_compliance"("tenant_id", "contractor_id");

-- CreateIndex
CREATE INDEX "contractor_document_compliance_tenant_id_expiry_date_idx" ON "contractor_document_compliance"("tenant_id", "expiry_date");

-- CreateIndex
CREATE INDEX "contractor_workers_tenant_id_contractor_id_idx" ON "contractor_workers"("tenant_id", "contractor_id");

-- CreateIndex
CREATE INDEX "contractor_workers_tenant_id_project_assignment_id_idx" ON "contractor_workers"("tenant_id", "project_assignment_id");

-- CreateIndex
CREATE INDEX "contractor_project_assignments_tenant_id_contractor_id_idx" ON "contractor_project_assignments"("tenant_id", "contractor_id");

-- CreateIndex
CREATE INDEX "contractor_project_assignments_tenant_id_site_id_idx" ON "contractor_project_assignments"("tenant_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_performance_evaluations_workflow_instance_id_key" ON "contractor_performance_evaluations"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "contractor_performance_evaluations_tenant_id_contractor_id_idx" ON "contractor_performance_evaluations"("tenant_id", "contractor_id");

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "contractors"("contractor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "contractors"("contractor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_parent_contractor_id_fkey" FOREIGN KEY ("parent_contractor_id") REFERENCES "contractors"("contractor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification" ADD CONSTRAINT "contractor_prequalification_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification" ADD CONSTRAINT "contractor_prequalification_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("contractor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification" ADD CONSTRAINT "contractor_prequalification_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification" ADD CONSTRAINT "contractor_prequalification_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification" ADD CONSTRAINT "contractor_prequalification_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification" ADD CONSTRAINT "contractor_prequalification_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification_documents" ADD CONSTRAINT "contractor_prequalification_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification_documents" ADD CONSTRAINT "contractor_prequalification_documents_prequalification_id_fkey" FOREIGN KEY ("prequalification_id") REFERENCES "contractor_prequalification"("prequalification_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification_documents" ADD CONSTRAINT "contractor_prequalification_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification_documents" ADD CONSTRAINT "contractor_prequalification_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification_documents" ADD CONSTRAINT "contractor_prequalification_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_prequalification_documents" ADD CONSTRAINT "contractor_prequalification_documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_document_compliance" ADD CONSTRAINT "contractor_document_compliance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_document_compliance" ADD CONSTRAINT "contractor_document_compliance_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("contractor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_document_compliance" ADD CONSTRAINT "contractor_document_compliance_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_document_compliance" ADD CONSTRAINT "contractor_document_compliance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_document_compliance" ADD CONSTRAINT "contractor_document_compliance_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_workers" ADD CONSTRAINT "contractor_workers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_workers" ADD CONSTRAINT "contractor_workers_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("contractor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_workers" ADD CONSTRAINT "contractor_workers_project_assignment_id_fkey" FOREIGN KEY ("project_assignment_id") REFERENCES "contractor_project_assignments"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_workers" ADD CONSTRAINT "contractor_workers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_workers" ADD CONSTRAINT "contractor_workers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("contractor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_hse_plan_document_id_fkey" FOREIGN KEY ("hse_plan_document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_pic_internal_user_id_fkey" FOREIGN KEY ("pic_internal_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_contractor_pic_worker_id_fkey" FOREIGN KEY ("contractor_pic_worker_id") REFERENCES "contractor_workers"("contractor_worker_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_project_assignments" ADD CONSTRAINT "contractor_project_assignments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("contractor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_project_assignment_id_fkey" FOREIGN KEY ("project_assignment_id") REFERENCES "contractor_project_assignments"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_performance_evaluations" ADD CONSTRAINT "contractor_performance_evaluations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
