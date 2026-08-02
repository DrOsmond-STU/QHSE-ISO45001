"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cors_origin_1 = require("./cors-origin");
describe("extractOriginHostname() — TDD §16", () => {
    it("origin https standar -> hostname polos", () => {
        expect((0, cors_origin_1.extractOriginHostname)("https://acme.qhse.example.com")).toBe("acme.qhse.example.com");
    });
    it("origin dgn port -> port diabaikan, hostname saja", () => {
        expect((0, cors_origin_1.extractOriginHostname)("http://localhost:3000")).toBe("localhost");
    });
    it("hostname dinormalisasi lowercase", () => {
        expect((0, cors_origin_1.extractOriginHostname)("https://ACME.Example.COM")).toBe("acme.example.com");
    });
    it("origin bukan URL valid -> null (fail-safe, bukan throw)", () => {
        expect((0, cors_origin_1.extractOriginHostname)("bukan-url-sama-sekali")).toBeNull();
    });
    it("string kosong -> null", () => {
        expect((0, cors_origin_1.extractOriginHostname)("")).toBeNull();
    });
});
//# sourceMappingURL=cors-origin.spec.js.map