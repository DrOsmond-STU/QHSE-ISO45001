"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRegulatoryFrameworks = seedRegulatoryFrameworks;
// Task 2.2 (Modul 04 §5) — katalog regulatory_frameworks GLOBAL (tenantId
// TIDAK ADA sama sekali, pola PERSIS industry_templates 1.2/subscription_plans
// 1.5). Codes mencakup SELURUH daftar literal PRD §5 comment ("ISO9001,
// ISO14001, ISO45001, ISO19011, ISO31000, ISO22301, PP50, PERMENAKER,
// PTK007, PROPER") DITAMBAH "KEPMEN_ESDM" BEYOND daftar literal — SUDAH
// direferensikan prisma/seed-industry-templates.ts (1.2)
// defaultRegulatoryCodes utk template "Migas"/"Pertambangan" SEJAK
// SEBELUM modul ini ada, TANPA baris regulatory_frameworks yang cocok
// kode itu, onboarding-seed (RegulatoryRegisterService.seedFromIndustryTemplate())
// akan diam-diam skip/framework_id NULL utk kode itu kalau tidak
// ditambahkan di sini (gap TDD §26).
require("dotenv/config");
const client_1 = require("@prisma/client");
const FRAMEWORKS = [
    { code: "ISO9001", name: "ISO 9001 — Sistem Manajemen Mutu", category: "ISO_STANDARD", description: "Standar internasional sistem manajemen mutu." },
    { code: "ISO14001", name: "ISO 14001 — Sistem Manajemen Lingkungan", category: "ISO_STANDARD", description: "Standar internasional sistem manajemen lingkungan." },
    { code: "ISO45001", name: "ISO 45001 — Sistem Manajemen K3", category: "ISO_STANDARD", description: "Standar internasional sistem manajemen keselamatan & kesehatan kerja." },
    { code: "ISO19011", name: "ISO 19011 — Pedoman Audit Sistem Manajemen", category: "ISO_STANDARD", description: "Pedoman pelaksanaan audit sistem manajemen." },
    { code: "ISO31000", name: "ISO 31000 — Manajemen Risiko", category: "ISO_STANDARD", description: "Prinsip & pedoman manajemen risiko." },
    { code: "ISO22301", name: "ISO 22301 — Manajemen Kontinuitas Bisnis", category: "ISO_STANDARD", description: "Standar sistem manajemen kontinuitas bisnis." },
    { code: "PP50", name: "PP No. 50 Tahun 2012 — SMK3", category: "GOVERNMENT_REGULATION", description: "Peraturan Pemerintah tentang Penerapan Sistem Manajemen K3." },
    { code: "PERMENAKER", name: "Peraturan Menteri Ketenagakerjaan (K3)", category: "GOVERNMENT_REGULATION", description: "Kumpulan Permenaker terkait K3 (Wajib Lapor P2K3, K3 Lingkungan Kerja, dst)." },
    { code: "KEPMEN_ESDM", name: "Keputusan Menteri ESDM", category: "GOVERNMENT_REGULATION", description: "Kumpulan Kepmen ESDM terkait keselamatan pertambangan/migas." },
    { code: "PTK007", name: "PTK 007 SKK Migas", category: "INDUSTRY_GUIDELINE", description: "Pedoman Tata Kerja K3LL SKK Migas untuk KKKS." },
    { code: "PROPER", name: "PROPER / Peraturan Menteri LHK", category: "GOVERNMENT_REGULATION", description: "Program Penilaian Peringkat Kinerja Perusahaan dalam Pengelolaan Lingkungan." },
];
async function seedRegulatoryFrameworks(prisma) {
    for (const f of FRAMEWORKS) {
        await prisma.regulatoryFramework.upsert({
            where: { code: f.code },
            update: { name: f.name, category: f.category, description: f.description, isActive: true },
            create: { code: f.code, name: f.name, category: f.category, description: f.description, isActive: true },
        });
    }
}
async function main() {
    const prisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await seedRegulatoryFrameworks(prisma);
    // eslint-disable-next-line no-console
    console.log(`regulatory_frameworks siap: ${FRAMEWORKS.length} baris.`);
    await prisma.$disconnect();
}
if (require.main === module) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
