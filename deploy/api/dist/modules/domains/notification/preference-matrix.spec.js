"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_category_1 = require("./event-category");
const preference_matrix_1 = require("./preference-matrix");
describe("buildPreferenceMatrix() — Modul 25 §5/§12 & BR-02", () => {
    it("menghasilkan 4 cell per kategori (IN_APP + EMAIL + WHATSAPP + TELEGRAM)", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([]);
        expect(matrix).toHaveLength(event_category_1.EVENT_CATEGORIES.length * 4);
    });
    it("BR-02: cell IN_APP SELALU isEnabled=true, editable=false, tanpa baris DB apa pun", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([]);
        const inAppCells = matrix.filter((c) => c.channelCode === "IN_APP");
        expect(inAppCells).toHaveLength(event_category_1.EVENT_CATEGORIES.length);
        expect(inAppCells.every((c) => c.isEnabled === true && c.editable === false)).toBe(true);
    });
    it("channel eksternal TANPA baris preferensi -> isEnabled=false (opt-in bukan opt-out, cocok resolveAdditionalChannels)", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([]);
        const emailCells = matrix.filter((c) => c.channelCode === "EMAIL");
        expect(emailCells.every((c) => c.isEnabled === false && c.editable === true)).toBe(true);
    });
    it("channel eksternal DENGAN baris preferensi isEnabled=true -> tercermin di cell", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([
            { eventCategory: "INCIDENT", channelCode: "WHATSAPP", isEnabled: true, deliveryMode: "REAL_TIME", quietHoursStart: null, quietHoursEnd: null },
        ]);
        const cell = matrix.find((c) => c.eventCategory === "INCIDENT" && c.channelCode === "WHATSAPP");
        expect(cell.isEnabled).toBe(true);
        expect(cell.deliveryMode).toBe("REAL_TIME");
    });
    it("baris preferensi eksplisit isEnabled=false -> cell tetap false (bukan cuma absennya baris)", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([
            { eventCategory: "TRAINING", channelCode: "EMAIL", isEnabled: false, deliveryMode: "REAL_TIME", quietHoursStart: null, quietHoursEnd: null },
        ]);
        const cell = matrix.find((c) => c.eventCategory === "TRAINING" && c.channelCode === "EMAIL");
        expect(cell.isEnabled).toBe(false);
    });
    it("quiet hours dari baris existing tercermin di cell", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([
            {
                eventCategory: "CAPA",
                channelCode: "TELEGRAM",
                isEnabled: true,
                deliveryMode: "DIGEST_DAILY",
                quietHoursStart: "22:00",
                quietHoursEnd: "07:00",
            },
        ]);
        const cell = matrix.find((c) => c.eventCategory === "CAPA" && c.channelCode === "TELEGRAM");
        expect(cell.quietHoursStart).toBe("22:00");
        expect(cell.quietHoursEnd).toBe("07:00");
        expect(cell.deliveryMode).toBe("DIGEST_DAILY");
    });
    it("baris preferensi utk kategori/channel yang tidak diminta tidak memengaruhi cell lain", () => {
        const matrix = (0, preference_matrix_1.buildPreferenceMatrix)([
            { eventCategory: "INCIDENT", channelCode: "EMAIL", isEnabled: true, deliveryMode: "REAL_TIME", quietHoursStart: null, quietHoursEnd: null },
        ]);
        const otherCell = matrix.find((c) => c.eventCategory === "AUDIT" && c.channelCode === "EMAIL");
        expect(otherCell.isEnabled).toBe(false);
    });
});
//# sourceMappingURL=preference-matrix.spec.js.map