"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePakCaseStatusTransition = validatePakCaseStatusTransition;
exports.requiresTopManagementEscalation = requiresTopManagementEscalation;
exports.requiresDisnakerReporting = requiresDisnakerReporting;
const CASE_TRANSITIONS = {
    OPEN: ["UNDER_TREATMENT", "RECOVERED", "PERMANENT_IMPAIRMENT", "CLOSED", "DECEASED"],
    UNDER_TREATMENT: ["RECOVERED", "PERMANENT_IMPAIRMENT", "CLOSED", "DECEASED"],
    RECOVERED: ["CLOSED"],
    PERMANENT_IMPAIRMENT: ["CLOSED"],
    CLOSED: [],
    DECEASED: [],
};
function validatePakCaseStatusTransition(from, to) {
    if (!CASE_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi occupational_disease_cases.case_status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-08 — "severity_classification IN (SEVERE, PERMANENT_DISABILITY, FATAL)
// wajib memicu notifikasi eskalasi ke Top Management berupa ringkasan
// non-identifiable."
function requiresTopManagementEscalation(severity) {
    return severity === "SEVERE" || severity === "PERMANENT_DISABILITY" || severity === "FATAL";
}
// PRD §4.3 poin 3: "Jika CONFIRMED_WORK_RELATED -> pelaporan wajib ke
// Disnaker/BPJS Ketenagakerjaan."
function requiresDisnakerReporting(workRelatedness) {
    return workRelatedness === "CONFIRMED_WORK_RELATED";
}
