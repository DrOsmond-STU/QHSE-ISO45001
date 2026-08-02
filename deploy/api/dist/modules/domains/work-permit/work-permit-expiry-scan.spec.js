"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_expiry_scan_1 = require("./work-permit-expiry-scan");
describe("findExpiredWorkPermits — BR-07 (scan)", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    it("tidak menandai permit yang planned_end_datetime-nya masih di masa depan", () => {
        const result = (0, work_permit_expiry_scan_1.findExpiredWorkPermits)([{ workPermitId: "p1", plannedEndDatetime: new Date("2026-08-01T13:00:00Z"), status: "ACTIVE" }], now);
        expect(result).toHaveLength(0);
    });
    it("menandai permit ACTIVE yang planned_end_datetime-nya sudah lewat", () => {
        const result = (0, work_permit_expiry_scan_1.findExpiredWorkPermits)([{ workPermitId: "p1", plannedEndDatetime: new Date("2026-08-01T11:00:00Z"), status: "ACTIVE" }], now);
        expect(result.map((c) => c.workPermitId)).toEqual(["p1"]);
    });
    it("menandai permit EXTENSION_REQUESTED (belum disetujui) yang planned_end_datetime asli sudah lewat", () => {
        const result = (0, work_permit_expiry_scan_1.findExpiredWorkPermits)([{ workPermitId: "p1", plannedEndDatetime: new Date("2026-08-01T11:00:00Z"), status: "EXTENSION_REQUESTED" }], now);
        expect(result.map((c) => c.workPermitId)).toEqual(["p1"]);
    });
});
//# sourceMappingURL=work-permit-expiry-scan.spec.js.map