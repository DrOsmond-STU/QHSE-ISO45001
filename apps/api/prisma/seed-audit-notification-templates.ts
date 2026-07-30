// Task 4.1 (Modul 09 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-emergency-response-notification-templates.ts
// (3.7). HANYA 3 dari 7 baris PRD §8 di-seed — YANG GENUINELY py enqueue()
// call site di codebase ini: AUDITOR_COMPETENCY_EXPIRED/
// AUDITOR_COMPETENCY_EXPIRING_SOON (auditor-competency-expiry-scan.service.ts)
// dan AUDIT_FINDING_CLOSURE_DUE (audit-finding-closure-due-scan.service.ts).
// EMPAT baris SISA PRD §8 SENGAJA TIDAK di-seed — TIDAK ADA enqueue() call
// site: "Program audit menunggu approval"/"Laporan audit menunggu approval"
// (Workflow Engine 0.9 sendiri SUDAH membuat workflow_tasks utk approver,
// TIDAK ADA notification_templates terpisah dipanggil dari
// AuditProgramService.submitForApproval()/AuditReportService.submitForApproval(),
// pola sama alasan AuditProgramWorkflowCompletionListener TIDAK enqueue),
// "Audit ditugaskan" (AuditTeamMemberService.addMember() TIDAK emit
// notifikasi — scope task 4.1 tidak memintanya eksplisit), "Temuan Major NC
// dicatat" (AuditFindingService.create() HANYA emit AUDIT_FINDING_CAPA_REQUIRED_EVENT
// stub, BUKAN notification_templates — dua mekanisme BEDA, lihat banner
// comment AuditFindingService), "Audit ditutup" (AuditService.close() TIDAK
// emit notifikasi) — SEMUA gap TDD §26, bukan oversight tanpa alasan.
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
    eventType: "AUDITOR_COMPETENCY_EXPIRED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Sertifikasi auditor kedaluwarsa",
    bodyTemplate: "Sertifikasi {{standardScope}} Anda telah kedaluwarsa pada {{expiryDate}}.",
  },
  {
    eventType: "AUDITOR_COMPETENCY_EXPIRED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Sertifikasi auditor {{standardScope}} kedaluwarsa",
    bodyTemplate: "Sertifikasi {{standardScope}} Anda telah kedaluwarsa pada {{expiryDate}}. Segera perbarui rekam kompetensi Anda.",
  },
  {
    eventType: "AUDITOR_COMPETENCY_EXPIRING_SOON",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Sertifikasi auditor akan kedaluwarsa",
    bodyTemplate: "Sertifikasi {{standardScope}} Anda akan kedaluwarsa {{expiryDate}}.",
  },
  {
    eventType: "AUDITOR_COMPETENCY_EXPIRING_SOON",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Sertifikasi auditor {{standardScope}} akan kedaluwarsa",
    bodyTemplate: "Sertifikasi {{standardScope}} Anda akan kedaluwarsa pada {{expiryDate}}. Segera rencanakan perpanjangan.",
  },
  {
    eventType: "AUDIT_FINDING_CLOSURE_DUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Tenggat closure temuan audit mendekat",
    bodyTemplate: "Closure {{findingNumber}} pada audit {{auditNumber}} jatuh tempo {{targetClosureDate}}.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2/3.2/3.3/3.4/3.5/3.6/3.7.
export async function seedAuditNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedAuditNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Audit notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
