"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const token_service_1 = require("./token.service");
const auth_constants_1 = require("./auth.constants");
describe("TokenService", () => {
    const jwtService = new jwt_1.JwtService({ secret: "test-secret-not-for-production" });
    const service = new token_service_1.TokenService(jwtService);
    it("klaim access token sesuai TDD §8.1: sub, tenant_id, scope_roles, sid, iat, exp", () => {
        const sub = (0, node_crypto_1.randomUUID)();
        const tenantId = (0, node_crypto_1.randomUUID)();
        const sid = (0, node_crypto_1.randomUUID)();
        const token = service.signAccessToken({
            sub,
            tenant_id: tenantId,
            scope_roles: ["hse_manager"],
            sid,
        });
        const claims = service.verifyAccessToken(token);
        expect(claims.sub).toBe(sub);
        expect(claims.tenant_id).toBe(tenantId);
        expect(claims.scope_roles).toEqual(["hse_manager"]);
        expect(claims.sid).toBe(sid);
        expect(typeof claims.iat).toBe("number");
        expect(typeof claims.exp).toBe("number");
    });
    it("TTL access token persis 15 menit (900 detik)", () => {
        const token = service.signAccessToken({
            sub: (0, node_crypto_1.randomUUID)(),
            tenant_id: (0, node_crypto_1.randomUUID)(),
            scope_roles: [],
            sid: (0, node_crypto_1.randomUUID)(),
        });
        const claims = service.verifyAccessToken(token);
        expect(claims.exp - claims.iat).toBe(auth_constants_1.ACCESS_TOKEN_TTL_SECONDS);
    });
    it("verifyAccessToken menolak token yang di-tamper", () => {
        const token = service.signAccessToken({
            sub: (0, node_crypto_1.randomUUID)(),
            tenant_id: (0, node_crypto_1.randomUUID)(),
            scope_roles: [],
            sid: (0, node_crypto_1.randomUUID)(),
        });
        const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
        expect(() => service.verifyAccessToken(tampered)).toThrow();
    });
});
