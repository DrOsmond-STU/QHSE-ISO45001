"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_record_overdue_scan_1 = require("./inspection-record-overdue-scan");
describe("findOverdueInspectionRecords (BR-06, reinterpretasi level-record)", () => {
    const now = new Date("2026-07-25T00:00:00.000Z");
    it("menyertakan kandidat yang plannedDate sudah lewat", () => {
        const result = (0, inspection_record_overdue_scan_1.findOverdueInspectionRecords)([{ recordId: "a", plannedDate: new Date("2026-07-24T00:00:00.000Z") }], now);
        expect(result).toHaveLength(1);
    });
    it("TIDAK menyertakan kandidat yang plannedDate masih di masa depan atau null (ad-hoc)", () => {
        const result = (0, inspection_record_overdue_scan_1.findOverdueInspectionRecords)([
            { recordId: "future", plannedDate: new Date("2026-07-26T00:00:00.000Z") },
            { recordId: "adhoc", plannedDate: null },
        ], now);
        expect(result).toHaveLength(0);
    });
});
//# sourceMappingURL=inspection-record-overdue-scan.spec.js.map