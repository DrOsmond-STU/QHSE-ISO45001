-- CreateTable
CREATE TABLE "industry_templates" (
    "industry_template_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "default_regulatory_codes" JSONB NOT NULL DEFAULT '[]',
    "default_checklist_refs" JSONB NOT NULL DEFAULT '[]',
    "default_module_entitlements" JSONB NOT NULL DEFAULT '[]',
    "is_system_defined" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "industry_templates_pkey" PRIMARY KEY ("industry_template_id")
);

-- CreateTable
CREATE TABLE "holiday_calendars" (
    "holiday_calendar_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "applies_to_site_id" UUID,
    "country" VARCHAR(2) NOT NULL DEFAULT 'ID',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrgEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("holiday_calendar_id")
);

-- CreateTable
CREATE TABLE "holiday_calendar_entries" (
    "holiday_entry_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "holiday_calendar_id" UUID NOT NULL,
    "holiday_date" DATE NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "is_recurring_yearly" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "holiday_calendar_entries_pkey" PRIMARY KEY ("holiday_entry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industry_templates_code_key" ON "industry_templates"("code");

-- CreateIndex
CREATE INDEX "holiday_calendars_tenant_id_status_idx" ON "holiday_calendars"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "holiday_calendar_entries_tenant_id_idx" ON "holiday_calendar_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "holiday_calendar_entries_holiday_calendar_id_holiday_date_idx" ON "holiday_calendar_entries"("holiday_calendar_id", "holiday_date");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_industry_template_id_fkey" FOREIGN KEY ("industry_template_id") REFERENCES "industry_templates"("industry_template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_industry_template_id_fkey" FOREIGN KEY ("industry_template_id") REFERENCES "industry_templates"("industry_template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_holiday_calendar_id_fkey" FOREIGN KEY ("holiday_calendar_id") REFERENCES "holiday_calendars"("holiday_calendar_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_applies_to_site_id_fkey" FOREIGN KEY ("applies_to_site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_calendar_entries" ADD CONSTRAINT "holiday_calendar_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_calendar_entries" ADD CONSTRAINT "holiday_calendar_entries_holiday_calendar_id_fkey" FOREIGN KEY ("holiday_calendar_id") REFERENCES "holiday_calendars"("holiday_calendar_id") ON DELETE RESTRICT ON UPDATE CASCADE;
