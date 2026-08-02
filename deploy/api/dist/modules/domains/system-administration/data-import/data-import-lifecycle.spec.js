"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_import_lifecycle_1 = require("./data-import-lifecycle");
describe("validateDataImportJobStatusTransition() — TDD §20 fase VALIDATING/IMPORTING", () => {
    it("UPLOADED -> VALIDATING diizinkan", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("UPLOADED", "VALIDATING")).not.toThrow();
    });
    it("VALIDATING -> VALIDATED diizinkan", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("VALIDATING", "VALIDATED")).not.toThrow();
    });
    it("VALIDATING -> FAILED diizinkan (kegagalan level-file)", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("VALIDATING", "FAILED")).not.toThrow();
    });
    it("VALIDATED -> IMPORTING diizinkan (confirmImport)", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("VALIDATED", "IMPORTING")).not.toThrow();
    });
    it("IMPORTING -> COMPLETED_WITH_ERRORS diizinkan", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("IMPORTING", "COMPLETED_WITH_ERRORS")).not.toThrow();
    });
    it("UPLOADED -> IMPORTING (loncat fase validasi) DITOLAK", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("UPLOADED", "IMPORTING")).toThrow(data_import_lifecycle_1.DataImportLifecycleError);
    });
    it("COMPLETED -> apa pun DITOLAK (terminal)", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("COMPLETED", "IMPORTING")).toThrow(data_import_lifecycle_1.DataImportLifecycleError);
    });
    it("FAILED -> apa pun DITOLAK (terminal, retry adalah job baru bukan transisi)", () => {
        expect(() => (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)("FAILED", "VALIDATING")).toThrow(data_import_lifecycle_1.DataImportLifecycleError);
    });
});
describe("assertDataImportJobIsRetryable() — BR-03", () => {
    it("COMPLETED_WITH_ERRORS boleh di-retry", () => {
        expect(() => (0, data_import_lifecycle_1.assertDataImportJobIsRetryable)("COMPLETED_WITH_ERRORS")).not.toThrow();
    });
    it("FAILED boleh di-retry", () => {
        expect(() => (0, data_import_lifecycle_1.assertDataImportJobIsRetryable)("FAILED")).not.toThrow();
    });
    it("COMPLETED (sukses total) DITOLAK — tidak ada yang perlu diperbaiki", () => {
        expect(() => (0, data_import_lifecycle_1.assertDataImportJobIsRetryable)("COMPLETED")).toThrow(data_import_lifecycle_1.DataImportLifecycleError);
    });
    it("VALIDATING (belum selesai) DITOLAK", () => {
        expect(() => (0, data_import_lifecycle_1.assertDataImportJobIsRetryable)("VALIDATING")).toThrow(data_import_lifecycle_1.DataImportLifecycleError);
    });
});
//# sourceMappingURL=data-import-lifecycle.spec.js.map