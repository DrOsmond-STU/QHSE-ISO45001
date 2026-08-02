"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsa_work_permit_validation_1 = require("./jsa-work-permit-validation");
describe("assertJsaValidForWorkPermitAttachment (BR-08)", () => {
    it.each(["EXPIRED", "DRAFT"])("throws for status=%s", (status) => {
        expect(() => (0, jsa_work_permit_validation_1.assertJsaValidForWorkPermitAttachment)(status)).toThrow(/BR-08/);
    });
    it.each(["APPROVED", "ACTIVE"])("allows status=%s", (status) => {
        expect(() => (0, jsa_work_permit_validation_1.assertJsaValidForWorkPermitAttachment)(status)).not.toThrow();
    });
    it("throws for ARCHIVED (not explicitly listed but clearly not a valid attachment state)", () => {
        // ARCHIVED bukan EXPIRED/DRAFT literal BR-08, TAPI logically juga tidak
        // valid — didokumentasikan sbg keputusan LITERAL (hanya EXPIRED/DRAFT
        // diblokir sesuai teks PRD), ARCHIVED TIDAK diblokir oleh fungsi ini
        // (gap TDD §26 kalau ternyata perlu).
        expect(() => (0, jsa_work_permit_validation_1.assertJsaValidForWorkPermitAttachment)("ARCHIVED")).not.toThrow();
    });
});
