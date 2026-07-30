// Task 3.5 (Modul 07 §8) — notification_templates default SISTEM
// (tenantId=NULL), pola PERSIS seed-work-permit-notification-templates.ts
// (3.3+3.4). HANYA 3 dari 8 event literal PRD §8 di-seed —
// INCIDENT_INVESTIGATION_APPROVED/RETURNED (RETURNED beyond literal, analog
// *_REJECTED modul lain) dipicu IncidentWorkflowCompletionListener,
// INCIDENT_REGULATORY_REPORT_OVERDUE dipicu IncidentRegulatoryReportOverdueScanService.
// LIMA baris SISA PRD §8 SENGAJA TIDAK di-seed: "Insiden baru dilaporkan"/
// "Insiden CRITICAL"/"Investigasi ditugaskan"/"SLA investigasi mendekati
// tenggat"/"Laporan investigasi menunggu approval"/"Lesson learned tersedia"
// TIDAK ADA hook pemicu di kode manapun task ini (create()/assignTeam()/
// submitForApproval() TIDAK enqueue apa pun) — gap didokumentasikan TDD §26,
// pola sama Work Permit 3.3+3.4.
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
    eventType: "INCIDENT_INVESTIGATION_APPROVED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Investigasi disetujui",
    bodyTemplate: "Laporan investigasi utk insiden {{incidentNumber}} telah disetujui.",
  },
  {
    eventType: "INCIDENT_INVESTIGATION_APPROVED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Investigasi insiden {{incidentNumber}} disetujui",
    bodyTemplate: "Laporan investigasi yang Anda ajukan utk insiden {{incidentNumber}} telah disetujui HSE Manager.",
  },
  {
    eventType: "INCIDENT_INVESTIGATION_RETURNED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Investigasi dikembalikan",
    bodyTemplate: "Laporan investigasi utk insiden {{incidentNumber}} dikembalikan, perlu direvisi.",
  },
  {
    eventType: "INCIDENT_INVESTIGATION_RETURNED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Investigasi insiden {{incidentNumber}} dikembalikan",
    bodyTemplate: "Laporan investigasi yang Anda ajukan utk insiden {{incidentNumber}} dikembalikan HSE Manager utk direvisi.",
  },
  {
    eventType: "INCIDENT_REGULATORY_REPORT_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Pelaporan regulator terlambat",
    bodyTemplate: "Pelaporan regulator utk insiden {{incidentNumber}} melewati tenggat (OVERDUE).",
  },
  {
    eventType: "INCIDENT_REGULATORY_REPORT_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Pelaporan regulator insiden {{incidentNumber}} OVERDUE",
    bodyTemplate: "Pelaporan regulator wajib utk insiden {{incidentNumber}} melewati tenggat (required_by_date) tanpa disubmit. Segera tindak lanjuti.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1/2.2/3.2/3.3/3.4.
export async function seedIncidentNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedIncidentNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Incident notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
