import { OhPakCaseStatus, OhSeverityClassification, OhWorkRelatedness } from "@prisma/client";

const CASE_TRANSITIONS: Record<OhPakCaseStatus, OhPakCaseStatus[]> = {
  OPEN: ["UNDER_TREATMENT", "RECOVERED", "PERMANENT_IMPAIRMENT", "CLOSED", "DECEASED"],
  UNDER_TREATMENT: ["RECOVERED", "PERMANENT_IMPAIRMENT", "CLOSED", "DECEASED"],
  RECOVERED: ["CLOSED"],
  PERMANENT_IMPAIRMENT: ["CLOSED"],
  CLOSED: [],
  DECEASED: [],
};

export function validatePakCaseStatusTransition(from: OhPakCaseStatus, to: OhPakCaseStatus): void {
  if (!CASE_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi occupational_disease_cases.case_status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-08 — "severity_classification IN (SEVERE, PERMANENT_DISABILITY, FATAL)
// wajib memicu notifikasi eskalasi ke Top Management berupa ringkasan
// non-identifiable."
export function requiresTopManagementEscalation(severity: OhSeverityClassification): boolean {
  return severity === "SEVERE" || severity === "PERMANENT_DISABILITY" || severity === "FATAL";
}

// PRD §4.3 poin 3: "Jika CONFIRMED_WORK_RELATED -> pelaporan wajib ke
// Disnaker/BPJS Ketenagakerjaan."
export function requiresDisnakerReporting(workRelatedness: OhWorkRelatedness): boolean {
  return workRelatedness === "CONFIRMED_WORK_RELATED";
}
