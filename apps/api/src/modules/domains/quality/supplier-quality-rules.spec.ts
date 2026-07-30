import { assertCapaRequiredForRating, validateSupplierRecordStatusTransition } from "./supplier-quality-rules";

describe("validateSupplierRecordStatusTransition", () => {
  it("mengizinkan alur penuh DRAFT->SUBMITTED->APPROVED->ARCHIVED", () => {
    expect(() => validateSupplierRecordStatusTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => validateSupplierRecordStatusTransition("SUBMITTED", "APPROVED")).not.toThrow();
    expect(() => validateSupplierRecordStatusTransition("APPROVED", "ARCHIVED")).not.toThrow();
  });

  it("mengizinkan SUBMITTED kembali ke DRAFT (reject/revisi)", () => {
    expect(() => validateSupplierRecordStatusTransition("SUBMITTED", "DRAFT")).not.toThrow();
  });

  it("menolak lompat DRAFT langsung ke APPROVED", () => {
    expect(() => validateSupplierRecordStatusTransition("DRAFT", "APPROVED")).toThrow(/tidak valid/);
  });
});

describe("assertCapaRequiredForRating", () => {
  it("menolak rating CONDITIONAL/SUSPENDED tanpa capa_id", () => {
    expect(() => assertCapaRequiredForRating("CONDITIONAL", null)).toThrow();
    expect(() => assertCapaRequiredForRating("SUSPENDED", null)).toThrow();
  });

  it("mengizinkan rating APPROVED/DISQUALIFIED tanpa capa_id", () => {
    expect(() => assertCapaRequiredForRating("APPROVED", null)).not.toThrow();
    expect(() => assertCapaRequiredForRating("DISQUALIFIED", null)).not.toThrow();
  });
});
