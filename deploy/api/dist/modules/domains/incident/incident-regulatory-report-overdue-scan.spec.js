"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_regulatory_report_overdue_scan_1 = require("./incident-regulatory-report-overdue-scan");
describe("findOverdueRegulatoryReports", () => {
    const now = new Date("2026-07-25T00:00:00.000Z");
    it("menyertakan kandidat yang requiredByDate sudah lewat", () => {
        const result = (0, incident_regulatory_report_overdue_scan_1.findOverdueRegulatoryReports)([{ incidentRegulatoryReportId: "a", requiredByDate: new Date("2026-07-24T00:00:00.000Z") }], now);
        expect(result).toHaveLength(1);
    });
    it("TIDAK menyertakan kandidat yang requiredByDate masih di masa depan", () => {
        const result = (0, incident_regulatory_report_overdue_scan_1.findOverdueRegulatoryReports)([{ incidentRegulatoryReportId: "a", requiredByDate: new Date("2026-07-26T00:00:00.000Z") }], now);
        expect(result).toHaveLength(0);
    });
});
//# sourceMappingURL=incident-regulatory-report-overdue-scan.spec.js.map