import { NotImplementedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { ApproverResolutionService } from "./approver-resolution.service";

function fakeTx(
  userRoleRows: Array<{ userId: string }>,
  delegationRows: Array<{ delegatorUserId: string; delegateUserId: string }> = [],
): Prisma.TransactionClient {
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
  } as unknown as Prisma.TransactionClient;
}

describe("ApproverResolutionService", () => {
  const service = new ApproverResolutionService();
  const tenantId = randomUUID();

  describe("SPECIFIC_USER", () => {
    it("mengembalikan satu user literal", async () => {
      const userId = randomUUID();
      const result = await service.resolveApprovers(
        fakeTx([]),
        { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: userId },
        tenantId,
      );
      expect(result).toEqual([userId]);
    });

    it("throw kalau approverUserId kosong (config error, bukan silent empty)", async () => {
      await expect(
        service.resolveApprovers(
          fakeTx([]),
          { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: null },
          tenantId,
        ),
      ).rejects.toThrow();
    });
  });

  describe("ROLE_IN_SCOPE", () => {
    it("mengembalikan seluruh user pemegang role (dedup)", async () => {
      const userA = randomUUID();
      const userB = randomUUID();
      const roleId = randomUUID();
      const tx = fakeTx([{ userId: userA }, { userId: userB }, { userId: userA }]);

      const result = await service.resolveApprovers(
        tx,
        { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null },
        tenantId,
      );

      expect(result.sort()).toEqual([userA, userB].sort());
      expect(tx.userRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId, roleId, status: "ACTIVE" }) }),
      );
    });

    it("throw kalau approverRoleId kosong", async () => {
      await expect(
        service.resolveApprovers(
          fakeTx([]),
          { approverType: "ROLE_IN_SCOPE", approverRoleId: null, approverUserId: null },
          tenantId,
        ),
      ).rejects.toThrow();
    });

    it("tidak ada user pemegang role -> array kosong (bukan error)", async () => {
      const result = await service.resolveApprovers(
        fakeTx([]),
        { approverType: "ROLE_IN_SCOPE", approverRoleId: randomUUID(), approverUserId: null },
        tenantId,
      );
      expect(result).toEqual([]);
    });
  });

  describe("REPORTING_LINE", () => {
    it("throw NotImplementedException eksplisit — TIDAK PERNAH salah resolve diam-diam", async () => {
      await expect(
        service.resolveApprovers(
          fakeTx([]),
          { approverType: "REPORTING_LINE", approverRoleId: null, approverUserId: null },
          tenantId,
        ),
      ).rejects.toThrow(NotImplementedException);
    });
  });

  describe("CONTEXT_USER (task 2.1 — DMS Document Owner, approver terikat entitas)", () => {
    it("mengembalikan user dari contextData.contextUserId", async () => {
      const ownerId = randomUUID();
      const result = await service.resolveApprovers(
        fakeTx([]),
        { approverType: "CONTEXT_USER", approverRoleId: null, approverUserId: null },
        tenantId,
        { contextUserId: ownerId },
      );
      expect(result).toEqual([ownerId]);
    });

    it("throw kalau contextData tidak disuplai sama sekali", async () => {
      await expect(
        service.resolveApprovers(
          fakeTx([]),
          { approverType: "CONTEXT_USER", approverRoleId: null, approverUserId: null },
          tenantId,
        ),
      ).rejects.toThrow();
    });

    it("throw kalau contextData ada tapi contextUserId kosong/bukan string", async () => {
      await expect(
        service.resolveApprovers(
          fakeTx([]),
          { approverType: "CONTEXT_USER", approverRoleId: null, approverUserId: null },
          tenantId,
          { contextUserId: 12345 },
        ),
      ).rejects.toThrow();
    });
  });

  describe("substitusi delegasi aktif (task 1.4 — seam yang dijanjikan sejak 0.9)", () => {
    it("stage.allowDelegation:false (default) -> workflow_delegations TIDAK PERNAH di-query, delegasi diabaikan walau ada", async () => {
      const originalUser = randomUUID();
      const delegate = randomUUID();
      const tx = fakeTx([], [{ delegatorUserId: originalUser, delegateUserId: delegate }]);

      const result = await service.resolveApprovers(
        tx,
        { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser, allowDelegation: false },
        tenantId,
      );

      expect(result).toEqual([originalUser]);
      expect(tx.workflowDelegation.findMany).not.toHaveBeenCalled();
    });

    it("stage.allowDelegation TIDAK diisi (undefined) -> diperlakukan sama seperti false (fail safe)", async () => {
      const originalUser = randomUUID();
      const tx = fakeTx([], [{ delegatorUserId: originalUser, delegateUserId: randomUUID() }]);

      const result = await service.resolveApprovers(
        tx,
        { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser },
        tenantId,
      );

      expect(result).toEqual([originalUser]);
    });

    it("SPECIFIC_USER + allowDelegation:true dgn delegasi aktif (roleId NULL = semua role) -> disubstitusi delegate", async () => {
      const originalUser = randomUUID();
      const delegate = randomUUID();
      const tx = fakeTx([], [{ delegatorUserId: originalUser, delegateUserId: delegate }]);

      const result = await service.resolveApprovers(
        tx,
        { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser, allowDelegation: true },
        tenantId,
      );

      expect(result).toEqual([delegate]);
    });

    it("ROLE_IN_SCOPE + allowDelegation:true dgn delegasi role_id cocok stage -> disubstitusi", async () => {
      const originalUser = randomUUID();
      const delegate = randomUUID();
      const roleId = randomUUID();
      const tx = fakeTx([{ userId: originalUser }], [{ delegatorUserId: originalUser, delegateUserId: delegate }]);

      const result = await service.resolveApprovers(
        tx,
        { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null, allowDelegation: true },
        tenantId,
      );

      expect(result).toEqual([delegate]);
    });

    it("allowDelegation:true tapi tidak ada delegasi aktif -> approver natural dipakai apa adanya", async () => {
      const originalUser = randomUUID();
      const tx = fakeTx([], []);

      const result = await service.resolveApprovers(
        tx,
        { approverType: "SPECIFIC_USER", approverRoleId: null, approverUserId: originalUser, allowDelegation: true },
        tenantId,
      );

      expect(result).toEqual([originalUser]);
    });

    it("2 approver natural delegasi ke delegate yang SAMA -> dedup, delegate cuma sekali di hasil", async () => {
      const userA = randomUUID();
      const userB = randomUUID();
      const sameDelegate = randomUUID();
      const roleId = randomUUID();
      const tx = fakeTx(
        [{ userId: userA }, { userId: userB }],
        [
          { delegatorUserId: userA, delegateUserId: sameDelegate },
          { delegatorUserId: userB, delegateUserId: sameDelegate },
        ],
      );

      const result = await service.resolveApprovers(
        tx,
        { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null, allowDelegation: true },
        tenantId,
      );

      expect(result).toEqual([sameDelegate]);
    });

    it("query workflow_delegations dgn filter tenantId/delegatorUserId/isActive yang benar", async () => {
      const originalUser = randomUUID();
      const roleId = randomUUID();
      const tx = fakeTx([{ userId: originalUser }], []);

      await service.resolveApprovers(
        tx,
        { approverType: "ROLE_IN_SCOPE", approverRoleId: roleId, approverUserId: null, allowDelegation: true },
        tenantId,
      );

      expect(tx.workflowDelegation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            delegatorUserId: { in: [originalUser] },
            isActive: true,
          }),
        }),
      );
    });
  });
});
