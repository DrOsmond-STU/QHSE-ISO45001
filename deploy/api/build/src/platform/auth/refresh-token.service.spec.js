"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const refresh_token_service_1 = require("./refresh-token.service");
class InMemorySessionStore {
    store = new Map();
    key(userId, sessionId) {
        return `${userId}:${sessionId}`;
    }
    async get(userId, sessionId) {
        return this.store.get(this.key(userId, sessionId)) ?? null;
    }
    async set(userId, sessionId, record) {
        this.store.set(this.key(userId, sessionId), record);
    }
    async delete(userId, sessionId) {
        this.store.delete(this.key(userId, sessionId));
    }
    async deleteAllForUser(userId) {
        for (const key of this.store.keys()) {
            if (key.startsWith(`${userId}:`)) {
                this.store.delete(key);
            }
        }
    }
}
describe("RefreshTokenService", () => {
    const TTL = 3600;
    const resolveTtl = async () => TTL;
    it("rotasi dengan token yang benar berhasil dan mengembalikan token baru", async () => {
        const store = new InMemorySessionStore();
        const service = new refresh_token_service_1.RefreshTokenService(store);
        const userId = (0, node_crypto_1.randomUUID)();
        const tenantId = (0, node_crypto_1.randomUUID)();
        const sessionId = (0, node_crypto_1.randomUUID)();
        const initialToken = await service.issue(userId, tenantId, sessionId, TTL);
        const result = await service.rotate(initialToken, resolveTtl);
        expect(result.userId).toBe(userId);
        expect(result.tenantId).toBe(tenantId);
        expect(result.sessionId).toBe(sessionId);
        expect(result.refreshToken).not.toBe(initialToken);
        // Token baru bisa dipakai rotasi berikutnya.
        const secondRotate = await service.rotate(result.refreshToken, resolveTtl);
        expect(secondRotate.refreshToken).not.toBe(result.refreshToken);
    });
    it("replay token lama (sudah di-rotate) memicu revoke SELURUH sesi user, termasuk sesi lain yang tidak terkait", async () => {
        const store = new InMemorySessionStore();
        const service = new refresh_token_service_1.RefreshTokenService(store);
        const userId = (0, node_crypto_1.randomUUID)();
        const tenantId = (0, node_crypto_1.randomUUID)();
        // Dua sesi independen untuk user yang sama (mis. login dari 2 device).
        const sessionA = (0, node_crypto_1.randomUUID)();
        const sessionB = (0, node_crypto_1.randomUUID)();
        const tokenA1 = await service.issue(userId, tenantId, sessionA, TTL);
        const tokenB1 = await service.issue(userId, tenantId, sessionB, TTL);
        // Rotasi sesi A sekali (tokenA1 jadi "lama").
        const tokenA2 = await service.rotate(tokenA1, resolveTtl);
        expect(await service.isSessionAlive(userId, sessionA)).toBe(true);
        expect(await service.isSessionAlive(userId, sessionB)).toBe(true);
        // Replay tokenA1 (sudah tidak current) — harus gagal DAN meng-cascade
        // revoke ke seluruh sesi user, termasuk sesi B yang independen.
        await expect(service.rotate(tokenA1, resolveTtl)).rejects.toThrow(/reuse/i);
        expect(await service.isSessionAlive(userId, sessionA)).toBe(false);
        expect(await service.isSessionAlive(userId, sessionB)).toBe(false);
        // Refresh token hasil rotasi terakhir sesi A pun ikut mati (revoke total).
        await expect(service.rotate(tokenA2.refreshToken, resolveTtl)).rejects.toThrow();
        await expect(service.rotate(tokenB1, resolveTtl)).rejects.toThrow();
    });
    it("presentasi token untuk sesi yang tidak ada/sudah revoked gagal tertutup (fail closed)", async () => {
        const store = new InMemorySessionStore();
        const service = new refresh_token_service_1.RefreshTokenService(store);
        const userId = (0, node_crypto_1.randomUUID)();
        const tenantId = (0, node_crypto_1.randomUUID)();
        const sessionId = (0, node_crypto_1.randomUUID)();
        const token = await service.issue(userId, tenantId, sessionId, TTL);
        await service.revokeSession(userId, sessionId);
        await expect(service.rotate(token, resolveTtl)).rejects.toThrow();
    });
    it("menolak token yang formatnya rusak", async () => {
        const store = new InMemorySessionStore();
        const service = new refresh_token_service_1.RefreshTokenService(store);
        await expect(service.rotate("bukan-format-token-yang-valid", resolveTtl)).rejects.toThrow();
    });
});
