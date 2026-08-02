"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_finding_closure_due_scan_1 = require("./audit-finding-closure-due-scan");
const now = new Date("2026-07-25T00:00:00.000Z");
describe("findFindingsClosureDue", () => {
    it("kembalikan finding dalam jendela 7 hari mendatang", () => {
        const result = (0, audit_finding_closure_due_scan_1.findFindingsClosureDue)([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: new Date("2026-07-30") }], now);
        expect(result).toHaveLength(1);
    });
    it("kembalikan finding yang SUDAH breach (target_closure_date lewat)", () => {
        const result = (0, audit_finding_closure_due_scan_1.findFindingsClosureDue)([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: new Date("2026-07-01") }], now);
        expect(result).toHaveLength(1);
    });
    it("kecualikan finding CLOSED", () => {
        const result = (0, audit_finding_closure_due_scan_1.findFindingsClosureDue)([{ auditFindingId: "f1", status: "CLOSED", targetClosureDate: new Date("2026-07-01") }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan finding targetClosureDate null (Observation/OFI tanpa tenggat)", () => {
        const result = (0, audit_finding_closure_due_scan_1.findFindingsClosureDue)([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: null }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan finding di luar jendela 7 hari", () => {
        const result = (0, audit_finding_closure_due_scan_1.findFindingsClosureDue)([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: new Date("2026-09-01") }], now);
        expect(result).toHaveLength(0);
    });
});
