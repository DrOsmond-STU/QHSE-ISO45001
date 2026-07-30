import { NotificationChannelCode } from "@prisma/client";

/**
 * Payload job BullMQ `notification-queue`. Rendering (Handlebars, TDD §10)
 * SUDAH SELESAI sebelum job ini dibuat (NotificationService.enqueue(),
 * proses sinkron di apps/api) — worker (proses terpisah, apps/worker) TIDAK
 * perlu resolusi template/DB tenant tambahan untuk merender, cuma memanggil
 * provider adapter dengan `body`/`subject` yang sudah jadi. `tenantId`
 * eksplisit di payload (BUKAN ambient) karena worker proses terpisah, tidak
 * ada HTTP request yang mengisi AsyncLocalStorage — pola sama
 * workflow-sla-scan.service.ts men-set tenantContextStorage manual per
 * tenant yang ditemukan.
 */
export interface NotificationDeliveryJobPayload {
  tenantId: string;
  notificationLogId: string;
  channelCode: Extract<NotificationChannelCode, "EMAIL" | "WHATSAPP" | "TELEGRAM">;
  /** Email address (channel EMAIL) atau nomor WA/chat ID Telegram. BELUM
   * ada sumber data kontak WA/Telegram di Phase 0 (`users.phone_number`
   * dst. menyusul task 1.3 Modul 02) — untuk channel itu diisi string
   * kosong; stub provider (task 0.11) throw utk kedua channel itu terlepas
   * dari isi field ini, jadi tidak mempengaruhi perilaku yang teramati. */
  recipientAddress: string;
  subject?: string;
  body: string;
}
