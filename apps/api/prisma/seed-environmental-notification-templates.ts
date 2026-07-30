// Task 5.2 (Modul 12 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-quality-notification-templates.ts (5.1).
// HANYA 3 dari 5 baris PRD §8 di-seed — YANG GENUINELY py enqueue() call
// site di codebase ini: ENVIRONMENTAL_MONITORING_EXCEED
// (EnvironmentalMonitoringRecordService.create()),
// ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING (scan job),
// ENVIRONMENTAL_ASPECT_SIGNIFICANT_NO_CONTROLS
// (EnvironmentalAspectImpactService.create()). DUA baris SISA PRD §8
// SENGAJA TIDAK di-seed: "proper_self_assessment mendekati deadline
// periode submisi" (TIDAK ADA kolom deadline eksplisit di skema §5
// literal proper_self_assessment — hanya assessment_period string spt
// "2026", tidak ada tanggal batas submisi konkret utk discan, gap TDD
// §26); "environmental_permits mendekati kedaluwarsa" (PRD literal
// SENDIRI bilang "mengikuti mekanisme Modul 04" — cukup license-expiry-scan
// 2.2 yang sudah ada, environmental_permits.license_permit_id menunjuk
// baris licenses_permits yang SAMA).
import "dotenv/config";
import { NotificationChannelCode, NotificationLanguage, PrismaClient } from "@prisma/client";

interface TemplateSeed {
  eventType: string;
  channelCode: NotificationChannelCode;
  language: NotificationLanguage;
  subjectTemplate: string | null;
  bodyTemplate: string;
}

const TEMPLATES: TemplateSeed[] = [
  {
    eventType: "ENVIRONMENTAL_MONITORING_EXCEED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Parameter lingkungan melebihi baku mutu",
    bodyTemplate: "Parameter {{parameterName}} di {{monitoringPointName}} melebihi baku mutu.",
  },
  {
    eventType: "ENVIRONMENTAL_MONITORING_EXCEED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Parameter {{parameterName}} melebihi baku mutu",
    bodyTemplate: "Parameter {{parameterName}} di {{monitoringPointName}} melebihi baku mutu. Draft CAPA telah dibuat otomatis — segera tinjau.",
  },
  {
    eventType: "ENVIRONMENTAL_MONITORING_EXCEED",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: null,
    bodyTemplate: "Parameter {{parameterName}} di {{monitoringPointName}} melebihi baku mutu.",
  },
  {
    eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Limbah mendekati batas waktu simpan",
    bodyTemplate: "Limbah {{wasteName}} di {{storageLocation}} mendekati batas waktu simpan.",
  },
  {
    eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Limbah {{wasteName}} mendekati batas waktu simpan",
    bodyTemplate: "Limbah {{wasteName}} di {{storageLocation}} mendekati batas waktu simpan (H-7). Segera jadwalkan pengangkutan.",
  },
  {
    eventType: "ENVIRONMENTAL_ASPECT_SIGNIFICANT_NO_CONTROLS",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Aspek signifikan belum ada tindak lanjut",
    bodyTemplate: "Aspek signifikan {{activityProcessArea}} belum ada tindak lanjut.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1-5.1.
export async function seedEnvironmentalNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedEnvironmentalNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Environmental notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
