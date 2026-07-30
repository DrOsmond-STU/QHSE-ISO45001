import { IncidentReportStatus } from "@prisma/client";

// PRD §5 enum literal menyebut NILAI (REPORTED..REOPENED) tapi TIDAK
// menyediakan tabel transisi eksplisit — pola sama work-permit-lifecycle.ts
// (3.3), edge diinterpretasikan dari §4 alur proses. UNDER_VERIFICATION bisa
// lompat LANGSUNG ke PENDING_REGULATORY_REPORT/CLOSED (insiden ringan yang
// TIDAK wajib investigasi formal, §4 poin 4 "opsional/sampling utk
// NEAR_MISS/FIRST_AID") — TIDAK harus singgah INVESTIGATION_COMPLETED yang
// secara semantik berarti "investigasi selesai".
const ALLOWED_TRANSITIONS: Record<IncidentReportStatus, IncidentReportStatus[]> = {
  REPORTED: ["UNDER_VERIFICATION"],
  UNDER_VERIFICATION: ["UNDER_INVESTIGATION", "PENDING_REGULATORY_REPORT", "CLOSED"],
  UNDER_INVESTIGATION: ["INVESTIGATION_COMPLETED"],
  INVESTIGATION_COMPLETED: ["PENDING_REGULATORY_REPORT", "CLOSED"],
  PENDING_REGULATORY_REPORT: ["CLOSED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["UNDER_INVESTIGATION"],
};

export function validateIncidentReportStatusTransition(from: IncidentReportStatus, to: IncidentReportStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi incident_reports.status dari ${from} ke ${to} tidak valid.`);
  }
}
