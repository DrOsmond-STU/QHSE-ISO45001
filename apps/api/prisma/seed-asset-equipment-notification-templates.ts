// Task 6.1 (Modul 15 §8 + BR-02 prose) — notification_templates default
// SISTEM (tenantId=NULL), pola PERSIS seed-environmental-notification-templates.ts
// (5.2). 4 event type: 3 baris literal PRD §8 (maintenance due H-7,
// maintenance overdue, aset kritis-K3 OUT_OF_SERVICE) + 1 event BEYOND
// tabel §8 literal tapi eksplisit diminta prosa BR-02 ("perubahan
// is_safety_critical dari false->true memicu notifikasi ke HSE Manager
// utk review") — PRD §8 sendiri TIDAK mencantumkan baris ini di tabel,
// jadi HANYA IN_APP (channel tidak ditentukan PRD sama sekali utk event
// ini, beda 3 lainnya yang eksplisit sebut channel), gap TDD §26.
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
    eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Maintenance aset jatuh tempo",
    bodyTemplate: "Maintenance {{assetName}} jatuh tempo {{dueDate}}.",
  },
  {
    eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Maintenance {{assetName}} jatuh tempo {{dueDate}}",
    bodyTemplate: "Maintenance {{assetName}} ({{assetCode}}) jatuh tempo {{dueDate}} (H-7). Segera jadwalkan pelaksanaan.",
  },
  {
    eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: null,
    bodyTemplate: "Maintenance {{assetName}} jatuh tempo {{dueDate}}.",
  },
  {
    eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Maintenance aset TERLAMBAT",
    bodyTemplate: "Maintenance {{assetName}} TERLAMBAT {{daysOverdue}} hari.",
  },
  {
    eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: null,
    bodyTemplate: "Maintenance {{assetName}} TERLAMBAT {{daysOverdue}} hari.",
  },
  {
    eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "PERINGATAN: aset kritis-K3 tidak berfungsi",
    bodyTemplate: "PERINGATAN: {{assetName}} ({{assetCode}}, kritis-K3) tidak berfungsi.",
  },
  {
    eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE",
    channelCode: "WHATSAPP",
    language: "ID",
    subjectTemplate: null,
    bodyTemplate: "PERINGATAN: {{assetName}} (kritis-K3) tidak berfungsi.",
  },
  {
    eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_FLAGGED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Aset ditandai kritis-keselamatan",
    bodyTemplate: "{{assetName}} ({{assetCode}}) ditandai kritis-keselamatan — tinjau keperluan kalibrasi/inspeksi tambahan.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() — pola PERSIS 2.1-5.3.
export async function seedAssetEquipmentNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedAssetEquipmentNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`Asset Equipment notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
