"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const usage_quota_1 = require("./usage-quota");
describe("checkQuota() — BR-02", () => {
    it("maxValue NULL -> tidak pernah exceeded (unlimited)", () => {
        const result = (0, usage_quota_1.checkQuota)({ metricType: "ACTIVE_USERS", currentValue: 999999, maxValue: null });
        expect(result.exceeded).toBe(false);
    });
    it("currentValue di bawah maxValue -> tidak exceeded", () => {
        const result = (0, usage_quota_1.checkQuota)({ metricType: "ACTIVE_USERS", currentValue: 10, maxValue: 25 });
        expect(result.exceeded).toBe(false);
    });
    it("currentValue PERSIS sama dengan maxValue -> tidak exceeded (batas inklusif)", () => {
        const result = (0, usage_quota_1.checkQuota)({ metricType: "ACTIVE_SITES", currentValue: 3, maxValue: 3 });
        expect(result.exceeded).toBe(false);
    });
    it("currentValue melebihi maxValue -> exceeded", () => {
        const result = (0, usage_quota_1.checkQuota)({ metricType: "ACTIVE_SITES", currentValue: 4, maxValue: 3 });
        expect(result.exceeded).toBe(true);
    });
});
//# sourceMappingURL=usage-quota.spec.js.map