"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const approver_resolution_service_1 = require("./approver-resolution.service");
function fakeTx(userRoleRows, delegationRows = []) {
    return {
        userRole: {
            findMany: jest.fn().mockResolvedValue(userRoleRows),
        },
        // Task 1.4 — resolveApprovers() sekarang SELALU query workflow_delegations
        // (substituteActiveDelegates()) sesudah resolusi natural, default [] =
        // tidak ada delegasi aktif (natural approver dipakai apa adanya, pola
        // sama seluruh test lama sebelum task 1.4 yang tidak peduli delegasi).
        workflowDelegation: {
            findMany: jest.fn().mockResolvedValue(delegationRows),
        },
    };
}
describe("ApproverResolutionService", () => {
    const service = new approver_resolution_service_1.ApproverResolutionService();
    const tenantId = (0, node_crypto_1.randomUUID)();
    describe("SPECIFIC_USER", () => {
        it("mengembalikan satu user literal", async () => {
            const userId = (0, node_crypto_1.randomUUID)();
            const result = await service.resolveApprovers(fakeTx([]), { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: userId }, tenantId);
            expect(result).toEqual([userId]);
        });
        it("throw kalau approverUserId kosong (config error, bukan silent empty)", async () => {
            await expect(service.resolveApprovers(fakeTx([]), { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: null }, tenantId)).rejects.toThrow();
        });
    });
    describe("ROLE_IN_SCOPE", () => {
        it("mengembalikan seluruh user pemegang role (dedup)", async () => {
            const userA = (0, node_crypto_1.randomUUID)();
            const userB = (0, node_crypto_1.randomUUID)();
            const roleId = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([{ userId: userA }, { userId: userB }, { userId: userA }]);
            const result = await service.resolveApprovers(tx, { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null }, tenantId);
            expect(result.sort()).toEqual([userA, userB].sort());
            expect(tx.userRole.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId, roleId, status: "ACTIVE" }) }));
        });
        it("throw kalau approverRoleId kosong", async () => {
            await expect(service.resolveApprovers(fakeTx([]), { approverType: "ROLE_IN_SCOPE", approverRoleId: null, approverUserId: null }, tenantId)).rejects.toThrow();
        });
        it("tidak ada user pemegang role -> array kosong (bukan error)", async () => {
            const result = await service.resolveApprovers(fakeTx([]), { approverType: "ROLE_IN_SCOPE", approverRoleId: (0, node_crypto_1.randomUUID)(), approverUserId: null }, tenantId);
            expect(result).toEqual([]);
        });
    });
    describe("REPORTING_LINE", () => {
        it("throw NotImplementedException eksplisit — TIDAK PERNAH salah resolve diam-diam", async () => {
            await expect(service.resolveApprovers(fakeTx([]), { approverType: "REPORTING_LINE", approverRoleId: null, approverUserId: null }, tenantId)).rejects.toThrow(common_1.NotImplementedException);
        });
    });
    describe("CONTEXT_USER (task 2.1 — DMS Document Owner, approver terikat entitas)", () => {
        it("mengembalikan user dari contextData.contextUserId", async () => {
            const ownerId = (0, node_crypto_1.randomUUID)();
            const result = await service.resolveApprovers(fakeTx([]), { approverType: "CONTEXT_USER", approverRoleId: null, approverUserId: null }, tenantId, { contextUserId: ownerId });
            expect(result).toEqual([ownerId]);
        });
        it("throw kalau contextData tidak disuplai sama sekali", async () => {
            await expect(service.resolveApprovers(fakeTx([]), { approverType: "CONTEXT_USER", approverRoleId: null, approverUserId: null }, tenantId)).rejects.toThrow();
        });
        it("throw kalau contextData ada tapi contextUserId kosong/bukan string", async () => {
            await expect(service.resolveApprovers(fakeTx([]), { approverType: "CONTEXT_USER", approverRoleId: null, approverUserId: null }, tenantId, { contextUserId: 12345 })).rejects.toThrow();
        });
    });
    describe("substitusi delegasi aktif (task 1.4 — seam yang dijanjikan sejak 0.9)", () => {
        it("stage.allowDelegation:false (default) -> workflow_delegations TIDAK PERNAH di-query, delegasi diabaikan walau ada", async () => {
            const originalUser = (0, node_crypto_1.randomUUID)();
            const delegate = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([], [{ delegatorUserId: originalUser, delegateUserId: delegate }]);
            const result = await service.resolveApprovers(tx, { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser, allowDelegation: false }, tenantId);
            expect(result).toEqual([originalUser]);
            expect(tx.workflowDelegation.findMany).not.toHaveBeenCalled();
        });
        it("stage.allowDelegation TIDAK diisi (undefined) -> diperlakukan sama seperti false (fail safe)", async () => {
            const originalUser = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([], [{ delegatorUserId: originalUser, delegateUserId: (0, node_crypto_1.randomUUID)() }]);
            const result = await service.resolveApprovers(tx, { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser }, tenantId);
            expect(result).toEqual([originalUser]);
        });
        it("SPECIFIC_USER + allowDelegation:true dgn delegasi aktif (roleId NULL = semua role) -> disubstitusi delegate", async () => {
            const originalUser = (0, node_crypto_1.randomUUID)();
            const delegate = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([], [{ delegatorUserId: originalUser, delegateUserId: delegate }]);
            const result = await service.resolveApprovers(tx, { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser, allowDelegation: true }, tenantId);
            expect(result).toEqual([delegate]);
        });
        it("ROLE_IN_SCOPE + allowDelegation:true dgn delegasi role_id cocok stage -> disubstitusi", async () => {
            const originalUser = (0, node_crypto_1.randomUUID)();
            const delegate = (0, node_crypto_1.randomUUID)();
            const roleId = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([{ userId: originalUser }], [{ delegatorUserId: originalUser, delegateUserId: delegate }]);
            const result = await service.resolveApprovers(tx, { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null, allowDelegation: true }, tenantId);
            expect(result).toEqual([delegate]);
        });
        it("allowDelegation:true tapi tidak ada delegasi aktif -> approver natural dipakai apa adanya", async () => {
            const originalUser = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([], []);
            const result = await service.resolveApprovers(tx, { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser, allowDelegation: true }, tenantId);
            expect(result).toEqual([originalUser]);
        });
        it("2 approver natural delegasi ke delegate yang SAMA -> dedup, delegate cuma sekali di hasil", async () => {
            const userA = (0, node_crypto_1.randomUUID)();
            const userB = (0, node_crypto_1.randomUUID)();
            const sameDelegate = (0, node_crypto_1.randomUUID)();
            const roleId = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([{ userId: userA }, { userId: userB }], [
                { delegatorUserId: userA, delegateUserId: sameDelegate },
                { delegatorUserId: userB, delegateUserId: sameDelegate },
            ]);
            const result = await service.resolveApprovers(tx, { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null, allowDelegation: true }, tenantId);
            expect(result).toEqual([sameDelegate]);
        });
        it("query workflow_delegations dgn filter tenantId/delegatorUserId/isActive yang benar", async () => {
            const originalUser = (0, node_crypto_1.randomUUID)();
            const roleId = (0, node_crypto_1.randomUUID)();
            const tx = fakeTx([{ userId: originalUser }], []);
            await service.resolveApprovers(tx, { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null, allowDelegation: true }, tenantId);
            expect(tx.workflowDelegation.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    tenantId,
                    delegatorUserId: { in: [originalUser] },
                    isActive: true,
                }),
            }));
        });
    });
});
