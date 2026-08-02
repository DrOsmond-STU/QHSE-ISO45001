/**
 * Payload job BullMQ `attachment-scan`. `tenantId` eksplisit (bukan
 * ambient) karena worker (apps/worker, proses terpisah) tidak punya HTTP
 * request yang mengisi AsyncLocalStorage — pola sama
 * NotificationDeliveryJobPayload (task 0.11).
 */
export interface AttachmentScanJobPayload {
    tenantId: string;
    attachmentId: string;
    storageKey: string;
    mimeType: string;
}
