import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 2.1 — KONSUMEN SUNGGUHAN PERTAMA WORKFLOW_INSTANCE_COMPLETED_EVENT
 * (event ada sejak 0.9; banner comment aslinya menduga 0.11/1.4 yang akan
 * mendengarkannya — DIVERIFIKASI keduanya TIDAK PERNAH benar-benar
 * implementasi listener, grep bersih di seluruh src/ sebelum task ini).
 * Merealisasikan PRD §4.1 "Stage 3 Publikasi otomatis oleh sistem setelah
 * approve final" — BUKAN workflow_stages ketiga (WorkflowEngineService
 * mensyaratkan tiap stage py approver sungguhan, sistem tidak "approve"),
 * melainkan reaksi DOMAIN atas penyelesaian instance.
 *
 * KRITIS (diverifikasi EMPIRIS via probe manual, dihapus setelah dipakai):
 * TIDAK BOLEH re-query workflow_instances/workflow_tasks by instanceId di
 * sini — emit() dipanggil DI DALAM transaksi WorkflowEngineService SEBELUM
 * commit sungguhan (fire-and-forget, listener async TIDAK di-await), dan
 * listener dgn koneksi established (pola DI sungguhan) TERBUKTI melihat
 * state PRA-commit di 21/30 percobaan berulang — race NYATA. Payload event
 * (entityType/entityId/status) sudah cukup, TIDAK PERNAH baca ulang tabel
 * yang disentuh transaksi yang sedang emit. document_versions/documents
 * yang DIBACA/DITULIS listener ini AMAN — ditulis transaksi TERPISAH yang
 * SUDAH lama commit (submitForApproval(), request/waktu yang beda sama
 * sekali dari actOnTask() yang memicu event ini).
 *
 * tenantContextStorage.run() dipasang manual di sini (BUKAN via
 * TenantContextMiddleware — event listener bukan request HTTP) — payload
 * event.tenantId dipakai sbg context ambient satu-satunya cara
 * PrismaService.withRls() bisa jalan dari luar siklus request.
 */
export declare class DocumentWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private publishVersion;
    private rejectVersion;
}
