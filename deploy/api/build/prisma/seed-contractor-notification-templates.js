"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedContractorNotificationTemplates = seedContractorNotificationTemplates;
// Task 6.3 (Modul 17 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-calibration-notification-templates.ts
// (6.2). 4 dari 5 baris §8 literal genuinely terpicu kode — "Evaluasi
// [periode] kontraktor [X] belum dibuat" (jadwal periodik terlewat) SENGAJA
// TIDAK di-seed: contractor_performance_evaluations (§5 literal) TIDAK
// PUNYA kolom "next_evaluation_due_date"/jadwal apa pun utk discan —
// evaluasi murni dibuat manual per periode tanpa jadwal tersimpan, tidak
// ada field utk memicu event ini, gap TDD §26 (pola sama Environmental
// "PROPER mendekati deadline" 5.2 — field jadwal literal tidak ada).
// "Contractor User terkait" pada baris 1 §8 literal TIDAK diresolusi ke
// user spesifik — TIDAK ADA kolom users.contractor_id di skema manapun
// (PRD §13 poin 2 sendiri catat sbg open question "multi-tenant contractor
// identity" belum diputuskan) — penerima HANYA HSE_OFFICER (Contractor
// Coordinator existing), gap TDD §26.
require("dotenv/config");
const client_1 = require("@prisma/client");
const TEMPLATES = [
    {
        eventType: "CONTRACTOR_DOCUMENT_EXPIRING_SOON",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Dokumen kontraktor akan kadaluarsa",
        bodyTemplate: "Dokumen {{documentCategory}} kontraktor {{contractorName}} akan kadaluarsa {{expiryDate}}.",
    },
    {
        eventType: "CONTRACTOR_DOCUMENT_EXPIRING_SOON",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Dokumen {{contractorName}} akan kadaluarsa {{expiryDate}}",
        bodyTemplate: "Dokumen {{documentCategory}} kontraktor {{contractorName}} akan kadaluarsa {{expiryDate}}. Segera lakukan perpanjangan.",
    },
    {
        eventType: "CONTRACTOR_DOCUMENT_EXPIRING_SOON",
        channelCode: "WHATSAPP",
        language: "ID",
        subjectTemplate: null,
        bodyTemplate: "Dokumen {{documentCategory}} kontraktor {{contractorName}} akan kadaluarsa {{expiryDate}}.",
    },
    {
        eventType: "CONTRACTOR_DOCUMENT_EXPIRED",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Dokumen wajib kontraktor TELAH KADALUARSA",
        bodyTemplate: "Dokumen wajib {{documentCategory}} kontraktor {{contractorName}} TELAH KADALUARSA — permit baru diblokir (BR-02).",
    },
    {
        eventType: "CONTRACTOR_DOCUMENT_EXPIRED",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Dokumen {{contractorName}} KADALUARSA",
        bodyTemplate: "Dokumen wajib {{documentCategory}} kontraktor {{contractorName}} TELAH KADALUARSA — permit baru diblokir (BR-02).",
    },
    {
        eventType: "CONTRACTOR_PREQUALIFICATION_EXPIRING",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Prakualifikasi kontraktor akan berakhir",
        bodyTemplate: "Prakualifikasi kontraktor {{contractorName}} akan berakhir {{validUntil}} — perlu renewal.",
    },
    {
        eventType: "CONTRACTOR_PREQUALIFICATION_EXPIRING",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Prakualifikasi {{contractorName}} akan berakhir {{validUntil}}",
        bodyTemplate: "Prakualifikasi kontraktor {{contractorName}} akan berakhir {{validUntil}} — perlu renewal.",
    },
    {
        eventType: "CONTRACTOR_EVALUATION_UNACCEPTABLE_CONSECUTIVE",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Kontraktor rating UNACCEPTABLE berturut-turut",
        bodyTemplate: "Kontraktor {{contractorName}} mendapat rating UNACCEPTABLE 2 periode berturut-turut — perlu tinjauan status.",
    },
    {
        eventType: "CONTRACTOR_EVALUATION_UNACCEPTABLE_CONSECUTIVE",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Kontraktor {{contractorName}} — tinjauan status diperlukan",
        bodyTemplate: "Kontraktor {{contractorName}} mendapat rating UNACCEPTABLE 2 periode berturut-turut — perlu tinjauan status.",
    },
];
// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1-6.2.
async function seedContractorNotificationTemplates(prisma) {
    for (const t of TEMPLATES) {
        const existing = await prisma.notificationTemplate.findFirst({
            where: { tenantId: null, eventType: t.eventType, channelCode: t.channelCode, language: t.language },
        });
        if (existing) {
            await prisma.notificationTemplate.update({
                where: { id: existing.id },
                data: { subjectTemplate: t.subjectTemplate, bodyTemplate: t.bodyTemplate, isActive: true },
            });
        }
        else {
            await prisma.notificationTemplate.create({
                data: {
                    tenantId: null,
                    eventType: t.eventType,
                    channelCode: t.channelCode,
                    language: t.language,
                    subjectTemplate: t.subjectTemplate,
                    bodyTemplate: t.bodyTemplate,
                    isActive: true,
                },
            });
        }
    }
}
async function main() {
    const prisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await seedContractorNotificationTemplates(prisma);
    // eslint-disable-next-line no-console
    console.log(`Contractor notification templates siap: ${TEMPLATES.length} baris.`);
    await prisma.$disconnect();
}
if (require.main === module) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
