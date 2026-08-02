"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_segregation_of_duty_1 = require("./work-permit-segregation-of-duty");
describe("assertRequesterNotApprover — BR-09", () => {
    it("melempar kalau actingUserId sama dengan requesterId", () => {
        expect(() => (0, work_permit_segregation_of_duty_1.assertRequesterNotApprover)("user-1", "user-1")).toThrow();
    });
    it("tidak melempar kalau actingUserId beda dari requesterId", () => {
        expect(() => (0, work_permit_segregation_of_duty_1.assertRequesterNotApprover)("user-1", "user-2")).not.toThrow();
    });
});
