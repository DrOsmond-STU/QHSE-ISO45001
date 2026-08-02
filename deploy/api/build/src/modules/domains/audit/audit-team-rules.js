"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAuditorIndependence = assertAuditorIndependence;
// BR-07 — "Auditor tidak boleh menjadi auditee pada scope department
// miliknya sendiri dalam audit yang sama... divalidasi silang dengan
// user_roles.scope_type/scope_id." Diimplementasikan lebih sederhana:
// bandingkan department milik SENDIRI kandidat (users.department_id, task
// 1.1) terhadap seluruh audit_auditee_scopes.department_id audit yang
// SAMA — user_roles.scope_type/scope_id (Modul 02) TIDAK dipakai langsung
// krn scope_type bisa macam-macam (SITE/DEPARTMENT/dst, task 1.3) sementara
// PRD literal spesifik "scope department" — users.department_id sudah
// representasi paling langsung utk itu (gap TDD §26, interpretasi lebih
// sempit dari literal "user_roles.scope_type/scope_id").
function assertAuditorIndependence(candidateDepartmentId, auditeeScopeDepartmentIds) {
    if (!candidateDepartmentId)
        return;
    const conflict = auditeeScopeDepartmentIds.includes(candidateDepartmentId);
    if (conflict) {
        throw new Error("audit_team_members tidak dapat ditambahkan — kandidat berasal dari department yang sama dengan salah satu audit_auditee_scopes audit ini (BR-07, independensi auditor).");
    }
}
