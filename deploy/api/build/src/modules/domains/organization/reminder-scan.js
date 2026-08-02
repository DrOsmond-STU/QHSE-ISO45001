"use strict";
// Pure logic — mirror workflow-sla-scan.ts (0.9): caller (ReminderScanService)
// baca kandidat dari DB, panggil fungsi ini, caller yang tulis hasilnya.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOverdueSites = findOverdueSites;
/**
 * PRD Modul 01 §6 BR-06 — "sites dengan auto_archive_on_end_date=TRUE dan
 * site_type=PROJECT otomatis dipindah ke status INACTIVE (menunggu
 * konfirmasi arsip manual) oleh scheduled job saat end_date terlewati,
 * BUKAN langsung ARCHIVED." Filter siteType/status/autoArchiveOnEndDate
 * SUDAH dilakukan di query DB (ReminderScanService) — fungsi ini cuma
 * bandingkan tanggal, natural-key idempotency otomatis (site yang SUDAH
 * INACTIVE tidak lagi masuk kandidat query berikutnya, sama pola
 * escalatedAt di workflow-sla-scan).
 */
function findOverdueSites(candidates, now) {
    return candidates.filter((c) => c.endDate.getTime() < now.getTime());
}
