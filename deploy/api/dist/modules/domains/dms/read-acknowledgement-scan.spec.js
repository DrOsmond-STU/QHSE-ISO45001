"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const read_acknowledgement_scan_1 = require("./read-acknowledgement-scan");
const NOW = new Date("2026-07-25T00:00:00Z");
const HOUR = 60 * 60 * 1000;
function candidate(overrides) {
    return { ackLogId: "ack-1", status: "PENDING", dueAt: null, ...overrides };
}
describe("findOverdueAcknowledgements (BR-04)", () => {
    it("dueAt sudah lewat -> overdue", () => {
        const c = candidate({ dueAt: new Date(NOW.getTime() - HOUR) });
        expect((0, read_acknowledgement_scan_1.findOverdueAcknowledgements)([c], NOW)).toEqual([c]);
    });
    it("dueAt masih di masa depan -> belum overdue", () => {
        const c = candidate({ dueAt: new Date(NOW.getTime() + HOUR) });
        expect((0, read_acknowledgement_scan_1.findOverdueAcknowledgements)([c], NOW)).toEqual([]);
    });
    it("dueAt null (requiresAcknowledgement:false atau SLA tidak diisi) -> tidak pernah overdue", () => {
        const c = candidate({ dueAt: null });
        expect((0, read_acknowledgement_scan_1.findOverdueAcknowledgements)([c], NOW)).toEqual([]);
    });
});
//# sourceMappingURL=read-acknowledgement-scan.spec.js.map