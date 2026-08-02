"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertControlsPresentIfStillHighRisk = assertControlsPresentIfStillHighRisk;
exports.assertAllControlsPresentIfStillHighRisk = assertAllControlsPresentIfStillHighRisk;
function assertControlsPresentIfStillHighRisk(line) {
    const stillHighRisk = line.requiresEscalationAfter || line.riskLevelAfter === "HIGH";
    if (stillHighRisk && !line.additionalControlsRequired) {
        throw new Error(`hira_hazard_lines dengan risk_level_after=${line.riskLevelAfter} wajib mengisi additional_controls_required sebelum HIRA dapat disetujui (BR-02).`);
    }
}
function assertAllControlsPresentIfStillHighRisk(lines) {
    for (const line of lines) {
        assertControlsPresentIfStillHighRisk(line);
    }
}
