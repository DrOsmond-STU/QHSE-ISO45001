import { assertRequesterNotApprover } from "./work-permit-segregation-of-duty";

describe("assertRequesterNotApprover — BR-09", () => {
  it("melempar kalau actingUserId sama dengan requesterId", () => {
    expect(() => assertRequesterNotApprover("user-1", "user-1")).toThrow();
  });

  it("tidak melempar kalau actingUserId beda dari requesterId", () => {
    expect(() => assertRequesterNotApprover("user-1", "user-2")).not.toThrow();
  });
});
