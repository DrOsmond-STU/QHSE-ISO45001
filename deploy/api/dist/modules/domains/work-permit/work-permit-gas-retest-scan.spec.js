"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_gas_retest_scan_1 = require("./work-permit-gas-retest-scan");
describe("findPermitsOverdueForGasRetest — BR-05", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    it("tidak menandai permit yang belum pernah gas test (latestRetestDueAt null)", () => {
        const result = (0, work_permit_gas_retest_scan_1.findPermitsOverdueForGasRetest)([{ workPermitId: "p1", latestRetestDueAt: null }], now);
        expect(result).toHaveLength(0);
    });
    it("tidak menandai permit yang retest_due_at-nya masih di masa depan", () => {
        const result = (0, work_permit_gas_retest_scan_1.findPermitsOverdueForGasRetest)([{ workPermitId: "p1", latestRetestDueAt: new Date("2026-08-01T13:00:00Z") }], now);
        expect(result).toHaveLength(0);
    });
    it("menandai permit yang retest_due_at-nya sudah lewat", () => {
        const result = (0, work_permit_gas_retest_scan_1.findPermitsOverdueForGasRetest)([{ workPermitId: "p1", latestRetestDueAt: new Date("2026-08-01T11:00:00Z") }], now);
        expect(result.map((c) => c.workPermitId)).toEqual(["p1"]);
    });
});
//# sourceMappingURL=work-permit-gas-retest-scan.spec.js.map