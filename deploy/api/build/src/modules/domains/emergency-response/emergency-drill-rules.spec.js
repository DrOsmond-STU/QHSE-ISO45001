"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emergency_drill_rules_1 = require("./emergency-drill-rules");
describe("validateEmergencyDrillStatusTransition", () => {
    it("mengizinkan PLANNED->IN_PROGRESS->COMPLETED", () => {
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("PLANNED", "IN_PROGRESS")).not.toThrow();
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("IN_PROGRESS", "COMPLETED")).not.toThrow();
    });
    it("mengizinkan pembatalan dari PLANNED maupun IN_PROGRESS", () => {
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("PLANNED", "CANCELLED")).not.toThrow();
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("IN_PROGRESS", "CANCELLED")).not.toThrow();
    });
    it("menolak PLANNED->COMPLETED langsung", () => {
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("PLANNED", "COMPLETED")).toThrow(/tidak valid/);
    });
    it("menolak transisi apa pun dari status terminal COMPLETED/CANCELLED", () => {
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("COMPLETED", "IN_PROGRESS")).toThrow();
        expect(() => (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)("CANCELLED", "PLANNED")).toThrow();
    });
});
describe("assertActivationExistsIfFullScaleEvacuation (BR-04)", () => {
    it("tidak throw utk TABLETOP/FUNCTIONAL berapa pun activationCount-nya", () => {
        expect(() => (0, emergency_drill_rules_1.assertActivationExistsIfFullScaleEvacuation)("TABLETOP", 0)).not.toThrow();
        expect(() => (0, emergency_drill_rules_1.assertActivationExistsIfFullScaleEvacuation)("FUNCTIONAL", 0)).not.toThrow();
    });
    it("throw utk FULL_SCALE_EVACUATION tanpa activation sama sekali", () => {
        expect(() => (0, emergency_drill_rules_1.assertActivationExistsIfFullScaleEvacuation)("FULL_SCALE_EVACUATION", 0)).toThrow(/BR-04/);
    });
    it("tidak throw utk FULL_SCALE_EVACUATION dgn minimal 1 activation", () => {
        expect(() => (0, emergency_drill_rules_1.assertActivationExistsIfFullScaleEvacuation)("FULL_SCALE_EVACUATION", 1)).not.toThrow();
    });
});
describe("assertCapaLinkedIfGapsIdentified (BR-08)", () => {
    it("tidak throw kalau gapsIdentified kosong/null", () => {
        expect(() => (0, emergency_drill_rules_1.assertCapaLinkedIfGapsIdentified)(null, null)).not.toThrow();
        expect(() => (0, emergency_drill_rules_1.assertCapaLinkedIfGapsIdentified)("", null)).not.toThrow();
        expect(() => (0, emergency_drill_rules_1.assertCapaLinkedIfGapsIdentified)("   ", null)).not.toThrow();
    });
    it("throw kalau gapsIdentified terisi tapi capaId kosong", () => {
        expect(() => (0, emergency_drill_rules_1.assertCapaLinkedIfGapsIdentified)("Evakuasi terlalu lambat", null)).toThrow(/BR-08/);
    });
    it("tidak throw kalau gapsIdentified terisi DAN capaId terisi", () => {
        expect(() => (0, emergency_drill_rules_1.assertCapaLinkedIfGapsIdentified)("Evakuasi terlalu lambat", "11111111-1111-1111-1111-111111111111")).not.toThrow();
    });
});
