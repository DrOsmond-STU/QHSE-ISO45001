/**
 * Payload job BullMQ `data-import` (dua job name: validate & commit,
 * SATU queue — lihat data-import.constants.ts). `tenantId` eksplisit
 * (bukan ambient) krn worker (apps/worker, proses terpisah) tidak punya
 * HTTP request yang mengisi AsyncLocalStorage — pola sama
 * AttachmentScanJobPayload (0.12) / NotificationDeliveryJobPayload (0.11).
 */
export interface DataImportJobPayload {
  tenantId: string;
  dataImportJobId: string;
}
