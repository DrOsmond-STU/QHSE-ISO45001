// Pure logic — mirror hiradc-expiry-scan.ts (3.2) style: caller (scan
// service) query kandidat dari DB, panggil fungsi ini, caller tulis
// hasilnya.

export interface GasRetestScanCandidate {
  workPermitId: string;
  /** retest_due_at baris gas_test_results TERBARU (by test_datetime) utk
   * permit ini, atau NULL kalau belum pernah ada gas test sama sekali. */
  latestRetestDueAt: Date | null;
}

/**
 * BR-05 (PRD Modul 06 §6) — "Untuk tipe dengan gas_retest_interval_hours
 * terisi, sistem mewajibkan gas_test_results baru setiap interval selama
 * status ACTIVE; jika terlewati, sistem otomatis mengubah status menjadi
 * SUSPENDED dan mengeskalasi notifikasi ke HSE." Caller bertanggung jawab
 * menyaring kandidat ke permit ACTIVE dari tipe dgn gas_retest_interval_hours
 * terisi SEBELUM memanggil fungsi ini (query SQL) — fungsi ini murni
 * membandingkan retest_due_at TERSIMPAN (diisi GasTestResultService.record()
 * dari gasRetestIntervalHours saat gas test terakhir direkam) terhadap
 * waktu sekarang.
 */
export function findPermitsOverdueForGasRetest(candidates: GasRetestScanCandidate[], now: Date): GasRetestScanCandidate[] {
  return candidates.filter((c) => c.latestRetestDueAt !== null && c.latestRetestDueAt.getTime() < now.getTime());
}
