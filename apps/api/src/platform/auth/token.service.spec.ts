import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { TokenService } from "./token.service";
import { ACCESS_TOKEN_TTL_SECONDS } from "./auth.constants";

describe("TokenService", () => {
  const jwtService = new JwtService({ secret: "test-secret-not-for-production" });
  const service = new TokenService(jwtService);

  it("klaim access token sesuai TDD §8.1: sub, tenant_id, scope_roles, sid, iat, exp", () => {
    const sub = randomUUID();
    const tenantId = randomUUID();
    const sid = randomUUID();

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
      sub: randomUUID(),
      tenant_id: randomUUID(),
      scope_roles: [],
      sid: randomUUID(),
    });
    const claims = service.verifyAccessToken(token);
    expect(claims.exp - claims.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });

  it("verifyAccessToken menolak token yang di-tamper", () => {
    const token = service.signAccessToken({
      sub: randomUUID(),
      tenant_id: randomUUID(),
      scope_roles: [],
      sid: randomUUID(),
    });
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(() => service.verifyAccessToken(tampered)).toThrow();
  });
});
