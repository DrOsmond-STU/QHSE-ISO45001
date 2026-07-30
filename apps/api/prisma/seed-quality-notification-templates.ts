// Task 5.1 (Modul 11 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-capa-notification-templates.ts (4.2).
// HANYA 5 dari 6 baris PRD §8 di-seed — YANG GENUINELY py enqueue() call
// site di codebase ini: QUALITY_NCR_CRITICAL (NcrRecordService.create()),
// QUALITY_INSPECTION_FAIL_AUTO_NCR (QualityInspectionService.submit()),
// QUALITY_SUPPLIER_RATING_DOWNGRADED (SupplierEvalWorkflowCompletionListener),
// QUALITY_OBJECTIVE_AT_RISK (QualityObjectiveService.recordProgress()),
// QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE (scan job). SATU baris SISA PRD
// §8 SENGAJA TIDAK di-seed — "NCR/Complaint mendekati due date CAPA |
// mengikuti mekanisme Modul 10" (literal PRD sendiri bilang ini bukan
// event/template terpisah, cukup CAPA's own scan job yang sudah ada
// sejak 4.2 — root-cause-sla-scan/effectiveness-verification-due-scan).
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
    eventType: "QUALITY_NCR_CRITICAL",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "NCR Kritis dilaporkan",
    bodyTemplate: "NCR Kritis {{ncrNumber}} dilaporkan di {{site}}.",
  },
  {
    eventType: "QUALITY_NCR_CRITICAL",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] NCR Kritis {{ncrNumber}}",
    bodyTemplate: "NCR Kritis {{ncrNumber}} dilaporkan di {{site}}. Segera tinjau containment & disposisi.",
  },
  {
    eventType: "QUALITY_NCR_CRITICAL",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: null,
    bodyTemplate: "NCR Kritis {{ncrNumber}} dilaporkan di {{site}}.",
  },
  {
    eventType: "QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "SLA respons komplain terlampaui",
    bodyTemplate: "Komplain {{complaintNumber}} belum direspon, SLA terlampaui.",
  },
  {
    eventType: "QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Komplain {{complaintNumber}} — SLA respons terlampaui",
    bodyTemplate: "Komplain {{complaintNumber}} belum direspon dan SLA respons awal sudah terlampaui. Segera hubungi pelanggan.",
  },
  {
    eventType: "QUALITY_INSPECTION_FAIL_AUTO_NCR",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Inspeksi FAIL — NCR dibuat otomatis",
    bodyTemplate: "Inspeksi {{inspectionNumber}} FAIL — NCR {{ncrNumber}} dibuat otomatis.",
  },
  {
    eventType: "QUALITY_SUPPLIER_RATING_DOWNGRADED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Rating supplier turun",
    bodyTemplate: "Supplier {{supplierName}} — rating {{rating}}.",
  },
  {
    eventType: "QUALITY_SUPPLIER_RATING_DOWNGRADED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Supplier {{supplierName}} — rating {{rating}}",
    bodyTemplate: "Supplier {{supplierName}} dievaluasi dengan rating {{rating}}. Tindak lanjut CAPA mungkin diperlukan.",
  },
  {
    eventType: "QUALITY_OBJECTIVE_AT_RISK",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Sasaran Mutu berisiko",
    bodyTemplate: "Sasaran Mutu {{objectiveTitle}} berisiko tidak tercapai.",
  },
  {
    eventType: "QUALITY_OBJECTIVE_AT_RISK",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Sasaran Mutu {{objectiveTitle}} berisiko",
    bodyTemplate: "Sasaran Mutu {{objectiveTitle}} berisiko tidak tercapai berdasarkan progress terbaru.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1-4.2.
export async function seedQualityNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedQualityNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Quality notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
