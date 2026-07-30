// Task 4.2 (Modul 10 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-audit-notification-templates.ts (4.1).
// HANYA 4 dari 7 baris PRD §8 di-seed — YANG GENUINELY py enqueue() call
// site di codebase ini: CAPA_ROOT_CAUSE_SLA_DUE (capa-root-cause-sla-scan.service.ts),
// CAPA_EFFECTIVENESS_VERIFICATION_DUE (capa-effectiveness-verification-due-scan.service.ts),
// CAPA_NOT_EFFECTIVE_REOPENED & CAPA_EFFECTIVE_CLOSED (keduanya dienqueue
// LANGSUNG dari CapaEffectivenessVerificationWorkflowCompletionListener saat
// outcome dihitung, bukan scan job — lihat banner comment listener itu).
// TIGA baris SISA PRD §8 SENGAJA TIDAK di-seed — TIDAK ADA enqueue() call
// site: "CAPA baru dibuat" (CapaRegisterService.create() TIDAK emit
// notifikasi — scope task 4.2 tidak memintanya eksplisit, pola sama
// AuditTeamMemberService.addMember() 4.1), "Action plan menunggu approval"
// (Workflow Engine 0.9 sendiri sudah membuat workflow_tasks utk approver,
// TIDAK ADA notification_templates terpisah dipanggil dari
// CapaActionPlanService.submitForApproval(), pola sama seluruh modul
// ber-workflow lain), "Seluruh action plan selesai — siap verifikasi
// efektivitas" (TIDAK ADA trigger otomatis genuinely — Modul 24 Action
// Tracking BELUM ADA, status_cache action plan diupdate MANUAL via
// updateStatusCache(), tidak ada listener yang tahu kapan SEMUA action
// plan baru saja selesai) — SEMUA gap TDD §26, bukan oversight tanpa
// alasan.
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
    eventType: "CAPA_ROOT_CAUSE_SLA_DUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Root cause CAPA belum lengkap",
    bodyTemplate: "Root cause CAPA {{capaNumber}} belum lengkap.",
  },
  {
    eventType: "CAPA_EFFECTIVENESS_VERIFICATION_DUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Verifikasi efektivitas CAPA jatuh tempo",
    bodyTemplate: "Verifikasi efektivitas CAPA {{capaNumber}} jatuh tempo {{verificationDueDate}}.",
  },
  {
    eventType: "CAPA_NOT_EFFECTIVE_REOPENED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "CAPA dibuka kembali — belum efektif",
    bodyTemplate: "CAPA {{capaNumber}} REOPENED — belum efektif.",
  },
  {
    eventType: "CAPA_NOT_EFFECTIVE_REOPENED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] CAPA {{capaNumber}} dibuka kembali — belum efektif",
    bodyTemplate: "CAPA {{capaNumber}} dinyatakan belum efektif dan dibuka kembali (REOPENED). Root cause analysis baru diperlukan.",
  },
  {
    eventType: "CAPA_EFFECTIVE_CLOSED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "CAPA ditutup — efektif",
    bodyTemplate: "CAPA {{capaNumber}} EFFECTIVE_CLOSED.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2/3.2-3.7/4.1.
export async function seedCapaNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedCapaNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`CAPA notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
