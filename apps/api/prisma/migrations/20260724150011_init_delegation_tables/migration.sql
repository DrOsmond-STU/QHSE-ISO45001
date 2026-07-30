-- CreateEnum
CREATE TYPE "DelegationReason" AS ENUM ('ANNUAL_LEAVE', 'SICK_LEAVE', 'BUSINESS_TRIP', 'RESIGNATION_TRANSITION', 'OTHER');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REVOKED');

-- CreateTable
CREATE TABLE "delegation_of_authority" (
    "delegation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "delegator_user_id" UUID NOT NULL,
    "delegate_user_id" UUID NOT NULL,
    "scope_type" "ScopeType",
    "scope_id" UUID,
    "role_id" UUID,
    "reason" "DelegationReason" NOT NULL DEFAULT 'OTHER',
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "status" "DelegationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "approved_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "delegation_of_authority_pkey" PRIMARY KEY ("delegation_id")
);

-- CreateTable
CREATE TABLE "workflow_delegations" (
    "delegation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "delegator_user_id" UUID NOT NULL,
    "delegate_user_id" UUID NOT NULL,
    "role_id" UUID,
    "scope_type" "ScopeType",
    "scope_id" UUID,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source_delegation_of_authority_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_delegations_pkey" PRIMARY KEY ("delegation_id")
);

-- CreateIndex
CREATE INDEX "delegation_of_authority_tenant_id_delegator_user_id_status_idx" ON "delegation_of_authority"("tenant_id", "delegator_user_id", "status");

-- CreateIndex
CREATE INDEX "delegation_of_authority_tenant_id_status_date_from_date_to_idx" ON "delegation_of_authority"("tenant_id", "status", "date_from", "date_to");

-- CreateIndex
CREATE INDEX "workflow_delegations_tenant_id_delegator_user_id_is_active_idx" ON "workflow_delegations"("tenant_id", "delegator_user_id", "is_active");

-- CreateIndex
CREATE INDEX "workflow_delegations_source_delegation_of_authority_id_idx" ON "workflow_delegations"("source_delegation_of_authority_id");

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_delegator_user_id_fkey" FOREIGN KEY ("delegator_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_delegate_user_id_fkey" FOREIGN KEY ("delegate_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_of_authority" ADD CONSTRAINT "delegation_of_authority_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_delegator_user_id_fkey" FOREIGN KEY ("delegator_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_delegate_user_id_fkey" FOREIGN KEY ("delegate_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;
