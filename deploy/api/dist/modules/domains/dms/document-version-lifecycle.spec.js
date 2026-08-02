"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_version_lifecycle_1 = require("./document-version-lifecycle");
describe("validateDocumentVersionStatusTransition", () => {
    it.each([
        ["DRAFT", "PENDING_APPROVAL"],
        ["PENDING_APPROVAL", "APPROVED"],
        ["PENDING_APPROVAL", "REJECTED"],
        ["APPROVED", "PUBLISHED"],
        ["PUBLISHED", "SUPERSEDED"],
    ])("mengizinkan %s -> %s", (from, to) => {
        expect(() => (0, document_version_lifecycle_1.validateDocumentVersionStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["DRAFT", "PUBLISHED"],
        ["DRAFT", "APPROVED"],
        ["PENDING_APPROVAL", "PUBLISHED"],
        ["REJECTED", "PENDING_APPROVAL"],
        ["SUPERSEDED", "PUBLISHED"],
        ["PUBLISHED", "DRAFT"],
    ])("menolak %s -> %s", (from, to) => {
        expect(() => (0, document_version_lifecycle_1.validateDocumentVersionStatusTransition)(from, to)).toThrow();
    });
});
describe("assertCanBeCurrentVersion (BR-02)", () => {
    it("lolos untuk PUBLISHED", () => {
        expect(() => (0, document_version_lifecycle_1.assertCanBeCurrentVersion)("PUBLISHED")).not.toThrow();
    });
    it.each(["DRAFT", "PENDING_APPROVAL", "APPROVED", "SUPERSEDED", "REJECTED"])("menolak %s", (status) => {
        expect(() => (0, document_version_lifecycle_1.assertCanBeCurrentVersion)(status)).toThrow();
    });
});
describe("computeNextVersionNumber", () => {
    it("dokumen baru (previous null) -> 1.0 terlepas dari bump", () => {
        expect((0, document_version_lifecycle_1.computeNextVersionNumber)(null, "MAJOR")).toEqual({ majorVersion: 1, minorVersion: 0 });
        expect((0, document_version_lifecycle_1.computeNextVersionNumber)(null, "MINOR")).toEqual({ majorVersion: 1, minorVersion: 0 });
    });
    it("MAJOR bump -> major+1, minor reset ke 0", () => {
        expect((0, document_version_lifecycle_1.computeNextVersionNumber)({ majorVersion: 2, minorVersion: 3 }, "MAJOR")).toEqual({
            majorVersion: 3,
            minorVersion: 0,
        });
    });
    it("MINOR bump -> major tetap, minor+1", () => {
        expect((0, document_version_lifecycle_1.computeNextVersionNumber)({ majorVersion: 2, minorVersion: 3 }, "MINOR")).toEqual({
            majorVersion: 2,
            minorVersion: 4,
        });
    });
});
//# sourceMappingURL=document-version-lifecycle.spec.js.map