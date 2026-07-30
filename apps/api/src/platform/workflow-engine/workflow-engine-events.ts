import { WorkflowEscalationAction, WorkflowInstanceStatus } from "@prisma/client";

// In-process EventEmitter2 (TDD §3.2), mirror rbac-events.ts. Belum ada
// subscriber di 0.9 — task 0.11 (notifikasi) dan 1.4 (delegasi) yang nanti
// dengar event ini. Aman di-emit ke "void" sekarang.

export interface WorkflowTaskEscalatedEvent {
  taskId: string;
  instanceId: string;
  tenantId: string;
  action: WorkflowEscalationAction;
  reassignedToRoleId: string | null;
}

export interface WorkflowInstanceCompletedEvent {
  instanceId: string;
  tenantId: string;
  status: WorkflowInstanceStatus;
  // Task 2.1 (DMS) — ditambah BEYOND bentuk asli 0.9. Listener yang bereaksi
  // ke event ini TIDAK BOLEH re-query workflow_instances by instanceId
  // begitu event diterima — diverifikasi EMPIRIS (probe manual, dihapus
  // setelah dipakai) bahwa emit() dipanggil DI DALAM $transaction SEBELUM
  // COMMIT sungguhan terjadi (fire-and-forget, listener async TIDAK
  // di-await pemanggilnya): listener dgn koneksi Prisma yang SUDAH
  // established (pola DI NestJS sungguhan, bukan koneksi baru per event)
  // melihat state PRA-commit ("BEFORE") di 21 dari 30 percobaan berulang —
  // race condition NYATA, bukan spekulasi. entityType/entityId (SUDAH ada
  // di memory `instance` yang dibaca evaluateTransitionInTx() SEBELUM emit,
  // TIDAK butuh query tambahan) disertakan LANGSUNG di payload supaya
  // listener manapun bisa bertindak tanpa re-read row yang baru saja
  // disentuh transaksi yang sedang emit — field lain (mis. document_versions
  // status) yang dibaca listener AMAN krn ditulis transaksi TERPISAH yang
  // SUDAH lama commit (mis. submitForApproval(), bukan transaksi yang
  // sedang berjalan saat ini).
  entityType: string;
  entityId: string;
}
