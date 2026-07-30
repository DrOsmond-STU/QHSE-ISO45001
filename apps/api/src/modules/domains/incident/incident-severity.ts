import { IncidentClassification, IncidentSeverityLevel } from "@prisma/client";

// PRD §5 "severity_level | dihitung dari classification" TIDAK menyediakan
// tabel pemetaan literal (beda dari BR-04 Work Permit yang eksplisit
// "risk_level=HIGH OR requires_hse_approval") — pemetaan di bawah ini
// SEPENUHNYA diasumsikan berdasarkan keseriusan klasifikasi standar K3,
// bukan diturunkan dari rumus PRD manapun; gap didokumentasikan TDD §26.
const SEVERITY_BY_CLASSIFICATION: Record<IncidentClassification, IncidentSeverityLevel> = {
  FATALITY: "CRITICAL",
  PROCESS_SAFETY_EVENT: "HIGH",
  LOST_TIME_INJURY: "HIGH",
  ENVIRONMENTAL_SPILL: "MEDIUM",
  RESTRICTED_WORK_CASE: "MEDIUM",
  MEDICAL_TREATMENT: "MEDIUM",
  FIRST_AID: "LOW",
  NEAR_MISS: "LOW",
  PROPERTY_DAMAGE: "LOW",
};

export function computeSeverityLevel(classification: IncidentClassification): IncidentSeverityLevel {
  return SEVERITY_BY_CLASSIFICATION[classification];
}
