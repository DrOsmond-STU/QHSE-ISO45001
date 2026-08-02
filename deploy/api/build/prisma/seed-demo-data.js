"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Orkestrator data demo (bukan task PRD manapun — murni utk kebutuhan demo
// sistem lewat API/Postman). Boot AppModule PENUH via
// NestFactory.createApplicationContext() (pola sama apps/worker/src/*.worker.ts
// — reuse service NYATA, bukan raw Prisma, supaya numbering/workflow_instance/
// audit_log/notification SEMUA genuinely terisi persis seperti pemakaian
// sungguhan) TANPA listener HTTP (guard/controller tidak pernah dilewati,
// krn dipanggil LANGSUNG ke service layer — pola sama seluruh integration
// test di repo ini).
//
// Jalankan: pnpm --filter @qhse/api exec ts-node -r ts-node/register/transpile-only prisma/seed-demo-data.ts
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const app_module_1 = require("../src/app.module");
const _00_foundation_1 = require("./demo-seed/00-foundation");
const _01_dms_1 = require("./demo-seed/01-dms");
const _02_regulatory_compliance_1 = require("./demo-seed/02-regulatory-compliance");
const _03_risk_management_1 = require("./demo-seed/03-risk-management");
const _04_work_permit_1 = require("./demo-seed/04-work-permit");
const _05_incident_1 = require("./demo-seed/05-incident");
const _06_inspection_1 = require("./demo-seed/06-inspection");
const _07_emergency_response_1 = require("./demo-seed/07-emergency-response");
const _08_audit_1 = require("./demo-seed/08-audit");
const _09_capa_1 = require("./demo-seed/09-capa");
const _10_quality_1 = require("./demo-seed/10-quality");
const _11_environmental_1 = require("./demo-seed/11-environmental");
const _12_occupational_health_1 = require("./demo-seed/12-occupational-health");
const _13_asset_equipment_1 = require("./demo-seed/13-asset-equipment");
const _14_calibration_1 = require("./demo-seed/14-calibration");
const _15_contractor_1 = require("./demo-seed/15-contractor");
async function main() {
    const adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ["log", "warn", "error"] });
    try {
        // eslint-disable-next-line no-console
        console.log("=== [1/16] Foundation: tenant + org + users + RBAC + subscription ===");
        const ctx = await (0, _00_foundation_1.seedFoundation)(app, adminPrisma);
        // eslint-disable-next-line no-console
        console.log("=== [2/16] DMS ===");
        await (0, _01_dms_1.seedDms)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [3/16] Regulatory Compliance ===");
        await (0, _02_regulatory_compliance_1.seedRegulatoryCompliance)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [4/16] Risk Management ===");
        await (0, _03_risk_management_1.seedRiskManagement)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [5/16] Work Permit ===");
        await (0, _04_work_permit_1.seedWorkPermit)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [6/16] Incident Management ===");
        await (0, _05_incident_1.seedIncident)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [7/16] Inspection Management ===");
        await (0, _06_inspection_1.seedInspection)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [8/16] Emergency Response ===");
        await (0, _07_emergency_response_1.seedEmergencyResponse)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [9/16] Audit Management ===");
        await (0, _08_audit_1.seedAudit)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [10/16] CAPA Management ===");
        await (0, _09_capa_1.seedCapa)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [11/16] Quality Management ===");
        await (0, _10_quality_1.seedQuality)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [12/16] Environmental Management ===");
        await (0, _11_environmental_1.seedEnvironmental)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [13/16] Occupational Health ===");
        await (0, _12_occupational_health_1.seedOccupationalHealth)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [14/16] Asset & Equipment Management ===");
        await (0, _13_asset_equipment_1.seedAssetEquipment)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [15/16] Calibration Management ===");
        await (0, _14_calibration_1.seedCalibration)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log("=== [16/16] Contractor Management ===");
        await (0, _15_contractor_1.seedContractor)(app, adminPrisma, ctx);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            tenantId: ctx.tenantId,
            companyId: ctx.companyId,
            userCount: ctx.users.length,
            demoPassword: _00_foundation_1.DEMO_PASSWORD,
            users: ctx.users.map((u) => ({ email: u.email, roleCode: u.roleCode, fullName: u.fullName })),
        }, null, 2));
    }
    finally {
        await app.close();
        await adminPrisma.$disconnect();
    }
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
