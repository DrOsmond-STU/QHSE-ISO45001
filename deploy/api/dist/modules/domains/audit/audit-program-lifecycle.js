"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuditProgramStatusTransition = validateAuditProgramStatusTransition;
exports.validateAuditProgramPlanItemStatusTransition = validateAuditProgramPlanItemStatusTransition;
exports.assertPlanItemEditable = assertPlanItemEditable;
// PRD Modul 09 §5 enum literal (5 nilai, TANPA "UNDER_REVIEW"/"REJECTED"
// spt modul lain) — selama workflow_instance approval berjalan,
// audit_programs.status TETAP DRAFT (satu-satunya penanda "sedang
// direview" adalah workflow_instance_id terisi + WorkflowInstance.status=
// IN_PROGRESS, TIDAK ADA status bisnis terpisah utk itu, gap TDD §26
// dibanding modul lain yang py UNDER_REVIEW eksplisit). REJECTED
// (workflow) mendarat balik ke DRAFT yang sama (workflow_instance_id
// di-null-kan listener), pola sama EmergencyResponsePlan.
const ALLOWED_PROGRAM_TRANSITIONS = {
    DRAFT: ["APPROVED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
};
function validateAuditProgramStatusTransition(from, to) {
    if (!ALLOWED_PROGRAM_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi audit_programs.status dari ${from} ke ${to} tidak valid.`);
    }
}
// PRD §5 audit_program_plan_items.status literal 4 nilai. linked_audit_id
// terisi bareng transisi ->EXECUTED (AuditService.createFromPlanItem(),
// lihat banner comment Audit.auditProgramPlanItemId).
const ALLOWED_PLAN_ITEM_TRANSITIONS = {
    PLANNED: ["SCHEDULED", "EXECUTED", "CANCELLED"],
    SCHEDULED: ["EXECUTED", "CANCELLED"],
    EXECUTED: [],
    CANCELLED: [],
};
function validateAuditProgramPlanItemStatusTransition(from, to) {
    if (!ALLOWED_PLAN_ITEM_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi audit_program_plan_items.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-06 — "audit_program_plan_items tidak dapat diedit setelah
// status=EXECUTED; perubahan rencana harus melalui versi baru program/addendum."
function assertPlanItemEditable(status) {
    if (status === "EXECUTED") {
        throw new Error("audit_program_plan_items tidak dapat diedit — status sudah EXECUTED (BR-06), buat versi baru program/addendum.");
    }
}
//# sourceMappingURL=audit-program-lifecycle.js.map