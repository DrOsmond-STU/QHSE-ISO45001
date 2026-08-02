"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeChallenge = computeChallenge;
exports.verifyPkce = verifyPkce;
const node_crypto_1 = require("node:crypto");
// RFC 7636 (PKCE) — dipakai Authorization Code Flow task 0.6 (TDD §8.1), juga
// untuk web app sendiri (bukan hanya SSO eksternal). Hanya method S256
// didukung — "plain" sengaja tidak diterima (tidak melindungi apa pun kalau
// code dicegat, satu-satunya alasan PKCE ada).
function base64url(input) {
    return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function computeChallenge(verifier) {
    return base64url((0, node_crypto_1.createHash)("sha256").update(verifier).digest());
}
function verifyPkce(verifier, challenge, method) {
    if (method !== "S256") {
        return false;
    }
    const expected = computeChallenge(verifier);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(challenge);
    if (expectedBuf.length !== actualBuf.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(expectedBuf, actualBuf);
}
//# sourceMappingURL=pkce.util.js.map