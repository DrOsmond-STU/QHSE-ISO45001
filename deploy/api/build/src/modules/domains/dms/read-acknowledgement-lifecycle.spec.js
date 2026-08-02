"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const read_acknowledgement_lifecycle_1 = require("./read-acknowledgement-lifecycle");
describe("validateAcknowledgementTransition (BR-04)", () => {
    it("PENDING -> VIEWED selalu diizinkan", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("PENDING", "VIEWED", null)).not.toThrow();
    });
    it("VIEWED -> ACKNOWLEDGED selalu diizinkan (kedua method)", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("VIEWED", "ACKNOWLEDGED", "IN_APP_CLICK")).not.toThrow();
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("VIEWED", "ACKNOWLEDGED", "E_SIGNATURE")).not.toThrow();
    });
    it("PENDING -> ACKNOWLEDGED langsung DITOLAK untuk IN_APP_CLICK (wajib lewat VIEWED)", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("PENDING", "ACKNOWLEDGED", "IN_APP_CLICK")).toThrow();
    });
    it("PENDING -> ACKNOWLEDGED langsung DIIZINKAN untuk E_SIGNATURE (PRD BR-04 pengecualian eksplisit)", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("PENDING", "ACKNOWLEDGED", "E_SIGNATURE")).not.toThrow();
    });
    it.each(["PENDING", "VIEWED"])("%s -> OVERDUE diizinkan (job SLA scan)", (from) => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)(from, "OVERDUE", null)).not.toThrow();
    });
    it("ACKNOWLEDGED -> apa pun ditolak (status terminal)", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("ACKNOWLEDGED", "VIEWED", null)).toThrow();
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("ACKNOWLEDGED", "OVERDUE", null)).toThrow();
    });
    it("OVERDUE -> VIEWED/ACKNOWLEDGED DIIZINKAN (late-acknowledgement, BEYOND diagram literal PRD — lihat banner comment)", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("OVERDUE", "VIEWED", null)).not.toThrow();
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("OVERDUE", "ACKNOWLEDGED", "IN_APP_CLICK")).not.toThrow();
    });
    it("OVERDUE -> OVERDUE (re-scan) ditolak — bukan transisi bermakna", () => {
        expect(() => (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)("OVERDUE", "OVERDUE", null)).toThrow();
    });
});
