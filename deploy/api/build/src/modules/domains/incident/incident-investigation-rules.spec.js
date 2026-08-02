"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_investigation_rules_1 = require("./incident-investigation-rules");
describe("assertInvestigationApprovedIfRequiredForClosure (BR-01)", () => {
    it.each(["FATALITY", "LOST_TIME_INJURY", "PROCESS_SAFETY_EVENT"])("%s tanpa investigasi APPROVED -> throw", (classification) => {
        expect(() => (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)(classification, null)).toThrow();
        expect(() => (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)(classification, "IN_PROGRESS")).toThrow();
        expect(() => (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)(classification, "PENDING_REVIEW")).toThrow();
    });
    it.each(["FATALITY", "LOST_TIME_INJURY", "PROCESS_SAFETY_EVENT"])("%s dengan investigasi APPROVED -> lolos", (classification) => {
        expect(() => (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)(classification, "APPROVED")).not.toThrow();
    });
    it("RESTRICTED_WORK_CASE TIDAK di-gate (beda dari daftar §4, BR-01 literal hanya 3 klasifikasi)", () => {
        expect(() => (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)("RESTRICTED_WORK_CASE", null)).not.toThrow();
    });
    it("NEAR_MISS tanpa investigasi -> lolos (tidak wajib)", () => {
        expect(() => (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)("NEAR_MISS", null)).not.toThrow();
    });
});
