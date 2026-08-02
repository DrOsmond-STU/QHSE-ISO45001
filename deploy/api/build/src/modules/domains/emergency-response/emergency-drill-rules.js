"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmergencyDrillStatusTransition = validateEmergencyDrillStatusTransition;
exports.assertActivationExistsIfFullScaleEvacuation = assertActivationExistsIfFullScaleEvacuation;
exports.assertCapaLinkedIfGapsIdentified = assertCapaLinkedIfGapsIdentified;
const ALLOWED_TRANSITIONS = {
    PLANNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
};
function validateEmergencyDrillStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi emergency_drills.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-04 — "emergency_drills dengan drill_type=FULL_SCALE_EVACUATION wajib
// menghasilkan minimal satu emergency_activations (untuk mengaktifkan
// muster_point_checkins) sebelum status dapat COMPLETED." Drill TABLETOP/
// FUNCTIONAL TIDAK kena gate ini sama sekali (vacuously true).
function assertActivationExistsIfFullScaleEvacuation(drillType, activationCount) {
    if (drillType !== "FULL_SCALE_EVACUATION")
        return;
    if (activationCount < 1) {
        throw new Error("emergency_drills tidak dapat COMPLETED — drill_type=FULL_SCALE_EVACUATION wajib memiliki minimal 1 emergency_activations (BR-04).");
    }
}
// BR-08 — "emergency_drills.capa_id wajib diisi jika gaps_identified tidak
// kosong, sebelum status dapat COMPLETED — menutup loop temuan drill."
function assertCapaLinkedIfGapsIdentified(gapsIdentified, capaId) {
    const hasGaps = typeof gapsIdentified === "string" && gapsIdentified.trim().length > 0;
    if (hasGaps && !capaId) {
        throw new Error("emergency_drills tidak dapat COMPLETED — gaps_identified terisi tapi capa_id belum diisi (BR-08).");
    }
}
