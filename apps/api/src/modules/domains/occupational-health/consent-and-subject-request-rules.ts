// BR-06 — "health_data_subject_requests.request_type = ERASURE_ANONYMIZATION
// diproses via anonymization... KECUALI retensi hukum minimum (§11) belum
// terlampaui — jika demikian, request ditolak sebagian dengan
// rejection_reason." Angka retensi PRD §11 SENDIRI belum final ("wajib
// dikonfirmasi ke regulasi terbaru/penasihat hukum tenant") — placeholder
// 5 tahun mengacu praktik rekam medis umum (Permenkes) yang PRD SEBUT sbg
// rujukan awal, BUKAN keputusan hukum final (gap README, TIDAK diadopsi
// otomatis sbg kepatuhan formal).
export const DEFAULT_MEDICAL_RECORD_MINIMUM_RETENTION_DAYS = 5 * 365;

export interface ErasureEligibilityInput {
  lastRecordActivityDate: Date;
  requestDate: Date;
  minimumRetentionDays?: number;
}

export interface ErasureEligibilityResult {
  eligible: boolean;
  rejectionReason?: string;
}

export function canProcessErasureRequest(input: ErasureEligibilityInput): ErasureEligibilityResult {
  const minimumRetentionDays = input.minimumRetentionDays ?? DEFAULT_MEDICAL_RECORD_MINIMUM_RETENTION_DAYS;
  const daysSinceLastActivity = Math.floor(
    (input.requestDate.getTime() - input.lastRecordActivityDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceLastActivity < minimumRetentionDays) {
    return {
      eligible: false,
      rejectionReason: `Retensi hukum minimum (${minimumRetentionDays} hari sejak aktivitas rekam medis terakhir) belum terlampaui.`,
    };
  }
  return { eligible: true };
}
