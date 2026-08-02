"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImportLifecycleError = void 0;
exports.validateDataImportJobStatusTransition = validateDataImportJobStatusTransition;
exports.assertDataImportJobIsRetryable = assertDataImportJobIsRetryable;
class DataImportLifecycleError extends Error {
}
exports.DataImportLifecycleError = DataImportLifecycleError;
// TDD §20 — dua fase async terpisah (VALIDATING murni read-only, IMPORTING
// baru menulis) direpresentasikan sbg mesin status terpisah, pola sama
// validateUserStatusTransition (task 1.3). Terminal: COMPLETED/
// COMPLETED_WITH_ERRORS/FAILED — tidak ada transisi keluar dari situ (BR-03
// re-upload parsial adalah JOB BARU yang tertaut sourceDataImportJobId,
// bukan transisi status job lama).
const ALLOWED_TRANSITIONS = {
    UPLOADED: new Set(["VALIDATING"]),
    VALIDATING: new Set(["VALIDATED", "FAILED"]),
    VALIDATED: new Set(["IMPORTING"]),
    IMPORTING: new Set(["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"]),
    COMPLETED: new Set([]),
    COMPLETED_WITH_ERRORS: new Set([]),
    FAILED: new Set([]),
};
function validateDataImportJobStatusTransition(from, to) {
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
const RETRYABLE_STATUSES = new Set(["COMPLETED_WITH_ERRORS", "FAILED"]);
function assertDataImportJobIsRetryable(status) {
    if (!RETRYABLE_STATUSES.has(status)) {
        throw new DataImportLifecycleError(`BR-03: re-upload parsial hanya diizinkan dari job berstatus COMPLETED_WITH_ERRORS atau FAILED (job sumber ini: ${status}).`);
    }
}
