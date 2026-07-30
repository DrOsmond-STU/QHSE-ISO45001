// Task 3.7 (Modul 14 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-inspection-notification-templates.ts
// (3.6). HANYA 3 dari 6 baris PRD §8 di-seed — EMERGENCY_REAL_ACTIVATION_DECLARED
// (EmergencyActivationService.declare(), broadcast prioritas TERTINGGI,
// acceptance criterion literal TASK_INSTRUCTION.md 3.7),
// EMERGENCY_PLAN_REVIEW_OVERDUE (BR-01 scan),
// EMERGENCY_EQUIPMENT_OUT_OF_SERVICE (BR-06, real-time sinkron). TIGA
// baris SISA PRD §8 SENGAJA TIDAK di-seed: "Drill mendekati H-7/H-1"
// (butuh kolom idempotency tracking terpisah, gap sama H-30-menit gas
// retest Work Permit 3.4), "missing_person_count>0 setelah durasi
// tertentu" (§13 Open Question #3 "ambang waktu belum ditetapkan di
// dokumen ini" — literal, tidak ada default utk diimplementasikan),
// "Drill COMPLETED tanpa capa_id padahal ada gap" (BR-08 SUDAH ditegakkan
// sbg GATE keras di EmergencyDrillService.complete() — status TIDAK
// PERNAH bisa COMPLETED tanpa capa_id kalau ada gap, jadi notifikasi
// "COMPLETED tanpa capa_id" TIDAK PERNAH genuinely applicable, beda dari
// baris PRD lain yang murni observasional).
import "dotenv/config";
import { NotificationChannelCode, NotificationLanguage, PrismaClient } from "@prisma/client";

interface TemplateSeed {
  eventType: string;
  channelCode: NotificationChannelCode;
  language: NotificationLanguage;
  subjectTemplate: string;
  bodyTemplate: string;
}

const TEMPLATES: TemplateSeed[] = [
  {
    eventType: "EMERGENCY_REAL_ACTIVATION_DECLARED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "DARURAT: {{emergencyType}}",
    bodyTemplate: "DARURAT: {{emergencyType}} di {{site}} — segera menuju {{musterPointName}}.",
  },
  {
    eventType: "EMERGENCY_REAL_ACTIVATION_DECLARED",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: "DARURAT: {{emergencyType}}",
    bodyTemplate: "DARURAT: {{emergencyType}} di {{site}} — segera menuju {{musterPointName}}. Ikuti instruksi Tim Tanggap Darurat.",
  },
  {
    eventType: "EMERGENCY_PLAN_REVIEW_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Rencana Tanggap Darurat perlu direview",
    bodyTemplate: "Rencana Tanggap Darurat {{planTitle}} ({{planNumber}}) sudah melewati jadwal review lebih dari 30 hari.",
  },
  {
    eventType: "EMERGENCY_PLAN_REVIEW_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Rencana Tanggap Darurat {{planNumber}} perlu direview",
    bodyTemplate: "Rencana Tanggap Darurat {{planTitle}} ({{planNumber}}) sudah melewati next_review_due_date lebih dari 30 hari. Segera jadwalkan review.",
  },
  {
    eventType: "EMERGENCY_EQUIPMENT_OUT_OF_SERVICE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Alat darurat kritis OUT OF SERVICE",
    bodyTemplate: "Alat darurat kritis {{assetId}} berstatus OUT OF SERVICE — segera tindak lanjuti.",
  },
  {
    eventType: "EMERGENCY_EQUIPMENT_OUT_OF_SERVICE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Alat darurat kritis OUT OF SERVICE",
    bodyTemplate: "Alat darurat kritis (asset_id={{assetId}}) berstatus OUT OF SERVICE pada checklist kesiapan tanggap darurat. Segera tindak lanjuti (BR-06).",
  },
  {
    eventType: "EMERGENCY_EQUIPMENT_OUT_OF_SERVICE",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: "Alat darurat kritis OUT OF SERVICE",
    bodyTemplate: "Alat darurat kritis {{assetId}} OUT OF SERVICE — segera tindak lanjuti (BR-06).",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2/3.2/3.3/3.4/3.5/3.6.
export async function seedEmergencyResponseNotificationTemplates(prisma: PrismaClient): Promise<void> {
  for (const t of TEMPLATES) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: { tenantId: null, eventType: t.eventType, channelCode: t.channelCode, language: t.language },
    });
    if (existing) {
      await prisma.notificationTemplate.update({
        where: { id: existing.id },
        data: { subjectTemplate: t.subjectTemplate, bodyTemplate: t.bodyTemplate, isActive: true },
      });
    } else {
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
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  await seedEmergencyResponseNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Emergency Response notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
