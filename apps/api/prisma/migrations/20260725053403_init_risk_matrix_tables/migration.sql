-- CreateEnum
CREATE TYPE "RiskMatrixModuleScope" AS ENUM ('HIRA', 'JSA', 'HIRADC', 'CORPORATE_RISK', 'ALL');

-- CreateEnum
CREATE TYPE "RiskMatrixAxis" AS ENUM ('LIKELIHOOD', 'SEVERITY');

-- CreateEnum
CREATE TYPE "HazardCategory" AS ENUM ('PHYSICAL', 'CHEMICAL', 'BIOLOGICAL', 'ERGONOMIC', 'PSYCHOSOCIAL', 'MECHANICAL', 'ELECTRICAL', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "HazardRegisterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "risk_matrix_configs" (
    "risk_matrix_config_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "applicable_module_scope" "RiskMatrixModuleScope" NOT NULL DEFAULT 'ALL',
    "likelihood_levels" INTEGER NOT NULL DEFAULT 5,
    "severity_levels" INTEGER NOT NULL DEFAULT 5,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "risk_matrix_configs_pkey" PRIMARY KEY ("risk_matrix_config_id")
);

-- CreateTable
CREATE TABLE "risk_matrix_levels" (
    "risk_matrix_level_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "risk_matrix_config_id" UUID NOT NULL,
    "axis" "RiskMatrixAxis" NOT NULL,
    "level_value" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "risk_matrix_levels_pkey" PRIMARY KEY ("risk_matrix_level_id")
);

-- CreateTable
CREATE TABLE "risk_matrix_cells" (
    "risk_matrix_cell_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "risk_matrix_config_id" UUID NOT NULL,
    "likelihood_value" INTEGER NOT NULL,
    "severity_value" INTEGER NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_level" VARCHAR(30) NOT NULL,
    "color_code" VARCHAR(10) NOT NULL,
    "required_action_description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "risk_matrix_cells_pkey" PRIMARY KEY ("risk_matrix_cell_id")
);

-- CreateTable
CREATE TABLE "hazard_register" (
    "hazard_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "site_id" UUID,
    "hazard_code" VARCHAR(30),
    "hazard_category" "HazardCategory" NOT NULL,
    "hazard_description" TEXT NOT NULL,
    "potential_consequence" TEXT,
    "status" "HazardRegisterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "hazard_register_pkey" PRIMARY KEY ("hazard_id")
);

-- CreateIndex
CREATE INDEX "risk_matrix_configs_tenant_id_applicable_module_scope_is_ac_idx" ON "risk_matrix_configs"("tenant_id", "applicable_module_scope", "is_active");

-- CreateIndex
CREATE INDEX "risk_matrix_levels_tenant_id_risk_matrix_config_id_idx" ON "risk_matrix_levels"("tenant_id", "risk_matrix_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_matrix_levels_risk_matrix_config_id_axis_level_value_key" ON "risk_matrix_levels"("risk_matrix_config_id", "axis", "level_value");

-- CreateIndex
CREATE INDEX "risk_matrix_cells_tenant_id_risk_matrix_config_id_idx" ON "risk_matrix_cells"("tenant_id", "risk_matrix_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_matrix_cells_risk_matrix_config_id_likelihood_value_se_key" ON "risk_matrix_cells"("risk_matrix_config_id", "likelihood_value", "severity_value");

-- CreateIndex
CREATE INDEX "hazard_register_tenant_id_status_idx" ON "hazard_register"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "hazard_register_tenant_id_site_id_idx" ON "hazard_register"("tenant_id", "site_id");

-- AddForeignKey
ALTER TABLE "risk_matrix_configs" ADD CONSTRAINT "risk_matrix_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_configs" ADD CONSTRAINT "risk_matrix_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_configs" ADD CONSTRAINT "risk_matrix_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_levels" ADD CONSTRAINT "risk_matrix_levels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_levels" ADD CONSTRAINT "risk_matrix_levels_risk_matrix_config_id_fkey" FOREIGN KEY ("risk_matrix_config_id") REFERENCES "risk_matrix_configs"("risk_matrix_config_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_cells" ADD CONSTRAINT "risk_matrix_cells_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_cells" ADD CONSTRAINT "risk_matrix_cells_risk_matrix_config_id_fkey" FOREIGN KEY ("risk_matrix_config_id") REFERENCES "risk_matrix_configs"("risk_matrix_config_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_register" ADD CONSTRAINT "hazard_register_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_register" ADD CONSTRAINT "hazard_register_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_register" ADD CONSTRAINT "hazard_register_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_register" ADD CONSTRAINT "hazard_register_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
