"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const capa_effectiveness_verification_due_scan_1 = require("./capa-effectiveness-verification-due-scan");
const now = new Date("2026-07-26T00:00:00.000Z");
describe("findCapaEffectivenessVerificationDue", () => {
    it("kembalikan verification PENDING yang due date sudah lewat", () => {
        const result = (0, capa_effectiveness_verification_due_scan_1.findCapaEffectivenessVerificationDue)([{ effectivenessVerificationId: "v1", result: "PENDING", verificationDueDate: new Date("2026-07-20"), dueReminderSentAt: null }], now);
        expect(result).toHaveLength(1);
    });
    it("kecualikan verification yang due date belum lewat", () => {
        const result = (0, capa_effectiveness_verification_due_scan_1.findCapaEffectivenessVerificationDue)([{ effectivenessVerificationId: "v1", result: "PENDING", verificationDueDate: new Date("2026-08-01"), dueReminderSentAt: null }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan verification yang sudah punya result (EFFECTIVE/NOT_EFFECTIVE)", () => {
        const result = (0, capa_effectiveness_verification_due_scan_1.findCapaEffectivenessVerificationDue)([{ effectivenessVerificationId: "v1", result: "EFFECTIVE", verificationDueDate: new Date("2026-07-01"), dueReminderSentAt: null }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan verification yang reminder-nya sudah pernah dikirim (idempotency)", () => {
        const result = (0, capa_effectiveness_verification_due_scan_1.findCapaEffectivenessVerificationDue)([
            {
                effectivenessVerificationId: "v1",
                result: "PENDING",
                verificationDueDate: new Date("2026-07-01"),
                dueReminderSentAt: new Date("2026-07-10"),
            },
        ], now);
        expect(result).toHaveLength(0);
    });
});
//# sourceMappingURL=capa-effectiveness-verification-due-scan.spec.js.map