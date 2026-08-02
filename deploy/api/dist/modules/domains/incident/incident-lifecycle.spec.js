"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_lifecycle_1 = require("./incident-lifecycle");
describe("validateIncidentReportStatusTransition", () => {
    it("mengizinkan alur penuh REPORTED->UNDER_VERIFICATION->UNDER_INVESTIGATION->INVESTIGATION_COMPLETED->PENDING_REGULATORY_REPORT->CLOSED", () => {
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("REPORTED", "UNDER_VERIFICATION")).not.toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("UNDER_VERIFICATION", "UNDER_INVESTIGATION")).not.toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("UNDER_INVESTIGATION", "INVESTIGATION_COMPLETED")).not.toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("INVESTIGATION_COMPLETED", "PENDING_REGULATORY_REPORT")).not.toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("PENDING_REGULATORY_REPORT", "CLOSED")).not.toThrow();
    });
    it("mengizinkan jalur pintas insiden ringan UNDER_VERIFICATION->CLOSED (tanpa investigasi formal)", () => {
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("UNDER_VERIFICATION", "CLOSED")).not.toThrow();
    });
    it("mengizinkan INVESTIGATION_COMPLETED->CLOSED langsung (tanpa regulatory report)", () => {
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("INVESTIGATION_COMPLETED", "CLOSED")).not.toThrow();
    });
    it("mengizinkan CLOSED->REOPENED->UNDER_INVESTIGATION", () => {
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("CLOSED", "REOPENED")).not.toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("REOPENED", "UNDER_INVESTIGATION")).not.toThrow();
    });
    it("menolak transisi tidak valid", () => {
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("REPORTED", "CLOSED")).toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("CLOSED", "UNDER_INVESTIGATION")).toThrow();
        expect(() => (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("UNDER_INVESTIGATION", "CLOSED")).toThrow();
    });
});
//# sourceMappingURL=incident-lifecycle.spec.js.map