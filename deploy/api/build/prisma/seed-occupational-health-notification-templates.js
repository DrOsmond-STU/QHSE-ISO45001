"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOccupationalHealthNotificationTemplates = seedOccupationalHealthNotificationTemplates;
// Task 5.3 (Modul 13 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-environmental-notification-templates.ts
// (5.2). SEMUA 8 event type di-seed — SEMUANYA genuinely py enqueue() call
// site di codebase ini (McuReminderScanService, McuResultService.create(),
// FitToWorkAssessmentService.create() x2, OccupationalDiseaseCaseService.
// create() x2, OccupationalHealthReassessmentScanService,
// HealthDataSubjectRequestService.submit(),
// OccupationalHealthAccessControlService.alertDeniedAttempt()) — BEDA dari
// preseden modul lain yang biasa hanya seed SEBAGIAN baris PRD §8 (di sini
// KEBETULAN semua baris py implementasi nyata).
//
// Konten template SENGAJA tidak pernah menyertakan nama/diagnosis individu
// utk event yang eksplisit "agregat/non-identifiable" (§3.1/BR-08) —
// PAK_CASE_SEVERE_AGGREGATE HANYA severity+site, BEDA dari _DETAIL yang
// boleh caseNumber+kategori (masih BUKAN nama pekerja — employeeUserId
// TIDAK PERNAH masuk variables notifikasi modul ini sama sekali, lihat
// service call site).
require("dotenv/config");
const client_1 = require("@prisma/client");
const TEMPLATES = [
    {
        eventType: "OCCUPATIONAL_HEALTH_MCU_DUE",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Jadwal MCU Anda",
        bodyTemplate: "Jadwal MCU Anda: {{scheduledDate}}.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_MCU_DUE",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Jadwal MCU Anda: {{scheduledDate}}",
        bodyTemplate: "Jadwal Medical Check-Up (MCU) Anda: {{scheduledDate}}. Segera hubungi klinik jika perlu penjadwalan ulang.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_MCU_REQUIRES_FOLLOW_UP",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "MCU memerlukan tindak lanjut",
        bodyTemplate: "Hasil MCU dengan status {{overallMcuResult}} memerlukan tindak lanjut.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_FIT_TO_WORK_UPDATED",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Status kelaikan kerja diperbarui",
        bodyTemplate: "Status kelaikan kerja diperbarui. {{restrictionSummaryForSupervisor}}",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_AGGREGATE",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Kasus PAK kategori berat tercatat",
        bodyTemplate: "Kasus PAK kategori {{severityClassification}} tercatat di site terkait.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_AGGREGATE",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Kasus PAK kategori {{severityClassification}} tercatat",
        bodyTemplate: "Kasus penyakit akibat kerja kategori {{severityClassification}} tercatat — ringkasan agregat, tanpa identitas individu.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_DETAIL",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Kasus PAK kategori berat — detail",
        bodyTemplate: "Kasus PAK {{caseNumber}} kategori {{severityClassification}} ({{diseaseCategory}}) — tinjau detail penuh.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_DETAIL",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Kasus PAK {{caseNumber}} — tinjau segera",
        bodyTemplate: "Kasus PAK {{caseNumber}} kategori {{severityClassification}} ({{diseaseCategory}}) — tinjau detail penuh di sistem.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_REASSESSMENT_DUE",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Reassessment kelaikan kerja diperlukan",
        bodyTemplate: "Reassessment kelaikan kerja diperlukan.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_SUBJECT_REQUEST_SUBMITTED",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Permintaan hak subjek data baru",
        bodyTemplate: "Permintaan hak subjek data baru: {{requestType}}.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_SUBJECT_REQUEST_SUBMITTED",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Permintaan hak subjek data baru: {{requestType}}",
        bodyTemplate: "Permintaan hak subjek data kesehatan baru diajukan: {{requestType}}. Segera tinjau dan proses sesuai UU PDP.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_PHI_ACCESS_DENIED",
        channelCode: "IN_APP",
        language: "ID",
        subjectTemplate: "Percobaan akses PHI ditolak",
        bodyTemplate: "Percobaan akses PHI ditolak: user {{deniedUserId}}.",
    },
    {
        eventType: "OCCUPATIONAL_HEALTH_PHI_ACCESS_DENIED",
        channelCode: "EMAIL",
        language: "ID",
        subjectTemplate: "[QHSE] Alert keamanan — percobaan akses PHI ditolak",
        bodyTemplate: "Percobaan akses data kesehatan pekerja (PHI) ditolak sistem: user {{deniedUserId}}. Tinjau occupational_health_authorized_users jika perlu.",
    },
];
// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1-5.2.
async function seedOccupationalHealthNotificationTemplates(prisma) {
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
    await seedOccupationalHealthNotificationTemplates(prisma);
    // eslint-disable-next-line no-console
    console.log(`Occupational Health notification templates siap: ${TEMPLATES.length} baris.`);
    await prisma.$disconnect();
}
if (require.main === module) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
