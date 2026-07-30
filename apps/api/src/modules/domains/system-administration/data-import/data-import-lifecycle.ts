import { DataImportJobStatus } from "@prisma/client";

export class DataImportLifecycleError extends Error {}

// TDD §20 — dua fase async terpisah (VALIDATING murni read-only, IMPORTING
// baru menulis) direpresentasikan sbg mesin status terpisah, pola sama
// validateUserStatusTransition (task 1.3). Terminal: COMPLETED/
// COMPLETED_WITH_ERRORS/FAILED — tidak ada transisi keluar dari situ (BR-03
// re-upload parsial adalah JOB BARU yang tertaut sourceDataImportJobId,
// bukan transisi status job lama).
const ALLOWED_TRANSITIONS: Record<DataImportJobStatus, ReadonlySet<DataImportJobStatus>> = {
  UPLOADED: new Set<DataImportJobStatus>(["VALIDATING"]),
  VALIDATING: new Set<DataImportJobStatus>(["VALIDATED", "FAILED"]),
  VALIDATED: new Set<DataImportJobStatus>(["IMPORTING"]),
  IMPORTING: new Set<DataImportJobStatus>(["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"]),
  COMPLETED: new Set<DataImportJobStatus>([]),
  COMPLETED_WITH_ERRORS: new Set<DataImportJobStatus>([]),
  FAILED: new Set<DataImportJobStatus>([]),
};

export function validateDataImportJobStatusTransition(from: DataImportJobStatus, to: DataImportJobStatus): void {
  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new DataImportLifecycleError(`Transisi status data_import_job dari ${from} ke ${to} tidak diizinkan.`);
  }
}

// BR-03 (PRD Modul 31 §6) — "COMPLETED_WITH_ERRORS wajib tetap menyimpan
// baris error agar dapat diperbaiki & re-import parsial". Acceptance
// TASK_INSTRUCTION.md 1.6 memperluasnya scr implisit ke FAILED juga (job
// yang gagal total di level file, mis. attachment INFECTED, WAJIB bisa
// diulang dgn file baru) — job yang masih berjalan (belum terminal) ATAU
// yang sukses total (COMPLETED, tidak ada yang perlu diperbaiki) BUKAN
// kandidat retry.
const RETRYABLE_STATUSES = new Set<DataImportJobStatus>(["COMPLETED_WITH_ERRORS", "FAILED"]);

export function assertDataImportJobIsRetryable(status: DataImportJobStatus): void {
  if (!RETRYABLE_STATUSES.has(status)) {
    throw new DataImportLifecycleError(
      `BR-03: re-upload parsial hanya diizinkan dari job berstatus COMPLETED_WITH_ERRORS atau FAILED (job sumber ini: ${status}).`,
    );
  }
}
