-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UsageMetricType" AS ENUM ('ACTIVE_USERS', 'ACTIVE_SITES');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "subscription_plan_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_name" VARCHAR(100) NOT NULL,
    "included_module_codes" TEXT[],
    "max_users" INTEGER,
    "max_sites" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("subscription_plan_id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "tenant_subscription_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "subscription_plan_id" UUID NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "status" "TenantSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "start_date" DATE DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("tenant_subscription_id")
);

-- CreateTable
CREATE TABLE "module_entitlements" (
    "module_entitlement_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "module_code" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "override_reason" TEXT,
    "overridden_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "module_entitlements_pkey" PRIMARY KEY ("module_entitlement_id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "usage_counter_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "metric_type" "UsageMetricType" NOT NULL,
    "current_value" INTEGER NOT NULL,
    "measured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("usage_counter_id")
);

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenant_id_status_idx" ON "tenant_subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "module_entitlements_tenant_id_is_enabled_idx" ON "module_entitlements"("tenant_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "module_entitlements_tenant_id_module_code_key" ON "module_entitlements"("tenant_id", "module_code");

-- CreateIndex
CREATE INDEX "usage_counters_tenant_id_metric_type_measured_at_idx" ON "usage_counters"("tenant_id", "metric_type", "measured_at");

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("subscription_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_entitlements" ADD CONSTRAINT "module_entitlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_entitlements" ADD CONSTRAINT "module_entitlements_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
