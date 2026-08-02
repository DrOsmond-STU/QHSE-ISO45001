"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_finding_sla_scan_1 = require("./inspection-finding-sla-scan");
describe("findHighSeverityFindingsNeedingEscalation (BR-04)", () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    it("SLA 24 jam", () => {
        expect(inspection_finding_sla_scan_1.HIGH_SEVERITY_FINDING_SLA_HOURS).toBe(24);
    });
    it("menyertakan kandidat yang identifiedAt sudah lewat 24 jam", () => {
        const result = (0, inspection_finding_sla_scan_1.findHighSeverityFindingsNeedingEscalation)([{ findingId: "a", identifiedAt: new Date("2026-07-24T11:00:00.000Z") }], now);
        expect(result).toHaveLength(1);
    });
    it("TIDAK menyertakan kandidat yang masih dalam SLA 24 jam", () => {
        const result = (0, inspection_finding_sla_scan_1.findHighSeverityFindingsNeedingEscalation)([{ findingId: "a", identifiedAt: new Date("2026-07-25T00:00:00.000Z") }], now);
        expect(result).toHaveLength(0);
    });
});
