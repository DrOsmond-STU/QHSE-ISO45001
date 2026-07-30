// Pure — BR-02 (PRD Modul 31 §6): "usage_counters.current_value melebihi
// subscription_plans.max_users/max_sites TIDAK memblokir operasional
// berjalan, tetapi memicu notifikasi." Fungsi ini cuma MENDETEKSI
// pelanggaran kuota; caller (UsageCounterScanService) yang memutuskan apa
// yang dilakukan dengan hasilnya (log/notifikasi — notifikasi SENGAJA
// belum di-wire, gap TDD §26).

export interface QuotaCheckInput {
  metricType: "ACTIVE_USERS" | "ACTIVE_SITES";
  currentValue: number;
  maxValue: number | null;
}

export interface QuotaCheckResult extends QuotaCheckInput {
  exceeded: boolean;
}

/** maxValue NULL = unlimited (PRD literal "NULL = unlimited") — tidak
 * pernah exceeded. */
export function checkQuota(input: QuotaCheckInput): QuotaCheckResult {
  return { ...input, exceeded: input.maxValue !== null && input.currentValue > input.maxValue };
}
