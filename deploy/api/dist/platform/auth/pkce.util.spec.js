"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const pkce_util_1 = require("./pkce.util");
function randomVerifier() {
    return (0, node_crypto_1.randomBytes)(32).toString("base64url");
}
describe("pkce.util", () => {
    it("verifyPkce menerima verifier yang benar (S256)", () => {
        const verifier = randomVerifier();
        const challenge = (0, pkce_util_1.computeChallenge)(verifier);
        expect((0, pkce_util_1.verifyPkce)(verifier, challenge, "S256")).toBe(true);
    });
    it("verifyPkce menolak verifier yang salah", () => {
        const challenge = (0, pkce_util_1.computeChallenge)(randomVerifier());
        expect((0, pkce_util_1.verifyPkce)(randomVerifier(), challenge, "S256")).toBe(false);
    });
    it("verifyPkce menolak method selain S256", () => {
        const verifier = randomVerifier();
        const challenge = (0, pkce_util_1.computeChallenge)(verifier);
        expect((0, pkce_util_1.verifyPkce)(verifier, challenge, "plain")).toBe(false);
    });
    it("computeChallenge deterministik untuk verifier yang sama", () => {
        const verifier = randomVerifier();
        expect((0, pkce_util_1.computeChallenge)(verifier)).toBe((0, pkce_util_1.computeChallenge)(verifier));
    });
});
//# sourceMappingURL=pkce.util.spec.js.map