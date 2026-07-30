import {
  assertDataImportJobIsRetryable,
  DataImportLifecycleError,
  validateDataImportJobStatusTransition,
} from "./data-import-lifecycle";

describe("validateDataImportJobStatusTransition() — TDD §20 fase VALIDATING/IMPORTING", () => {
  it("UPLOADED -> VALIDATING diizinkan", () => {
    expect(() => validateDataImportJobStatusTransition("UPLOADED", "VALIDATING")).not.toThrow();
  });

  it("VALIDATING -> VALIDATED diizinkan", () => {
    expect(() => validateDataImportJobStatusTransition("VALIDATING", "VALIDATED")).not.toThrow();
  });

  it("VALIDATING -> FAILED diizinkan (kegagalan level-file)", () => {
    expect(() => validateDataImportJobStatusTransition("VALIDATING", "FAILED")).not.toThrow();
  });

  it("VALIDATED -> IMPORTING diizinkan (confirmImport)", () => {
    expect(() => validateDataImportJobStatusTransition("VALIDATED", "IMPORTING")).not.toThrow();
  });

  it("IMPORTING -> COMPLETED_WITH_ERRORS diizinkan", () => {
    expect(() => validateDataImportJobStatusTransition("IMPORTING", "COMPLETED_WITH_ERRORS")).not.toThrow();
  });

  it("UPLOADED -> IMPORTING (loncat fase validasi) DITOLAK", () => {
    expect(() => validateDataImportJobStatusTransition("UPLOADED", "IMPORTING")).toThrow(DataImportLifecycleError);
  });

  it("COMPLETED -> apa pun DITOLAK (terminal)", () => {
    expect(() => validateDataImportJobStatusTransition("COMPLETED", "IMPORTING")).toThrow(DataImportLifecycleError);
  });

  it("FAILED -> apa pun DITOLAK (terminal, retry adalah job baru bukan transisi)", () => {
    expect(() => validateDataImportJobStatusTransition("FAILED", "VALIDATING")).toThrow(DataImportLifecycleError);
  });
});

describe("assertDataImportJobIsRetryable() — BR-03", () => {
  it("COMPLETED_WITH_ERRORS boleh di-retry", () => {
    expect(() => assertDataImportJobIsRetryable("COMPLETED_WITH_ERRORS")).not.toThrow();
  });

  it("FAILED boleh di-retry", () => {
    expect(() => assertDataImportJobIsRetryable("FAILED")).not.toThrow();
  });

  it("COMPLETED (sukses total) DITOLAK — tidak ada yang perlu diperbaiki", () => {
    expect(() => assertDataImportJobIsRetryable("COMPLETED")).toThrow(DataImportLifecycleError);
  });

  it("VALIDATING (belum selesai) DITOLAK", () => {
    expect(() => assertDataImportJobIsRetryable("VALIDATING")).toThrow(DataImportLifecycleError);
  });
});
