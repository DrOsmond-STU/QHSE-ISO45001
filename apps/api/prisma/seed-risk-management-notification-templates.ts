// Task 3.2 (Modul 05 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-dms-notification-templates.ts (2.1)/
// seed-regulatory-compliance-notification-templates.ts (2.2).
//
// 5 eventType: 3 dari PRD §8 literal (HIRA_REVIEW_DUE/RISK_REGISTER_REVIEW_OVERDUE/
// RISK_TREATMENT_PLAN_OVERDUE) + 3 BEYOND literal analog *_REJECTED (DMS
// 2.1 DOCUMENT_VERSION_REJECTED) utk HIRA/JSA/HIRADC — notifikasi
// operasional wajar begitu masing2 WorkflowCompletionListener
// mengembalikan entitas ke status revisi/DRAFT, gap TDD §26 dicatat sbg
// penambahan. PRD §8 baris 1 ("HIRA/JSA/HIRADC diajukan approval ->
// approver") DAN baris 5 ("insiden baru terkait HIRA", butuh Modul 07
// yang belum ada) SENGAJA TIDAK di-seed — pola konsisten 1.1-3.1
// (notifikasi task-baru selalu deprioritized, gap TDD §26 sejak #73 2.1).
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
    eventType: "HIRA_REQUIRES_REVISION",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "HIRA memerlukan revisi",
    bodyTemplate: "HIRA {{hiraNumber}} ditolak pada tahap review dan memerlukan revisi. Silakan perbaiki dan ajukan ulang.",
  },
  {
    eventType: "HIRA_REQUIRES_REVISION",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] HIRA {{hiraNumber}} memerlukan revisi",
    bodyTemplate: "HIRA {{hiraNumber}} ditolak pada tahap review dan memerlukan revisi sebelum dapat diajukan ulang.",
  },
  {
    eventType: "JSA_REJECTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "JSA ditolak",
    bodyTemplate: "JSA {{jsaNumber}} ditolak pada tahap review. Silakan revisi dan ajukan ulang.",
  },
  {
    eventType: "JSA_REJECTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] JSA {{jsaNumber}} ditolak",
    bodyTemplate: "JSA {{jsaNumber}} yang Anda ajukan ditolak pada tahap review dan perlu direvisi.",
  },
  {
    eventType: "HIRADC_REJECTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "HIRADC ditolak",
    bodyTemplate: "HIRADC {{hiradcNumber}} ditolak pada tahap verifikasi. Silakan revisi dan ajukan ulang.",
  },
  {
    eventType: "HIRADC_REJECTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] HIRADC {{hiradcNumber}} ditolak",
    bodyTemplate: "HIRADC {{hiradcNumber}} yang Anda ajukan ditolak pada tahap verifikasi dan perlu direvisi.",
  },
  {
    eventType: "HIRA_REVIEW_DUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "HIRA perlu ditinjau",
    bodyTemplate: "HIRA {{hiraNumber}} perlu ditinjau sebelum {{reviewDueDate}}.",
  },
  {
    eventType: "HIRA_REVIEW_DUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] HIRA {{hiraNumber}} perlu ditinjau",
    bodyTemplate: "HIRA {{hiraNumber}} dijadwalkan untuk ditinjau sebelum {{reviewDueDate}}.",
  },
  {
    eventType: "RISK_REGISTER_REVIEW_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Risiko korporat belum ditinjau",
    bodyTemplate: "Risiko korporat {{riskTitle}} belum ditinjau melewati jadwal.",
  },
  {
    eventType: "RISK_REGISTER_REVIEW_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Risiko korporat {{riskTitle}} lewat jadwal tinjauan",
    bodyTemplate: "Risiko korporat {{riskTitle}} belum ditinjau dan telah melewati jadwal tinjauan berkala.",
  },
  {
    eventType: "RISK_TREATMENT_PLAN_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Rencana penanganan risiko lewat target",
    bodyTemplate: "Rencana penanganan risiko {{treatmentDescription}} melewati target penyelesaian.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2
// (tenantId NULL di compound unique key nullable tidak bisa dipakai
// upsert()/findUnique()).
export async function seedRiskManagementNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedRiskManagementNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Risk-management notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
