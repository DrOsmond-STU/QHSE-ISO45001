// Task 3.3+3.4 (Modul 06 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-risk-management-notification-templates.ts
// (3.2)/seed-regulatory-compliance-notification-templates.ts (2.2).
//
// Task 3.3: WORK_PERMIT_APPROVED (PRD §8 literal "Permit disetujui
// penuh") + WORK_PERMIT_REJECTED (BEYOND literal, analog *_REJECTED
// modul lain).
// Task 3.4: WORK_PERMIT_EXTENSION_APPROVED/WORK_PERMIT_EXTENSION_REJECTED
// (BEYOND literal, analog pola sama), WORK_PERMIT_CLOSED (PRD §8 literal
// "Permit ditutup"), WORK_PERMIT_EXPIRED (PRD §8 literal "Permit expired
// tanpa closure"), WORK_PERMIT_GAS_RETEST_OVERDUE (PRD §8 literal "Gas
// retest terlewat").
// PRD §8 baris SISA (disubmit->Issuer, HSE approval needed, closure
// diajukan->Issuer, gas retest H-30menit) SENGAJA TIDAK di-seed — baris
// "disubmit"/"HSE approval needed"/"closure diajukan" butuh hook
// per-stage-advance/resolusi-approver-tanpa-workflow yang TIDAK ADA di
// codebase ini (gap TDD §26 lintas-modul, bukan spesifik task ini); gas
// retest H-30menit butuh kolom idempotency tracking terpisah yang belum
// ada di skema literal Modul 06 §5 (gap TDD §26).
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
    eventType: "WORK_PERMIT_APPROVED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Permit disetujui",
    bodyTemplate: "Permit {{permitNumber}} disetujui, siap diaktifkan.",
  },
  {
    eventType: "WORK_PERMIT_APPROVED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Permit {{permitNumber}} disetujui",
    bodyTemplate: "Permit {{permitNumber}} yang Anda ajukan telah disetujui penuh dan siap diaktifkan.",
  },
  {
    eventType: "WORK_PERMIT_REJECTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Permit ditolak",
    bodyTemplate: "Permit {{permitNumber}} ditolak pada tahap approval. Silakan tinjau dan ajukan permit baru.",
  },
  {
    eventType: "WORK_PERMIT_REJECTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Permit {{permitNumber}} ditolak",
    bodyTemplate: "Permit {{permitNumber}} yang Anda ajukan ditolak pada tahap approval.",
  },
  {
    eventType: "WORK_PERMIT_EXTENSION_APPROVED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Perpanjangan permit disetujui",
    bodyTemplate: "Pengajuan perpanjangan permit {{permitNumber}} disetujui.",
  },
  {
    eventType: "WORK_PERMIT_EXTENSION_APPROVED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Perpanjangan permit {{permitNumber}} disetujui",
    bodyTemplate: "Pengajuan perpanjangan waktu kerja utk permit {{permitNumber}} telah disetujui.",
  },
  {
    eventType: "WORK_PERMIT_EXTENSION_REJECTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Perpanjangan permit ditolak",
    bodyTemplate: "Pengajuan perpanjangan permit {{permitNumber}} ditolak.",
  },
  {
    eventType: "WORK_PERMIT_EXTENSION_REJECTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Perpanjangan permit {{permitNumber}} ditolak",
    bodyTemplate: "Pengajuan perpanjangan waktu kerja utk permit {{permitNumber}} ditolak.",
  },
  {
    eventType: "WORK_PERMIT_CLOSED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Permit ditutup",
    bodyTemplate: "Permit {{permitNumber}} telah CLOSED.",
  },
  {
    eventType: "WORK_PERMIT_CLOSED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Permit {{permitNumber}} ditutup",
    bodyTemplate: "Permit {{permitNumber}} telah diverifikasi dan resmi CLOSED.",
  },
  {
    eventType: "WORK_PERMIT_EXPIRED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Permit EXPIRED tanpa penutupan",
    bodyTemplate: "Permit {{permitNumber}} EXPIRED tanpa penutupan.",
  },
  {
    eventType: "WORK_PERMIT_EXPIRED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Permit {{permitNumber}} EXPIRED",
    bodyTemplate: "Permit {{permitNumber}} melewati batas waktu tanpa extension disetujui maupun closure — status otomatis EXPIRED.",
  },
  {
    eventType: "WORK_PERMIT_GAS_RETEST_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Permit SUSPENDED — retest gas terlewat",
    bodyTemplate: "Permit {{permitNumber}} otomatis SUSPENDED — retest gas terlewat.",
  },
  {
    eventType: "WORK_PERMIT_GAS_RETEST_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Permit {{permitNumber}} SUSPENDED",
    bodyTemplate: "Permit {{permitNumber}} otomatis SUSPENDED krn jadwal retest gas berkala terlewat. Segera lakukan retest utk melanjutkan pekerjaan.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2/3.2
// (tenantId NULL di compound unique key nullable tidak bisa dipakai
// upsert()/findUnique()).
export async function seedWorkPermitNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedWorkPermitNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Work-permit notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
