"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAllActionPlansCompleted = assertAllActionPlansCompleted;
exports.assertActionTrackingIdRequired = assertActionTrackingIdRequired;
function assertAllActionPlansCompleted(actionPlans) {
    if (actionPlans.length === 0) {
        throw new Error("capa_register tidak dapat masuk PENDING_EFFECTIVENESS_VERIFICATION — belum ada capa_action_plans sama sekali (BR-02).");
    }
    const incomplete = actionPlans.filter((p) => p.statusCache !== "COMPLETED");
    if (incomplete.length > 0) {
        throw new Error(`capa_register tidak dapat masuk PENDING_EFFECTIVENESS_VERIFICATION — ${incomplete.length} capa_action_plans belum COMPLETED (BR-02).`);
    }
}
function assertActionTrackingIdRequired(actionPlans) {
    if (actionPlans.length === 0) {
        throw new Error("capa_register tidak dapat disubmit approval — belum ada capa_action_plans sama sekali.");
    }
    const missing = actionPlans.filter((p) => p.actionTrackingId === null);
    if (missing.length > 0) {
        throw new Error(`capa_action_plans berikut belum py action_tracking_id (BR-08, wajib terisi sebelum submit approval): ${missing.map((p) => p.id).join(", ")}.`);
    }
}
