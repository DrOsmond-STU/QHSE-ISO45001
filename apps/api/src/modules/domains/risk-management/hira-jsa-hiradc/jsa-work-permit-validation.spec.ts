import { assertJsaValidForWorkPermitAttachment } from "./jsa-work-permit-validation";

describe("assertJsaValidForWorkPermitAttachment (BR-08)", () => {
  it.each(["EXPIRED", "DRAFT"] as const)("throws for status=%s", (status) => {
    expect(() => assertJsaValidForWorkPermitAttachment(status)).toThrow(/BR-08/);
  });

  it.each(["APPROVED", "ACTIVE"] as const)("allows status=%s", (status) => {
    expect(() => assertJsaValidForWorkPermitAttachment(status)).not.toThrow();
  });

  it("throws for ARCHIVED (not explicitly listed but clearly not a valid attachment state)", () => {
    // ARCHIVED bukan EXPIRED/DRAFT literal BR-08, TAPI logically juga tidak
    // valid — didokumentasikan sbg keputusan LITERAL (hanya EXPIRED/DRAFT
    // diblokir sesuai teks PRD), ARCHIVED TIDAK diblokir oleh fungsi ini
    // (gap TDD §26 kalau ternyata perlu).
    expect(() => assertJsaValidForWorkPermitAttachment("ARCHIVED")).not.toThrow();
  });
});
