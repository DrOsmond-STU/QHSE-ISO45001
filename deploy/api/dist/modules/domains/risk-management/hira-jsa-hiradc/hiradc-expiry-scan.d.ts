export type HiradcExpiryScanStatus = "DRAFT" | "VERIFIED" | "APPROVED" | "EXPIRED";
export interface HiradcExpiryCandidate {
    hiradcId: string;
    validUntil: Date | null;
    status: HiradcExpiryScanStatus;
}
/**
 * BR-04 (PRD Modul 05 §6) — "hiradc_records.valid_until wajib diisi utk
 * pekerjaan non-rutin; sistem otomatis mengubah status -> EXPIRED setelah
 * waktu tersebut terlewati (job terjadwal)." TIDAK ada tier notifikasi
 * (beda dari licenses_permits H-90/30/7, 2.2) — PRD §8 modul ini tidak
 * menyebut reminder H-sekian utk HIRADC, hanya auto-expire itu sendiri.
 * EXPIRED sendiri dikecualikan (idempotent, sudah terminal).
 */
export declare function findExpiredHiradcRecords(candidates: HiradcExpiryCandidate[], now: Date): HiradcExpiryCandidate[];
