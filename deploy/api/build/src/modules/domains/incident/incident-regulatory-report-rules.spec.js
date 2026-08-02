"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_regulatory_report_rules_1 = require("./incident-regulatory-report-rules");
describe("shouldAutoCreateRegulatoryReport (BR-03)", () => {
    it.each(["FATALITY", "LOST_TIME_INJURY", "PROCESS_SAFETY_EVENT"])("%s -> true", (classification) => {
        expect((0, incident_regulatory_report_rules_1.shouldAutoCreateRegulatoryReport)(classification)).toBe(true);
    });
    it.each(["NEAR_MISS", "FIRST_AID", "RESTRICTED_WORK_CASE"])("%s -> false", (classification) => {
        expect((0, incident_regulatory_report_rules_1.shouldAutoCreateRegulatoryReport)(classification)).toBe(false);
    });
});
describe("computeRequiredByDate", () => {
    it("menambah DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS (48 jam / 2x24) dari incidentDatetime", () => {
        expect(incident_regulatory_report_rules_1.DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS).toBe(48);
        const incidentDatetime = new Date("2026-07-25T10:00:00.000Z");
        const requiredByDate = (0, incident_regulatory_report_rules_1.computeRequiredByDate)(incidentDatetime);
        expect(requiredByDate.getTime()).toBe(incidentDatetime.getTime() + 48 * 60 * 60 * 1000);
    });
});
describe("assertNoPendingOrOverdueRegulatoryReports (BR-09)", () => {
    it("lolos kalau kosong", () => {
        expect(() => (0, incident_regulatory_report_rules_1.assertNoPendingOrOverdueRegulatoryReports)([])).not.toThrow();
    });
    it("lolos kalau seluruh baris SUBMITTED/ACKNOWLEDGED", () => {
        expect(() => (0, incident_regulatory_report_rules_1.assertNoPendingOrOverdueRegulatoryReports)([{ status: "SUBMITTED" }, { status: "ACKNOWLEDGED" }])).not.toThrow();
    });
    it("throw kalau ada baris PENDING", () => {
        expect(() => (0, incident_regulatory_report_rules_1.assertNoPendingOrOverdueRegulatoryReports)([{ status: "PENDING" }])).toThrow();
    });
    it("throw kalau ada baris OVERDUE", () => {
        expect(() => (0, incident_regulatory_report_rules_1.assertNoPendingOrOverdueRegulatoryReports)([{ status: "SUBMITTED" }, { status: "OVERDUE" }])).toThrow();
    });
});
