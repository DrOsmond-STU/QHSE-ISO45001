"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedInspectionNotificationTemplates = seedInspectionNotificationTemplates;
// Task 3.6 (Modul 08 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-incident-notification-templates.ts
// (3.5). HANYA 2 dari 5 event literal PRD §8 di-seed —
// INSPECTION_RECORD_OVERDUE dipicu InspectionRecordOverdueScanService (BR-06),
// INSPECTION_FINDING_SLA_BREACH dipicu InspectionFindingSlaScanService (BR-04).
// TIGA baris SISA PRD §8 SENGAJA TIDAK di-seed: "Inspeksi terjadwal H-1"
// (butuh kolom idempotency tracking terpisah, gap sama H-30-menit gas
// retest Work Permit 3.4), "Temuan HIGH severity dibuat" (InspectionFindingService.create()
// HANYA emit event stub inspection.finding_created, TIDAK enqueue
// notifikasi langsung — gap TDD §26), "Inspeksi selesai skor di bawah
// ambang" (InspectionRecordService.complete() TIDAK enqueue apa pun
// meski overallResult=FAIL sudah dihitung — gap TDD §26).
require("dotenv/config");
const client_1 = require("@prisma/client");
const TEMPLATES = [
    {
        eventType: "INSPECTION_RECORD_OVERDUE",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Inspeksi OVERDUE",
        bodyTemplate: "Inspeksi {{inspectionRecordNumber}} OVERDUE — planned_date sudah terlampaui tanpa selesai.",
    },
    {
        eventType: "INSPECTION_RECORD_OVERDUE",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Inspeksi {{inspectionRecordNumber}} OVERDUE",
        bodyTemplate: "Inspeksi {{inspectionRecordNumber}} melewati planned_date tanpa berstatus COMPLETED. Segera tindak lanjuti.",
    },
    {
        eventType: "INSPECTION_FINDING_SLA_BREACH",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Temuan HIGH belum ada tindak lanjut",
        bodyTemplate: "Temuan \"{{title}}\" (severity HIGH) belum ditugaskan PIC dalam SLA 24 jam.",
    },
    {
        eventType: "INSPECTION_FINDING_SLA_BREACH",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Temuan HIGH belum ditugaskan PIC",
        bodyTemplate: "Temuan \"{{title}}\" (severity HIGH) belum memiliki action_tracking_id dalam SLA 24 jam sejak diidentifikasi (BR-04). Segera tugaskan PIC.",
    },
];
// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2/3.2/3.3/3.4/3.5.
async function seedInspectionNotificationTemplates(prisma) {
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
    await seedInspectionNotificationTemplates(prisma);
    // eslint-disable-next-line no-console
    console.log(`Inspection notification templates siap: ${TEMPLATES.length} baris.`);
    await prisma.$disconnect();
}
if (require.main === module) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
