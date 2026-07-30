-- CreateEnum
CREATE TYPE "WorkPermitExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkPermitClosureStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'CLOSED', 'RETURNED');

-- CreateTable
CREATE TABLE "work_permit_extensions" (
    "work_permit_extension_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_permit_id" UUID NOT NULL,
    "requested_new_end_datetime" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL,
    "gas_retest_required" BOOLEAN NOT NULL,
    "workflow_instance_id" UUID,
    "status" "WorkPermitExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ NOT NULL,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_permit_extensions_pkey" PRIMARY KEY ("work_permit_extension_id")
);

-- CreateTable
CREATE TABLE "work_permit_closures" (
    "work_permit_closure_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_permit_id" UUID NOT NULL,
    "area_safety_checklist" JSONB NOT NULL DEFAULT '{}',
    "isolation_removed_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "requester_signoff_by" UUID NOT NULL,
    "requester_signoff_at" TIMESTAMPTZ NOT NULL,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "status" "WorkPermitClosureStatus" NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "work_permit_closures_pkey" PRIMARY KEY ("work_permit_closure_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_extensions_workflow_instance_id_key" ON "work_permit_extensions"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "work_permit_extensions_tenant_id_work_permit_id_idx" ON "work_permit_extensions"("tenant_id", "work_permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_closures_work_permit_id_key" ON "work_permit_closures"("work_permit_id");

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_extensions" ADD CONSTRAINT "work_permit_extensions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_closures" ADD CONSTRAINT "work_permit_closures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_closures" ADD CONSTRAINT "work_permit_closures_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permits"("work_permit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_closures" ADD CONSTRAINT "work_permit_closures_requester_signoff_by_fkey" FOREIGN KEY ("requester_signoff_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_closures" ADD CONSTRAINT "work_permit_closures_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_closures" ADD CONSTRAINT "work_permit_closures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_closures" ADD CONSTRAINT "work_permit_closures_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
