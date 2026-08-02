"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFitToWorkAssessmentStatusTransition = validateFitToWorkAssessmentStatusTransition;
exports.requiresRestrictedDutyAssignment = requiresRestrictedDutyAssignment;
exports.isReassessmentDue = isReassessmentDue;
exports.validateRestrictedDutyAssignmentStatusTransition = validateRestrictedDutyAssignmentStatusTransition;
const ASSESSMENT_TRANSITIONS = {
    ACTIVE: ["EXPIRED", "SUPERSEDED"],
    EXPIRED: [],
    SUPERSEDED: [],
};
function validateFitToWorkAssessmentStatusTransition(from, to) {
    if (!ASSESSMENT_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi fit_to_work_assessments.status dari ${from} ke ${to} tidak valid.`);
    }
}
// PRD §4.2 poin 3: "Jika fit_status IN (FIT_WITH_RESTRICTION, TEMPORARY_UNFIT)
// -> restricted_duty_assignments dibuat". UNFIT SENGAJA TIDAK termasuk —
// UNFIT berarti tidak bisa bekerja sama sekali (bukan tugas terbatas).
function requiresRestrictedDutyAssignment(fitStatus) {
    return fitStatus === "FIT_WITH_RESTRICTION" || fitStatus === "TEMPORARY_UNFIT";
}
// PRD §4.2 poin 4: "next_reassessment_date memicu reminder otomatis."
function isReassessmentDue(nextReassessmentDate, asOfDate) {
    if (nextReassessmentDate === null) {
        return false;
    }
    return nextReassessmentDate.getTime() <= asOfDate.getTime();
}
const RESTRICTED_DUTY_TRANSITIONS = {
    ACTIVE: ["COMPLETED", "ESCALATED_NON_COMPLIANT"],
    COMPLETED: [],
    ESCALATED_NON_COMPLIANT: [],
};
function validateRestrictedDutyAssignmentStatusTransition(from, to) {
    if (!RESTRICTED_DUTY_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi restricted_duty_assignments.status dari ${from} ke ${to} tidak valid.`);
    }
}
