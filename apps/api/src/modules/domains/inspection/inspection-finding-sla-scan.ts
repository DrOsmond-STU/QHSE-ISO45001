// BR-04 (PRD Modul 08 §6) — "inspection_findings dengan severity=HIGH wajib
// memiliki action_tracking_id terisi dalam SLA 24 jam sejak identified_at,
// atau sistem mengeskalasi notifikasi ke HSE Manager." Caller bertanggung
// jawab menyaring kandidat ke severity=HIGH AND action_tracking_id IS NULL
// SEBELUM memanggil fungsi ini (query SQL) — fungsi ini murni membandingkan
// identified_at terhadap waktu sekarang.
export const HIGH_SEVERITY_FINDING_SLA_HOURS = 24;

export interface FindingSlaCandidate {
  findingId: string;
  identifiedAt: Date;
}

export function findHighSeverityFindingsNeedingEscalation(candidates: FindingSlaCandidate[], now: Date): FindingSlaCandidate[] {
  const cutoff = now.getTime() - HIGH_SEVERITY_FINDING_SLA_HOURS * 60 * 60 * 1000;
  return candidates.filter((c) => c.identifiedAt.getTime() < cutoff);
}
