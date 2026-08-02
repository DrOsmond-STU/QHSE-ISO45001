"use strict";
// Pure logic — mirror license-expiry-scan.ts (2.2)/review-schedule-scan.ts
// (2.1) style: caller (HiradcExpiryScanService) baca kandidat dari DB,
// panggil fungsi ini, caller yang tulis hasilnya.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findExpiredHiradcRecords = findExpiredHiradcRecords;
/**
 * BR-04 (PRD Modul 05 §6) — "hiradc_records.valid_until wajib diisi utk
 * pekerjaan non-rutin; sistem otomatis mengubah status -> EXPIRED setelah
 * waktu tersebut terlewati (job terjadwal)." TIDAK ada tier notifikasi
 * (beda dari licenses_permits H-90/30/7, 2.2) — PRD §8 modul ini tidak
 * menyebut reminder H-sekian utk HIRADC, hanya auto-expire itu sendiri.
 * EXPIRED sendiri dikecualikan (idempotent, sudah terminal).
 */
function findExpiredHiradcRecords(candidates, now) {
    return candidates.filter((c) => {
        if (c.status === "EXPIRED")
            return false;
        if (c.validUntil === null)
            return false;
        return c.validUntil.getTime() < now.getTime();
    });
}
