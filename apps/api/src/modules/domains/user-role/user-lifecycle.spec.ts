import { UserLifecycleError, validateTenantIdForUserType, validateUserStatusTransition } from "./user-lifecycle";

describe("validateUserStatusTransition()", () => {
  it.each([
    ["INVITED", "ACTIVE"],
    ["ACTIVE", "SUSPENDED"],
    ["SUSPENDED", "ACTIVE"],
    ["ACTIVE", "DEACTIVATED"],
    ["SUSPENDED", "DEACTIVATED"],
  ] as const)("mengizinkan %s -> %s", (from, to) => {
    expect(() => validateUserStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["INVITED", "SUSPENDED"],
    ["INVITED", "DEACTIVATED"],
    ["DEACTIVATED", "ACTIVE"],
    ["DEACTIVATED", "SUSPENDED"],
    ["DEACTIVATED", "INVITED"],
    ["ACTIVE", "INVITED"],
  ] as const)("menolak %s -> %s (BR-02)", (from, to) => {
    expect(() => validateUserStatusTransition(from, to)).toThrow(UserLifecycleError);
  });

  it("DEACTIVATED bersifat terminal — tidak ada transisi keluar yang diizinkan", () => {
    expect(() => validateUserStatusTransition("DEACTIVATED", "ACTIVE")).toThrow(UserLifecycleError);
    expect(() => validateUserStatusTransition("DEACTIVATED", "DEACTIVATED")).toThrow(UserLifecycleError);
  });
});

describe("validateTenantIdForUserType()", () => {
  it("BR-11: INTERNAL_EMPLOYEE tanpa tenantId ditolak", () => {
    expect(() => validateTenantIdForUserType("INTERNAL_EMPLOYEE", null)).toThrow("BR-11");
  });

  it("BR-11: CONTRACTOR/VISITOR tanpa tenantId ditolak", () => {
    expect(() => validateTenantIdForUserType("CONTRACTOR", null)).toThrow("BR-11");
    expect(() => validateTenantIdForUserType("VISITOR", null)).toThrow("BR-11");
  });

  it("BR-11: PLATFORM_ADMIN tanpa tenantId (NULL) diizinkan", () => {
    expect(() => validateTenantIdForUserType("PLATFORM_ADMIN", null)).not.toThrow();
  });

  it("BR-11: PLATFORM_ADMIN DENGAN tenantId tetap diizinkan (PRD tidak melarang arah ini)", () => {
    expect(() => validateTenantIdForUserType("PLATFORM_ADMIN", "11111111-1111-1111-1111-111111111111")).not.toThrow();
  });

  it("user biasa DENGAN tenantId lolos", () => {
    expect(() => validateTenantIdForUserType("INTERNAL_EMPLOYEE", "11111111-1111-1111-1111-111111111111")).not.toThrow();
  });
});
