// Task 2.1 (Modul 03 §8) — notification_templates default SISTEM
// (tenantId=NULL) utk 5 dari 6 event PRD §8. NotificationService.enqueue()
// (0.11) WAJIB nemukan template IN_APP SEBELUM baris notifications bisa
// dibuat sama sekali (throw NotFoundException eksplisit kalau tidak ada) —
// TIDAK ADA seed script utk notification_templates sebelum task ini
// (0.11-1.7 hanya di-seed ad hoc di test) — DMS jadi KONSUMEN PRODUKSI
// PERTAMA yang genuinely butuh baris ini ada di luar test. EMAIL turut
// di-seed (bukan cuma IN_APP) — resolveAdditionalChannels() (0.11) BISA
// memasukkan EMAIL ke antrian kalau tenant+user mengaktifkannya (opt-in,
// default off — lihat preference-matrix.ts 1.7), dan resolveTemplate()
// (0.11) throw di TENGAH transaksi enqueue() kalau template channel itu
// tidak ada — akan membatalkan SELURUH notifikasi (termasuk baris IN_APP
// yang sudah dibuat) kalau user genuinely opt-in EMAIL tanpa template
// tersedia. WHATSAPP/TELEGRAM TIDAK di-seed (provider stub 0.11 SELALU
// throw "belum dikonfigurasi" apa pun isinya — gap yang SAMA berlaku
// modul manapun, bukan spesifik DMS, di luar timebox task ini).
//
// "Versi diajukan approval -> approver" (PRD §8 baris 1) DAN separuh
// "Versi disetujui -> submitter" (baris 2, hanya sisi REJECTED yang
// diwire — APPROVED tidak py notifikasi submitter terpisah, DOCUMENT_
// PUBLISHED ke target distribusi dianggap cukup) SENGAJA belum di-wire —
// gap TDD §26, pola konsisten seluruh task domain 1.1-1.7 (notifikasi
// selalu deprioritized dari business-rule inti).
//
// Jalankan CLI: pnpm --filter @qhse/api seed:dms-notification-templates
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
    eventType: "DOCUMENT_VERSION_REJECTED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Pengajuan dokumen ditolak",
    bodyTemplate: "Dokumen {{title}} pengajuan revisi Anda ditolak pada tahap approval. Silakan revisi dan ajukan ulang.",
  },
  {
    eventType: "DOCUMENT_VERSION_REJECTED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Dokumen {{title}} ditolak",
    bodyTemplate: "Dokumen {{title}} yang Anda ajukan ditolak pada tahap approval dan perlu direvisi.",
  },
  {
    eventType: "DOCUMENT_PUBLISHED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Dokumen baru wajib dibaca",
    bodyTemplate: "Dokumen baru wajib dibaca: {{title}} v{{version}}.",
  },
  {
    eventType: "DOCUMENT_PUBLISHED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Dokumen baru wajib dibaca: {{title}}",
    bodyTemplate: "Dokumen {{title}} versi {{version}} telah dipublikasikan dan wajib Anda baca & pahami.",
  },
  {
    eventType: "DOCUMENT_ACKNOWLEDGEMENT_OVERDUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Batas waktu pengakuan baca terlewati",
    bodyTemplate: "Anda belum mengakui membaca dokumen {{title}}, batas waktu telah terlewati.",
  },
  {
    eventType: "DOCUMENT_ACKNOWLEDGEMENT_OVERDUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Batas waktu pengakuan baca terlewati: {{title}}",
    bodyTemplate: "Anda belum mengakui membaca dokumen {{title}}. Batas waktu acknowledgement telah terlewati.",
  },
  {
    eventType: "DOCUMENT_REVIEW_DUE",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Dokumen perlu ditinjau",
    bodyTemplate: "Dokumen {{title}} perlu ditinjau sebelum {{scheduledReviewDate}}.",
  },
  {
    eventType: "DOCUMENT_REVIEW_DUE",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Dokumen {{title}} perlu ditinjau",
    bodyTemplate: "Dokumen {{title}} dijadwalkan untuk ditinjau sebelum {{scheduledReviewDate}}.",
  },
  {
    eventType: "DOCUMENT_RETIRED",
    channelCode: "IN_APP",
    language: "ID",
    subjectTemplate: "Dokumen tidak lagi berlaku",
    bodyTemplate: "Dokumen {{title}} tidak lagi berlaku. Alasan: {{reason}}.",
  },
  {
    eventType: "DOCUMENT_RETIRED",
    channelCode: "EMAIL",
    language: "ID",
    subjectTemplate: "[QHSE] Dokumen {{title}} tidak lagi berlaku",
    bodyTemplate: "Dokumen {{title}} telah ditarik dan tidak lagi berlaku. Alasan: {{reason}}.",
  },
];

// findFirst + create/update TERPISAH, BUKAN upsert() dgn compound unique
// key literal — tenantId NULL di @@unique([tenantId, eventType,
// channelCode, language]) tidak bisa dipakai upsert()/findUnique() (Prisma
// menolak `null` literal di compound key nullable), pola PERSIS
// DmsBootstrapService.ensureNumberingConfig() (task 2.1) &
// NotificationService.resolveTemplate() (0.11, findFirst bukan findUnique
// dgn alasan sama).
export async function seedDmsNotificationTemplates(prisma: PrismaClient): Promise<void> {
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
  await seedDmsNotificationTemplates(prisma);
  // eslint-disable-next-line no-console
  console.log(`DMS notification templates siap: ${TEMPLATES.length} baris.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
