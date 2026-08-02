"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_lifecycle_1 = require("./user-lifecycle");
describe("validateUserStatusTransition()", () => {
    it.each([
        ["INVITED", "ACTIVE"],
        ["ACTIVE", "SUSPENDED"],
        ["SUSPENDED", "ACTIVE"],
        ["ACTIVE", "DEACTIVATED"],
        ["SUSPENDED", "DEACTIVATED"],
    ])("mengizinkan %s -> %s", (from, to) => {
        expect(() => (0, user_lifecycle_1.validateUserStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["INVITED", "SUSPENDED"],
        ["INVITED", "DEACTIVATED"],
        ["DEACTIVATED", "ACTIVE"],
        ["DEACTIVATED", "SUSPENDED"],
        ["DEACTIVATED", "INVITED"],
        ["ACTIVE", "INVITED"],
    ])("menolak %s -> %s (BR-02)", (from, to) => {
        expect(() => (0, user_lifecycle_1.validateUserStatusTransition)(from, to)).toThrow(user_lifecycle_1.UserLifecycleError);
    });
    it("DEACTIVATED bersifat terminal — tidak ada transisi keluar yang diizinkan", () => {
        expect(() => (0, user_lifecycle_1.validateUserStatusTransition)("DEACTIVATED", "ACTIVE")).toThrow(user_lifecycle_1.UserLifecycleError);
        expect(() => (0, user_lifecycle_1.validateUserStatusTransition)("DEACTIVATED", "DEACTIVATED")).toThrow(user_lifecycle_1.UserLifecycleError);
    });
});
describe("validateTenantIdForUserType()", () => {
    it("BR-11: INTERNAL_EMPLOYEE tanpa tenantId ditolak", () => {
        expect(() => (0, user_lifecycle_1.validateTenantIdForUserType)("INTERNAL_EMPLOYEE", null)).toThrow("BR-11");
    });
    it("BR-11: CONTRACTOR/VISITOR tanpa tenantId ditolak", () => {
        expect(() => (0, user_lifecycle_1.validateTenantIdForUserType)("CONTRACTOR", null)).toThrow("BR-11");
        expect(() => (0, user_lifecycle_1.validateTenantIdForUserType)("VISITOR", null)).toThrow("BR-11");
    });
    it("BR-11: PLATFORM_ADMIN tanpa tenantId (NULL) diizinkan", () => {
        expect(() => (0, user_lifecycle_1.validateTenantIdForUserType)("PLATFORM_ADMIN", null)).not.toThrow();
    });
    it("BR-11: PLATFORM_ADMIN DENGAN tenantId tetap diizinkan (PRD tidak melarang arah ini)", () => {
        expect(() => (0, user_lifecycle_1.validateTenantIdForUserType)("PLATFORM_ADMIN", "11111111-1111-1111-1111-111111111111")).not.toThrow();
    });
    it("user biasa DENGAN tenantId lolos", () => {
        expect(() => (0, user_lifecycle_1.validateTenantIdForUserType)("INTERNAL_EMPLOYEE", "11111111-1111-1111-1111-111111111111")).not.toThrow();
    });
});
