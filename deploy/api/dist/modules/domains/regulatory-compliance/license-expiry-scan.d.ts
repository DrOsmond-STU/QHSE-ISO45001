declare const EXPIRY_REMINDER_TIERS: readonly [90, 30, 7];
export type ExpiryReminderTier = (typeof EXPIRY_REMINDER_TIERS)[number];
export type LicenseExpiryScanStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED" | "IN_RENEWAL_PROCESS";
export interface LicenseExpiryCandidate {
    licenseId: string;
    expiryDate: Date | null;
    renewalLeadTimeDays: number;
    status: LicenseExpiryScanStatus;
    expiryReminder90SentAt: Date | null;
    expiryReminder30SentAt: Date | null;
    expiryReminder7SentAt: Date | null;
}
export interface LicenseExpiryReminderDue {
    licenseId: string;
    tier: ExpiryReminderTier;
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
export declare function findLicensesEnteringExpiringSoon(candidates: LicenseExpiryCandidate[], now: Date): LicenseExpiryCandidate[];
/**
 * BR-02 (PRD §6) — "expiry_date < CURRENT_DATE → otomatis status =
 * EXPIRED". Berlaku utk ACTIVE/EXPIRING_SOON/IN_RENEWAL_PROCESS (izin yang
 * masih dlm proses perpanjangan TAPI kedaluwarsa sebelum izin baru terbit
 * tetap harus EXPIRED — PRD §4.3 poin 4 "Jika expiry_date terlewati tanpa
 * perpanjangan"). EXPIRED/REVOKED dikecualikan (sudah terminal/idempotent).
 */
export declare function findExpiredLicenses(candidates: LicenseExpiryCandidate[], now: Date): LicenseExpiryCandidate[];
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
export declare function findLicenseExpiryReminderTiers(candidates: LicenseExpiryCandidate[], now: Date): LicenseExpiryReminderDue[];
export {};
