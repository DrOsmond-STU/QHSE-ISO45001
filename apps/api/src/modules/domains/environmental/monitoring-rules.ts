import { EnvComplianceStatus, EnvMonitoringRecordStatus } from "@prisma/client";

// PRD §5 literal "compliance_status dihitung otomatis dari result_value
// vs baku_mutu_min/baku_mutu_max". Kedua ambang nullable (tidak semua
// parameter py baku mutu eksplisit) — TIDAK ADA ambang sama sekali ->
// NOT_APPLICABLE (bukan COMPLIANT/EXCEED, krn tidak ada dasar pembanding).
export function calculateComplianceStatus(resultValue: number, bakuMutuMin: number | null, bakuMutuMax: number | null): EnvComplianceStatus {
  if (bakuMutuMin === null && bakuMutuMax === null) return "NOT_APPLICABLE";
  if (bakuMutuMin !== null && resultValue < bakuMutuMin) return "EXCEED";
  if (bakuMutuMax !== null && resultValue > bakuMutuMax) return "EXCEED";
  return "COMPLIANT";
}

// BR-07 — "Setiap environmental_monitoring_records wajib memiliki lampiran
// laporan hasil uji lab sebelum status berubah dari RECORDED ke VERIFIED."
// hasLabReportAttachment dihitung caller (query attachments generik
// entity_type=environmental_monitoring_record, pola sama BR-07 Modul 08 3.6).
export function assertLabReportAttachedBeforeVerified(hasLabReportAttachment: boolean): void {
  if (!hasLabReportAttachment) {
    throw new Error("environmental_monitoring_records wajib memiliki lampiran laporan hasil uji lab sebelum status VERIFIED (BR-07).");
  }
}

const ALLOWED_TRANSITIONS: Record<EnvMonitoringRecordStatus, EnvMonitoringRecordStatus[]> = {
  RECORDED: ["VERIFIED"],
  VERIFIED: ["REPORTED_TO_REGULATOR"],
  REPORTED_TO_REGULATOR: [],
};

export function validateMonitoringRecordStatusTransition(from: EnvMonitoringRecordStatus, to: EnvMonitoringRecordStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi environmental_monitoring_records.status dari ${from} ke ${to} tidak valid.`);
  }
}
