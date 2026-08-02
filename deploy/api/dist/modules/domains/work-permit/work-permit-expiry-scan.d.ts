export type WorkPermitExpiryScanStatus = "ACTIVE" | "EXTENSION_REQUESTED";
export interface WorkPermitExpiryCandidate {
    workPermitId: string;
    plannedEndDatetime: Date;
    status: WorkPermitExpiryScanStatus;
}
/**
 * BR-07 (PRD Modul 06 §6), bagian scan — "permit yang melewati batas
 * waktu tanpa extension disetujui otomatis berstatus EXPIRED dan
 * dieskalasi." Kandidat mencakup ACTIVE MAUPUN EXTENSION_REQUESTED
 * (caller sudah query keduanya) — "tanpa extension DISETUJUI" dibaca
 * literal: permit yang masih EXTENSION_REQUESTED (extension SEDANG
 * diajukan, BELUM disetujui) TETAP kena expire kalau planned_end_datetime
 * SUDAH terlampaui sebelum keputusan extension turun; begitu extension
 * genuinely APPROVED, planned_end_datetime permit itu sendiri sudah
 * diperbarui (WorkPermitExtensionWorkflowCompletionListener) sehingga
 * TIDAK LAGI match filter ini pada scan berikutnya.
 */
export declare function findExpiredWorkPermits(candidates: WorkPermitExpiryCandidate[], now: Date): WorkPermitExpiryCandidate[];
