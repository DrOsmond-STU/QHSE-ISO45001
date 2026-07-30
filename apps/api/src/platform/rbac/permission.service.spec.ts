import { ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PermissionCache } from "./permission-cache.interface";
import { PermissionRepository } from "./permission-repository.interface";
import { PermissionService } from "./permission.service";
import { ResolvedRoleAssignment } from "./permission-resolution";
import { ScopeHierarchyResolver } from "./scope-hierarchy-resolver.interface";

class FakeCache implements PermissionCache {
  store = new Map<string, ResolvedRoleAssignment[]>();
  failGet = false;

  async get(userId: string): Promise<ResolvedRoleAssignment[] | null> {
    if (this.failGet) throw new Error("cache down");
    return this.store.get(userId) ?? null;
  }
  async set(userId: string, value: ResolvedRoleAssignment[]): Promise<void> {
    this.store.set(userId, value);
  }
  async invalidate(userId: string): Promise<void> {
    this.store.delete(userId);
  }
}

class FakeRepository implements PermissionRepository {
  calls = 0;
  fail = false;
  result: ResolvedRoleAssignment[] = [];

  async resolveUserRoleAssignments(): Promise<ResolvedRoleAssignment[]> {
    this.calls++;
    if (this.fail) throw new Error("db down");
    return this.result;
  }
}

// Task 1.1 — tidak ada test di file ini yang mengirim scopeContext, jadi
// PermissionService.hasPermission() tidak pernah benar-benar memanggil
// resolver ini (short-circuit di `if (!scopeContext)`) — stub kosong cukup,
// lihat scope-hierarchy.spec.ts / prisma-scope-hierarchy.resolver
// integration test untuk cakupan hierarki sungguhan.
class FakeHierarchyResolver implements ScopeHierarchyResolver {
  async resolveAncestors() {
    return undefined;
  }
  async resolveDescendantIds() {
    return [];
  }
}

describe("PermissionService", () => {
  const userId = randomUUID();
  const tenantId = randomUUID();
  const assignment: ResolvedRoleAssignment = {
    roleId: randomUUID(),
    roleCode: "SUPER_ADMIN_PLATFORM",
    scopeType: "TENANT",
    scopeId: null,
    permissionCodes: ["user_mgmt.permission.manage"],
  };

  it("cache hit: repository TIDAK dipanggil", async () => {
    const cache = new FakeCache();
    cache.store.set(userId, [assignment]);
    const repo = new FakeRepository();
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

    const result = await service.hasPermission(userId, tenantId, "user_mgmt.permission.manage");

    expect(result).toBe(true);
    expect(repo.calls).toBe(0);
  });

  it("cache miss (null): repository dipanggil, hasil di-cache", async () => {
    const cache = new FakeCache();
    const repo = new FakeRepository();
    repo.result = [assignment];
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

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
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

    const result = await service.hasPermission(userId, tenantId, "user_mgmt.permission.manage");

    expect(result).toBe(true);
    expect(repo.calls).toBe(1);
  });

  it("fail closed #2: repository throw -> ServiceUnavailableException (503), bukan bypass", async () => {
    const cache = new FakeCache();
    const repo = new FakeRepository();
    repo.fail = true;
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

    await expect(service.hasPermission(userId, tenantId, "user_mgmt.permission.manage")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("resolusi kosong (user genuinely tanpa role) -> false, BUKAN 503", async () => {
    const cache = new FakeCache();
    const repo = new FakeRepository();
    repo.result = [];
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

    await expect(service.hasPermission(userId, tenantId, "user_mgmt.permission.manage")).resolves.toBe(false);
  });

  it("userHasRole bekerja lewat resolusi yang sama", async () => {
    const cache = new FakeCache();
    const repo = new FakeRepository();
    repo.result = [assignment];
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

    await expect(service.userHasRole(userId, tenantId, "SUPER_ADMIN_PLATFORM")).resolves.toBe(true);
    await expect(service.userHasRole(userId, tenantId, "HSE_OFFICER")).resolves.toBe(false);
  });

  it("invalidateCache menghapus entry cache", async () => {
    const cache = new FakeCache();
    cache.store.set(userId, [assignment]);
    const repo = new FakeRepository();
    const service = new PermissionService(cache, repo, new FakeHierarchyResolver());

    await service.invalidateCache(userId);

    expect(cache.store.has(userId)).toBe(false);
  });
});
