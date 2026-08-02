"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDUSTRY_TEMPLATE_SEEDS = void 0;
exports.seedIndustryTemplates = seedIndustryTemplates;
// Katalog industry_templates BASELINE (task 1.2) — TDD §6.3 "Data referensi
// non-tenant ... di-seed lewat migration terkontrol versi, dipisahkan dari
// migration skema" — pola sama seed-rbac-baseline.ts (0.8): idempotent
// upsert by code, diekspor sebagai fungsi (dipanggil test setup) + CLI.
//
// Kode & cakupan default_regulatory_codes mengikuti contoh literal PRD
// Modul 01 §5 ("mis. MANUFACTURING, OIL_GAS, MINING, CONSTRUCTION,
// GENERIC") — daftar kode regulasi per template INDIKATIF (starting point
// disalin ke regulatory_register saat Modul 04 ada, PRD §4.1 langkah 2),
// BUKAN daftar final yang diverifikasi legal; perlu ditinjau Compliance
// Officer sebelum dipakai produksi (sama semangat BR-04).
//
// Jalankan CLI: pnpm --filter @qhse/api seed:industry-templates
require("dotenv/config");
const client_1 = require("@prisma/client");
exports.INDUSTRY_TEMPLATE_SEEDS = [
    {
        code: "MANUFACTURING",
        name: "Manufaktur",
        description: "Pabrik/manufaktur umum — mesin produksi, lini perakitan, pergudangan.",
        defaultRegulatoryCodes: ["PP50", "PERMENAKER"],
        defaultChecklistRefs: [],
        defaultModuleEntitlements: ["05", "06", "08", "15"],
    },
    {
        code: "OIL_GAS",
        name: "Minyak & Gas",
        description: "KKKS/kontraktor migas — operasi rig, well pad, proyek lapangan.",
        defaultRegulatoryCodes: ["PP50", "PERMENAKER", "PTK007"],
        defaultChecklistRefs: [],
        defaultModuleEntitlements: ["05", "06", "08", "09", "14"],
    },
    {
        code: "MINING",
        name: "Pertambangan",
        description: "Operasi tambang terbuka/bawah tanah.",
        defaultRegulatoryCodes: ["PP50", "PERMENAKER", "KEPMEN_ESDM"],
        defaultChecklistRefs: [],
        defaultModuleEntitlements: ["05", "06", "08", "14"],
    },
    {
        code: "CONSTRUCTION",
        name: "Konstruksi",
        description: "Proyek konstruksi — site kerja berbasis proyek dengan durasi terbatas.",
        defaultRegulatoryCodes: ["PP50", "PERMENAKER"],
        defaultChecklistRefs: [],
        defaultModuleEntitlements: ["05", "06", "08"],
    },
    {
        code: "GENERIC",
        name: "Umum",
        description: "Template default netral-sektor — dipakai tenant yang belum masuk kategori spesifik di atas.",
        defaultRegulatoryCodes: ["PP50", "PERMENAKER"],
        defaultChecklistRefs: [],
        defaultModuleEntitlements: [],
    },
];
async function seedIndustryTemplates(prisma) {
    for (const seed of exports.INDUSTRY_TEMPLATE_SEEDS) {
        await prisma.industryTemplate.upsert({
            where: { code: seed.code },
            update: {},
            create: {
                code: seed.code,
                name: seed.name,
                description: seed.description,
                defaultRegulatoryCodes: seed.defaultRegulatoryCodes,
                defaultChecklistRefs: seed.defaultChecklistRefs,
                defaultModuleEntitlements: seed.defaultModuleEntitlements,
                isSystemDefined: true,
                isActive: true,
            },
        });
    }
}
async function main() {
    const prisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await seedIndustryTemplates(prisma);
    // eslint-disable-next-line no-console
    console.log(`industry_templates baseline siap: ${exports.INDUSTRY_TEMPLATE_SEEDS.map((s) => s.code).join(", ")}.`);
    await prisma.$disconnect();
}
if (require.main === module) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
