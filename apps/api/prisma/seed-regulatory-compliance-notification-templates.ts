// Task 2.2 (Modul 04 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-dms-notification-templates.ts (2.1) —
// lihat banner comment file itu utk rationale lengkap (IN_APP+EMAIL
// di-seed, WHATSAPP/TELEGRAM tidak — provider stub 0.11 belum dikonfigurasi
// apa pun isinya, bukan gap spesifik modul ini).
//
// 6 eventType: 5 dari PRD §8 literal + COMPLIANCE_EVALUATION_REJECTED
// (BEYOND literal, analog DOCUMENT_VERSION_REJECTED 2.1 — notifikasi
// operasional wajar begitu ComplianceEvaluationWorkflowCompletionListener
// mengembalikan evaluasi ke DRAFT, gap TDD §26 dicatat sbg penambahan
// bukan penyimpangan). LICENSE_EXPIRY_REMINDER SATU eventType utk KETIGA
// tier H-90/H-30/H-7 (PRD §8 satu baris literal utk ketiganya, bukan 3
// baris terpisah) — {{daysRemaining}} membedakan tier di teks notifikasi.
//
// Jalankan CLI: pnpm --filter @qhse/api seed:regulatory-compliance-notification-templates
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
    eventType: "LICENSE_EXPIRY_REMINDER",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Izin akan kedaluwarsa",
    bodyTemplate: "Izin {{licenseName}} akan kedaluwarsa pada {{expiryDate}} (H-{{daysRemaining}}).",
  },
  {
    eventType: "LICENSE_EXPIRY_REMINDER",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Izin {{licenseName}} akan kedaluwarsa",
    bodyTemplate: "Izin {{licenseName}} akan kedaluwarsa pada {{expiryDate}} (H-{{daysRemaining}}). Segera ajukan perpanjangan.",
  },
  {
    eventType: "LICENSE_EXPIRED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Izin telah kedaluwarsa",
    bodyTemplate: "Izin {{licenseName}} telah kedaluwarsa pada {{expiryDate}} — tindakan segera diperlukan.",
  },
  {
    eventType: "LICENSE_EXPIRED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Izin {{licenseName}} telah kedaluwarsa",
    bodyTemplate: "Izin {{licenseName}} telah kedaluwarsa pada {{expiryDate}} — tindakan segera diperlukan.",
  },
  {
    eventType: "COMPLIANCE_EVALUATION_DUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Evaluasi kepatuhan jatuh tempo",
    bodyTemplate: "Evaluasi kepatuhan {{obligationDescription}} jatuh tempo {{nextDueDate}}.",
  },
  {
    eventType: "COMPLIANCE_EVALUATION_DUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Evaluasi kepatuhan jatuh tempo",
    bodyTemplate: "Evaluasi kepatuhan {{obligationDescription}} jatuh tempo {{nextDueDate}}.",
  },
  {
    eventType: "COMPLIANCE_EVALUATION_NON_COMPLIANT_SUBMITTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Ketidakpatuhan ditemukan",
    bodyTemplate: "Ditemukan ketidakpatuhan pada {{regulationNumber}}, perlu review & CAPA.",
  },
  {
    eventType: "COMPLIANCE_EVALUATION_NON_COMPLIANT_SUBMITTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Ketidakpatuhan ditemukan: {{regulationNumber}}",
    bodyTemplate: "Ditemukan ketidakpatuhan pada {{regulationNumber}}, perlu review & CAPA segera.",
  },
  {
    eventType: "COMPLIANCE_OBLIGATION_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Kewajiban belum dievaluasi",
    bodyTemplate: "Kewajiban {{obligationDescription}} belum dievaluasi melewati jadwal ({{nextDueDate}}).",
  },
  {
    eventType: "COMPLIANCE_OBLIGATION_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Kewajiban {{obligationDescription}} lewat jadwal",
    bodyTemplate: "Kewajiban {{obligationDescription}} belum dievaluasi dan telah melewati jadwal ({{nextDueDate}}).",
  },
  {
    eventType: "COMPLIANCE_EVALUATION_REJECTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Evaluasi kepatuhan ditolak",
    bodyTemplate: "Evaluasi kepatuhan {{evaluationNumber}} ditolak pada tahap review. Silakan revisi dan ajukan ulang.",
  },
  {
    eventType: "COMPLIANCE_EVALUATION_REJECTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Evaluasi {{evaluationNumber}} ditolak",
    bodyTemplate: "Evaluasi kepatuhan {{evaluationNumber}} yang Anda ajukan ditolak pada tahap review dan perlu direvisi.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS
// seed-dms-notification-templates.ts (tenantId NULL di compound unique
// key nullable tidak bisa dipakai upsert()/findUnique()).
export async function seedRegulatoryComplianceNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedRegulatoryComplianceNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Regulatory-compliance notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
