"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const capa_root_cause_sla_scan_1 = require("./capa-root-cause-sla-scan");
const now = new Date("2026-07-26T00:00:00.000Z");
describe("findCapaRootCauseSlaDue", () => {
    it("kembalikan capa DRAFT yang initiated >=7 hari lalu", () => {
        const result = (0, capa_root_cause_sla_scan_1.findCapaRootCauseSlaDue)([{ capaRegisterId: "c1", status: "DRAFT", initiatedAt: new Date("2026-07-19T00:00:00.000Z"), rootCauseSlaReminderSentAt: null }], now);
        expect(result).toHaveLength(1);
    });
    it("kecualikan capa DRAFT yang belum 7 hari", () => {
        const result = (0, capa_root_cause_sla_scan_1.findCapaRootCauseSlaDue)([{ capaRegisterId: "c1", status: "DRAFT", initiatedAt: new Date("2026-07-22T00:00:00.000Z"), rootCauseSlaReminderSentAt: null }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan capa yang sudah keluar dari DRAFT (root cause sudah diisi)", () => {
        const result = (0, capa_root_cause_sla_scan_1.findCapaRootCauseSlaDue)([{ capaRegisterId: "c1", status: "ROOT_CAUSE_ANALYSIS", initiatedAt: new Date("2026-07-01T00:00:00.000Z"), rootCauseSlaReminderSentAt: null }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan capa yang reminder-nya sudah pernah dikirim (idempotency)", () => {
        const result = (0, capa_root_cause_sla_scan_1.findCapaRootCauseSlaDue)([
            {
                capaRegisterId: "c1",
                status: "DRAFT",
                initiatedAt: new Date("2026-07-01T00:00:00.000Z"),
                rootCauseSlaReminderSentAt: new Date("2026-07-20T00:00:00.000Z"),
            },
        ], now);
        expect(result).toHaveLength(0);
    });
});
//# sourceMappingURL=capa-root-cause-sla-scan.spec.js.map