"use strict";
// Pure logic — mirror review-schedule-scan.ts (2.1)/workflow-sla-scan.ts (0.9)
// pattern: caller (LicenseExpiryScanService) baca kandidat dari DB, panggil
// fungsi ini, lalu caller yang tulis hasilnya. Tidak ada Prisma/BullMQ di
// sini sama sekali.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLicensesEnteringExpiringSoon = findLicensesEnteringExpiringSoon;
exports.findExpiredLicenses = findExpiredLicenses;
exports.findLicenseExpiryReminderTiers = findLicenseExpiryReminderTiers;
const EXPIRY_REMINDER_TIERS = [90, 30, 7];
function daysBetween(a, b) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}
/**
 * BR-01 (PRD §6) — "licenses_permits.expiry_date - CURRENT_DATE <=
 * renewal_lead_time_days → job terjadwal otomatis set status =
 * EXPIRING_SOON". Hanya izin yang MASIH ACTIVE yang bisa masuk
 * EXPIRING_SOON (izin yang sudah EXPIRED/REVOKED/IN_RENEWAL_PROCESS/
 * EXPIRING_SOON sendiri tidak dievaluasi ulang di sini — idempotency
 * natural via status, pola sama findOverdueTasks() 0.9). Jendela `<=`
 * (bukan `===`) supaya job harian yang absen tetap "mengejar".
 */
function findLicensesEnteringExpiringSoon(candidates, now) {
    return candidates.filter((c) => {
        if (c.status !== "ACTIVE")
            return false;
        if (c.expiryDate === null)
            return false;
        return daysBetween(c.expiryDate, now) <= c.renewalLeadTimeDays;
    });
}
/**
 * BR-02 (PRD §6) — "expiry_date < CURRENT_DATE → otomatis status =
 * EXPIRED". Berlaku utk ACTIVE/EXPIRING_SOON/IN_RENEWAL_PROCESS (izin yang
 * masih dlm proses perpanjangan TAPI kedaluwarsa sebelum izin baru terbit
 * tetap harus EXPIRED — PRD §4.3 poin 4 "Jika expiry_date terlewati tanpa
 * perpanjangan"). EXPIRED/REVOKED dikecualikan (sudah terminal/idempotent).
 */
function findExpiredLicenses(candidates, now) {
    return candidates.filter((c) => {
        if (c.status === "EXPIRED" || c.status === "REVOKED")
            return false;
        if (c.expiryDate === null)
            return false;
        return daysBetween(now, c.expiryDate) > 0;
    });
}
/**
 * PRD §4.3 poin 1 / §8 — notifikasi BERTINGKAT H-90/H-30/H-7, independen
 * dari renewal_lead_time_days per-license (3 checkpoint TETAP). Masing-
 * masing tier py kolom idempotency SENDIRI (expiryReminder{90,30,7}SentAt)
 * krn ketiganya adalah trigger satu-kali yang TERPISAH, bukan satu
 * reminder tunggal spt DMS review schedule — kalau job absen beberapa hari
 * (mis. lead time 90 tapi expiry tinggal 5 hari saat job pertama jalan),
 * SEMUA tier yang terlewati boleh menyusul kirim hari yang sama (catch-up,
 * bukan skip). Izin EXPIRED/REVOKED dikecualikan — sudah py notifikasi
 * eskalasi terpisah (BR-02), bukan lagi reminder pra-kedaluwarsa.
 */
function findLicenseExpiryReminderTiers(candidates, now) {
    const due = [];
    for (const c of candidates) {
        if (c.status === "EXPIRED" || c.status === "REVOKED")
            continue;
        if (c.expiryDate === null)
            continue;
        const daysUntilExpiry = daysBetween(c.expiryDate, now);
        if (daysUntilExpiry <= 90 && c.expiryReminder90SentAt === null)
            due.push({ licenseId: c.licenseId, tier: 90 });
        if (daysUntilExpiry <= 30 && c.expiryReminder30SentAt === null)
            due.push({ licenseId: c.licenseId, tier: 30 });
        if (daysUntilExpiry <= 7 && c.expiryReminder7SentAt === null)
            due.push({ licenseId: c.licenseId, tier: 7 });
    }
    return due;
}
//# sourceMappingURL=license-expiry-scan.js.map