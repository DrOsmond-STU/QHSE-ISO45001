import { OhFitStatus, OhFitToWorkAssessmentStatus, OhRestrictedDutyStatus } from "@prisma/client";

const ASSESSMENT_TRANSITIONS: Record<OhFitToWorkAssessmentStatus, OhFitToWorkAssessmentStatus[]> = {
  ACTIVE: ["EXPIRED", "SUPERSEDED"],
  EXPIRED: [],
  SUPERSEDED: [],
};

export function validateFitToWorkAssessmentStatusTransition(from: OhFitToWorkAssessmentStatus, to: OhFitToWorkAssessmentStatus): void {
  if (!ASSESSMENT_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi fit_to_work_assessments.status dari ${from} ke ${to} tidak valid.`);
  }
}

// PRD §4.2 poin 3: "Jika fit_status IN (FIT_WITH_RESTRICTION, TEMPORARY_UNFIT)
// -> restricted_duty_assignments dibuat". UNFIT SENGAJA TIDAK termasuk —
// UNFIT berarti tidak bisa bekerja sama sekali (bukan tugas terbatas).
export function requiresRestrictedDutyAssignment(fitStatus: OhFitStatus): boolean {
  return fitStatus === "FIT_WITH_RESTRICTION" || fitStatus === "TEMPORARY_UNFIT";
}

// PRD §4.2 poin 4: "next_reassessment_date memicu reminder otomatis."
export function isReassessmentDue(nextReassessmentDate: Date | null, asOfDate: Date): boolean {
  if (nextReassessmentDate === null) {
    return false;
  }
  return nextReassessmentDate.getTime() <= asOfDate.getTime();
}

const RESTRICTED_DUTY_TRANSITIONS: Record<OhRestrictedDutyStatus, OhRestrictedDutyStatus[]> = {
  ACTIVE: ["COMPLETED", "ESCALATED_NON_COMPLIANT"],
  COMPLETED: [],
  ESCALATED_NON_COMPLIANT: [],
};

export function validateRestrictedDutyAssignmentStatusTransition(from: OhRestrictedDutyStatus, to: OhRestrictedDutyStatus): void {
  if (!RESTRICTED_DUTY_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi restricted_duty_assignments.status dari ${from} ke ${to} tidak valid.`);
  }
}
