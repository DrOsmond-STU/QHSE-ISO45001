// Task 6.2 (Modul 16 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-asset-equipment-notification-templates.ts
// (6.1). 4 dari 5 baris §8 literal genuinely terpicu kode — "Sertifikat baru
// diunggah, menunggu review" SENGAJA TIDAK di-seed: Workflow Engine (0.9)
// sendiri sudah membuat workflow_tasks utk approver begitu submitForReview()
// memulai instance, pola PERSIS preseden "Action plan menunggu approval"
// CAPA 4.2 yang juga tidak di-duplikasi Notification Center, gap TDD §26.
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
    eventType: "CALIBRATION_DUE_SOON",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Kalibrasi jatuh tempo",
    bodyTemplate: "Alat {{equipmentTagNo}} jatuh tempo kalibrasi pada {{dueDate}}.",
  },
  {
    eventType: "CALIBRATION_DUE_SOON",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Kalibrasi {{equipmentTagNo}} jatuh tempo {{dueDate}}",
    bodyTemplate: "Alat {{equipmentTagNo}} jatuh tempo kalibrasi pada {{dueDate}}. Segera jadwalkan pelaksanaan.",
  },
  {
    eventType: "CALIBRATION_DUE_SOON",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: null,
    bodyTemplate: "Alat {{equipmentTagNo}} jatuh tempo kalibrasi pada {{dueDate}}.",
  },
  {
    eventType: "CALIBRATION_SCHEDULE_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Kalibrasi TERLAMBAT",
    bodyTemplate: "Kalibrasi {{equipmentTagNo}} TERLAMBAT sejak {{dueDate}}.",
  },
  {
    eventType: "CALIBRATION_SCHEDULE_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Kalibrasi {{equipmentTagNo}} TERLAMBAT",
    bodyTemplate: "Kalibrasi {{equipmentTagNo}} TERLAMBAT sejak {{dueDate}}. Alat berpotensi tidak boleh dipakai (BR-02).",
  },
  {
    eventType: "CALIBRATION_RESULT_FAIL",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Hasil kalibrasi OUT OF TOLERANCE",
    bodyTemplate: "Hasil kalibrasi {{equipmentTagNo}} OUT OF TOLERANCE (sertifikat {{certificateNo}}) — perlu penilaian dampak segera.",
  },
  {
    eventType: "CALIBRATION_RESULT_FAIL",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Hasil kalibrasi {{equipmentTagNo}} OUT OF TOLERANCE",
    bodyTemplate: "Hasil kalibrasi {{equipmentTagNo}} OUT OF TOLERANCE (sertifikat {{certificateNo}}) — perlu penilaian dampak segera.",
  },
  {
    eventType: "CALIBRATION_PROVIDER_ACCREDITATION_EXPIRING",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Akreditasi provider kalibrasi akan berakhir",
    bodyTemplate: "Akreditasi provider {{providerName}} akan berakhir {{accreditationValidUntil}}.",
  },
  {
    eventType: "CALIBRATION_PROVIDER_ACCREDITATION_EXPIRING",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Akreditasi {{providerName}} akan berakhir {{accreditationValidUntil}}",
    bodyTemplate: "Akreditasi provider {{providerName}} akan berakhir {{accreditationValidUntil}}. Segera perbarui sebelum tanggal tersebut.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1-6.1.
export async function seedCalibrationNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedCalibrationNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Calibration notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
