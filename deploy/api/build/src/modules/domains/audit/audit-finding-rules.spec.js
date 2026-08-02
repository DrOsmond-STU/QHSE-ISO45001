"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_finding_rules_1 = require("./audit-finding-rules");
describe("resolveDefaultRequiresCapa", () => {
    it("MAJOR_NC -> true", () => {
        expect((0, audit_finding_rules_1.resolveDefaultRequiresCapa)("MAJOR_NC")).toBe(true);
    });
    it("MINOR_NC -> true", () => {
        expect((0, audit_finding_rules_1.resolveDefaultRequiresCapa)("MINOR_NC")).toBe(true);
    });
    it("OBSERVATION -> false", () => {
        expect((0, audit_finding_rules_1.resolveDefaultRequiresCapa)("OBSERVATION")).toBe(false);
    });
    it("OFI -> false", () => {
        expect((0, audit_finding_rules_1.resolveDefaultRequiresCapa)("OFI")).toBe(false);
    });
});
describe("validateAuditFindingStatusTransition", () => {
    it("requiresCapa=true: OPEN->CAPA_LINKED->VERIFIED->CLOSED", () => {
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("OPEN", "CAPA_LINKED", true)).not.toThrow();
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("CAPA_LINKED", "VERIFIED", true)).not.toThrow();
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("VERIFIED", "CLOSED", true)).not.toThrow();
    });
    it("requiresCapa=true: menolak OPEN->CLOSED langsung (wajib lewat CAPA_LINKED/VERIFIED)", () => {
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("OPEN", "CLOSED", true)).toThrow(/tidak valid/);
    });
    it("requiresCapa=false: mengizinkan OPEN->CLOSED langsung (§4 poin 9)", () => {
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("OPEN", "CLOSED", false)).not.toThrow();
    });
    it("requiresCapa=false: tetap boleh OPEN->CAPA_LINKED (Observation/OFI opsional jadi CAPA preventive)", () => {
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("OPEN", "CAPA_LINKED", false)).not.toThrow();
    });
    it("menolak transisi dari status terminal CLOSED", () => {
        expect(() => (0, audit_finding_rules_1.validateAuditFindingStatusTransition)("CLOSED", "OPEN", true)).toThrow(/tidak valid/);
    });
});
