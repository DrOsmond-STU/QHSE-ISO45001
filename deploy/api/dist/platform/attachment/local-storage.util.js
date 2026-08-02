"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocalStorageToken = createLocalStorageToken;
exports.verifyLocalStorageToken = verifyLocalStorageToken;
const node_crypto_1 = require("node:crypto");
function sign(payload, secret) {
    return (0, node_crypto_1.createHmac)("sha256", secret).update(payload).digest("hex");
}
function createLocalStorageToken(payload, secret) {
    const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${json}.${sign(json, secret)}`;
}
function verifyLocalStorageToken(token, secret) {
    const parts = token.split(".");
    if (parts.length !== 2)
        return null;
    const [json, providedSig] = parts;
    const expectedSig = sign(json, secret);
    const a = Buffer.from(providedSig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !(0, node_crypto_1.timingSafeEqual)(a, b))
        return null;
    try {
        const payload = JSON.parse(Buffer.from(json, "base64url").toString());
        if (payload.exp <= Date.now())
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=local-storage.util.js.map