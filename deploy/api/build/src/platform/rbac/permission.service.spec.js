"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const permission_service_1 = require("./permission.service");
class FakeCache {
    store = new Map();
    failGet = false;
    async get(userId) {
        if (this.failGet)
            throw new Error("cache down");
        return this.store.get(userId) ?? null;
    }
    async set(userId, value) {
        this.store.set(userId, value);
    }
    async invalidate(userId) {
        this.store.delete(userId);
    }
}
class FakeRepository {
    calls = 0;
    fail = false;
    result = [];
    async resolveUserRoleAssignments() {
        this.calls++;
        if (this.fail)
            throw new Error("db down");
        return this.result;
    }
}
// Task 1.1 — tidak ada test di file ini yang mengirim scopeContext, jadi
// PermissionService.hasPermission() tidak pernah benar-benar memanggil
// resolver ini (short-circuit di `if (!scopeContext)`) — stub kosong cukup,
// lihat scope-hierarchy.spec.ts / prisma-scope-hierarchy.resolver
// integration test untuk cakupan hierarki sungguhan.
class FakeHierarchyResolver {
    async resolveAncestors() {
        return undefined;
    }
    async resolveDescendantIds() {
        return [];
    }
}
describe("PermissionService", () => {
    const userId = (0, node_crypto_1.randomUUID)();
    const tenantId = (0, node_crypto_1.randomUUID)();
    const assignment = {
        roleId: (0, node_crypto_1.randomUUID)(),
        roleCode: "SUPER_ADMIN_PLATFORM",
        scopeType: "TENANT",
        scopeId: null,
        permissionCodes: ["user_mgmt.permission.manage"],
    };
    it("cache hit: repository TIDAK dipanggil", async () => {
        const cache = new FakeCache();
        cache.store.set(userId, [assignment]);
        const repo = new FakeRepository();
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        const result = await service.hasPermission(userId, tenantId, "user_mgmt.permission.manage");
        expect(result).toBe(true);
        expect(repo.calls).toBe(0);
    });
    it("cache miss (null): repository dipanggil, hasil di-cache", async () => {
        const cache = new FakeCache();
        const repo = new FakeRepository();
        repo.result = [assignment];
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        const result = await service.hasPermission(userId, tenantId, "user_mgmt.permission.manage");
        expect(result).toBe(true);
        expect(repo.calls).toBe(1);
        expect(cache.store.get(userId)).toEqual([assignment]);
    });
    it("fail closed #1: cache.get() throw -> tetap resolve via DB (bukan default-allow)", async () => {
        const cache = new FakeCache();
        cache.failGet = true;
        const repo = new FakeRepository();
        repo.result = [assignment];
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        const result = await service.hasPermission(userId, tenantId, "user_mgmt.permission.manage");
        expect(result).toBe(true);
        expect(repo.calls).toBe(1);
    });
    it("fail closed #2: repository throw -> ServiceUnavailableException (503), bukan bypass", async () => {
        const cache = new FakeCache();
        const repo = new FakeRepository();
        repo.fail = true;
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        await expect(service.hasPermission(userId, tenantId, "user_mgmt.permission.manage")).rejects.toThrow(common_1.ServiceUnavailableException);
    });
    it("resolusi kosong (user genuinely tanpa role) -> false, BUKAN 503", async () => {
        const cache = new FakeCache();
        const repo = new FakeRepository();
        repo.result = [];
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        await expect(service.hasPermission(userId, tenantId, "user_mgmt.permission.manage")).resolves.toBe(false);
    });
    it("userHasRole bekerja lewat resolusi yang sama", async () => {
        const cache = new FakeCache();
        const repo = new FakeRepository();
        repo.result = [assignment];
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        await expect(service.userHasRole(userId, tenantId, "SUPER_ADMIN_PLATFORM")).resolves.toBe(true);
        await expect(service.userHasRole(userId, tenantId, "HSE_OFFICER")).resolves.toBe(false);
    });
    it("invalidateCache menghapus entry cache", async () => {
        const cache = new FakeCache();
        cache.store.set(userId, [assignment]);
        const repo = new FakeRepository();
        const service = new permission_service_1.PermissionService(cache, repo, new FakeHierarchyResolver());
        await service.invalidateCache(userId);
        expect(cache.store.has(userId)).toBe(false);
    });
});
