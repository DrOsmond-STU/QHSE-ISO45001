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
import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { DEMO_PASSWORD, seedFoundation } from "./demo-seed/00-foundation";
import { seedDms } from "./demo-seed/01-dms";
import { seedRegulatoryCompliance } from "./demo-seed/02-regulatory-compliance";
import { seedRiskManagement } from "./demo-seed/03-risk-management";
import { seedWorkPermit } from "./demo-seed/04-work-permit";
import { seedIncident } from "./demo-seed/05-incident";
import { seedInspection } from "./demo-seed/06-inspection";
import { seedEmergencyResponse } from "./demo-seed/07-emergency-response";
import { seedAudit } from "./demo-seed/08-audit";
import { seedCapa } from "./demo-seed/09-capa";
import { seedQuality } from "./demo-seed/10-quality";
import { seedEnvironmental } from "./demo-seed/11-environmental";
import { seedOccupationalHealth } from "./demo-seed/12-occupational-health";
import { seedAssetEquipment } from "./demo-seed/13-asset-equipment";
import { seedCalibration } from "./demo-seed/14-calibration";
import { seedContractor } from "./demo-seed/15-contractor";

async function main() {
  const adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["log", "warn", "error"] });

  try {
    // eslint-disable-next-line no-console
    console.log("=== [1/16] Foundation: tenant + org + users + RBAC + subscription ===");
    const ctx = await seedFoundation(app, adminPrisma);

    // eslint-disable-next-line no-console
    console.log("=== [2/16] DMS ===");
    await seedDms(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [3/16] Regulatory Compliance ===");
    await seedRegulatoryCompliance(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [4/16] Risk Management ===");
    await seedRiskManagement(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [5/16] Work Permit ===");
    await seedWorkPermit(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [6/16] Incident Management ===");
    await seedIncident(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [7/16] Inspection Management ===");
    await seedInspection(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [8/16] Emergency Response ===");
    await seedEmergencyResponse(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [9/16] Audit Management ===");
    await seedAudit(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [10/16] CAPA Management ===");
    await seedCapa(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [11/16] Quality Management ===");
    await seedQuality(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [12/16] Environmental Management ===");
    await seedEnvironmental(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [13/16] Occupational Health ===");
    await seedOccupationalHealth(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [14/16] Asset & Equipment Management ===");
    await seedAssetEquipment(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [15/16] Calibration Management ===");
    await seedCalibration(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log("=== [16/16] Contractor Management ===");
    await seedContractor(app, adminPrisma, ctx);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          tenantId: ctx.tenantId,
          companyId: ctx.companyId,
          userCount: ctx.users.length,
          demoPassword: DEMO_PASSWORD,
          users: ctx.users.map((u) => ({ email: u.email, roleCode: u.roleCode, fullName: u.fullName })),
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
    await adminPrisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
