"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertClosureReadyForClosed = assertClosureReadyForClosed;
/**
 * BR-06 (PRD Modul 06 §6) — "Status CLOSED hanya tercapai setelah
 * work_permit_closures.status=VERIFIED dan (jika requires_loto=TRUE)
 * isolation_removed_confirmed=TRUE."
 */
function assertClosureReadyForClosed(closureStatus, requiresLoto, isolationRemovedConfirmed) {
    if (closureStatus !== "VERIFIED") {
        throw new Error("work_permit_closures wajib berstatus VERIFIED sebelum work_permits dapat berstatus CLOSED (BR-06).");
    }
    if (requiresLoto && !isolationRemovedConfirmed) {
        throw new Error("work_permit_closures.isolation_removed_confirmed wajib TRUE sebelum work_permits dapat berstatus CLOSED kalau tipe mewajibkan LOTO (BR-06).");
    }
}
//# sourceMappingURL=work-permit-closure-rules.js.map