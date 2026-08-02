"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asset_lifecycle_1 = require("./asset-lifecycle");
describe("shouldDeactivateSchedulesOnLifecycleChange (BR-01)", () => {
    it("true untuk RETIRED", () => {
        expect((0, asset_lifecycle_1.shouldDeactivateSchedulesOnLifecycleChange)("RETIRED")).toBe(true);
    });
    it("true untuk DISPOSED", () => {
        expect((0, asset_lifecycle_1.shouldDeactivateSchedulesOnLifecycleChange)("DISPOSED")).toBe(true);
    });
    it("false untuk ACTIVE/UNDER_MAINTENANCE/STANDBY", () => {
        expect((0, asset_lifecycle_1.shouldDeactivateSchedulesOnLifecycleChange)("ACTIVE")).toBe(false);
        expect((0, asset_lifecycle_1.shouldDeactivateSchedulesOnLifecycleChange)("UNDER_MAINTENANCE")).toBe(false);
        expect((0, asset_lifecycle_1.shouldDeactivateSchedulesOnLifecycleChange)("STANDBY")).toBe(false);
    });
});
describe("isSafetyCriticalNewlyFlagged (BR-02)", () => {
    it("true HANYA transisi false->true", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalNewlyFlagged)(false, true)).toBe(true);
    });
    it("false utk true->true (sudah kritis, bukan transisi baru)", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalNewlyFlagged)(true, true)).toBe(false);
    });
    it("false utk true->false (unflag, bukan literal 'menjadi true')", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalNewlyFlagged)(true, false)).toBe(false);
    });
    it("false utk false->false", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalNewlyFlagged)(false, false)).toBe(false);
    });
});
describe("requiresDisposalWorkflow (BR-03)", () => {
    it("true kalau DISPOSED DAN kategori mewajibkan approval", () => {
        expect((0, asset_lifecycle_1.requiresDisposalWorkflow)("DISPOSED", true)).toBe(true);
    });
    it("false kalau DISPOSED tapi kategori TIDAK mewajibkan approval", () => {
        expect((0, asset_lifecycle_1.requiresDisposalWorkflow)("DISPOSED", false)).toBe(false);
    });
    it("false kalau kategori mewajibkan approval TAPI status bukan DISPOSED", () => {
        expect((0, asset_lifecycle_1.requiresDisposalWorkflow)("RETIRED", true)).toBe(false);
        expect((0, asset_lifecycle_1.requiresDisposalWorkflow)("ACTIVE", true)).toBe(false);
    });
});
describe("isSafetyCriticalOutOfServiceAlertRequired (BR-04)", () => {
    it("true HANYA irisan is_safety_critical=true DAN OUT_OF_SERVICE", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalOutOfServiceAlertRequired)(true, "OUT_OF_SERVICE")).toBe(true);
    });
    it("false kalau safety-critical tapi kondisi bukan OUT_OF_SERVICE", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalOutOfServiceAlertRequired)(true, "POOR")).toBe(false);
        expect((0, asset_lifecycle_1.isSafetyCriticalOutOfServiceAlertRequired)(true, "GOOD")).toBe(false);
    });
    it("false kalau OUT_OF_SERVICE tapi aset TIDAK safety-critical", () => {
        expect((0, asset_lifecycle_1.isSafetyCriticalOutOfServiceAlertRequired)(false, "OUT_OF_SERVICE")).toBe(false);
    });
});
describe("calculateNextDueDate", () => {
    const base = new Date("2026-08-01T00:00:00.000Z");
    it("DAYS — menambah hari kalender", () => {
        const result = (0, asset_lifecycle_1.calculateNextDueDate)(base, "DAYS", 30);
        expect(result?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    });
    it("WEEKS — menambah 7x nilai dalam hari", () => {
        const result = (0, asset_lifecycle_1.calculateNextDueDate)(base, "WEEKS", 2);
        expect(result?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
    });
    it("MONTHS — menambah bulan kalender", () => {
        const result = (0, asset_lifecycle_1.calculateNextDueDate)(base, "MONTHS", 6);
        expect(result?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
    });
    it("RUNNING_HOURS — mengembalikan null (tidak ada kolom jam-operasi di skema)", () => {
        expect((0, asset_lifecycle_1.calculateNextDueDate)(base, "RUNNING_HOURS", 500)).toBeNull();
    });
    it("tidak memutasi Date input", () => {
        const original = new Date(base);
        (0, asset_lifecycle_1.calculateNextDueDate)(base, "DAYS", 10);
        expect(base.toISOString()).toBe(original.toISOString());
    });
});
describe("isMaintenanceDueSoon (PRD §8 H-7)", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    it("true tepat di hari-H (0 hari lagi)", () => {
        expect((0, asset_lifecycle_1.isMaintenanceDueSoon)(now, now)).toBe(true);
    });
    it("true tepat H-7", () => {
        expect((0, asset_lifecycle_1.isMaintenanceDueSoon)(new Date("2026-08-08T00:00:00.000Z"), now)).toBe(true);
    });
    it("false H-8 (di luar jendela)", () => {
        expect((0, asset_lifecycle_1.isMaintenanceDueSoon)(new Date("2026-08-09T00:00:00.000Z"), now)).toBe(false);
    });
    it("false kalau sudah lewat (overdue, event terpisah)", () => {
        expect((0, asset_lifecycle_1.isMaintenanceDueSoon)(new Date("2026-07-31T00:00:00.000Z"), now)).toBe(false);
    });
});
describe("isMaintenanceOverdue", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    it("true kalau nextDueDate sudah lewat", () => {
        expect((0, asset_lifecycle_1.isMaintenanceOverdue)(new Date("2026-07-31T00:00:00.000Z"), now)).toBe(true);
    });
    it("false kalau nextDueDate persis sekarang atau di masa depan", () => {
        expect((0, asset_lifecycle_1.isMaintenanceOverdue)(now, now)).toBe(false);
        expect((0, asset_lifecycle_1.isMaintenanceOverdue)(new Date("2026-08-02T00:00:00.000Z"), now)).toBe(false);
    });
});
describe("calculateDaysOverdue", () => {
    it("menghitung selisih hari pembulatan ke bawah", () => {
        expect((0, asset_lifecycle_1.calculateDaysOverdue)(new Date("2026-07-25T00:00:00.000Z"), new Date("2026-08-01T00:00:00.000Z"))).toBe(7);
    });
    it("0 kalau belum overdue (tidak minus)", () => {
        expect((0, asset_lifecycle_1.calculateDaysOverdue)(new Date("2026-08-05T00:00:00.000Z"), new Date("2026-08-01T00:00:00.000Z"))).toBe(0);
    });
});
//# sourceMappingURL=asset-lifecycle.spec.js.map