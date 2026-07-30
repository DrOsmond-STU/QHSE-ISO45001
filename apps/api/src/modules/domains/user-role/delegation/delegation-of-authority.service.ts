import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DelegationOfAuthority, DelegationReason, ScopeType } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "../user-role-context";
import { assertNoDelegationOverlap } from "./delegation-lifecycle";

export interface CreateDelegationOfAuthorityInput {
  delegatorUserId: string;
  delegateUserId: string;
  scopeType?: ScopeType;
  scopeId?: string;
  roleId?: string;
  reason?: DelegationReason;
  dateFrom: Date;
  dateTo: Date;
  // Diisi LANGSUNG kalau kebijakan tenant mewajibkan approval atasan (PRD
  // §4.3 poin 2) — gating formal via Workflow Engine SENGAJA belum
  // dibangun (tidak ada mekanisme konfigurasi per-tenant, Modul 31/task
  // 1.5 — gap TDD §26, pola sama site-closure workflow 1.1).
  approvedBy?: string;
}

// Task 1.4 (Modul 02 §4.3/§5) — master record organisasional/HR-driven.
// BELUM ada controller HTTP (pola sama seluruh task 1.1-1.3).
@Injectable()
export class DelegationOfAuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  /** BR-07 — overlap dicek terhadap kombinasi identitas
   * (delegator/role/scope) yang SAMA, status SCHEDULED/ACTIVE saja
   * (riwayat EXPIRED/CANCELLED/REVOKED tidak menghalangi). Delegator/
   * delegate divalidasi ADA di tenant yang sama (query di dalam withRls(),
   * RLS yang jadi jaminan — pola sama gap TDD §26 poin 14: FK constraint
   * TIDAK menghormati RLS, jadi validasi eksplisit tetap wajib walau FK
   * "sukses"). */
  async create(input: CreateDelegationOfAuthorityInput): Promise<DelegationOfAuthority> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const [delegator, delegate] = await Promise.all([
        tx.user.findUnique({ where: { id: input.delegatorUserId }, select: { id: true } }),
        tx.user.findUnique({ where: { id: input.delegateUserId }, select: { id: true } }),
      ]);
      if (!delegator) throw new NotFoundException(`delegator_user_id "${input.delegatorUserId}" tidak ditemukan di tenant ini.`);
      if (!delegate) throw new NotFoundException(`delegate_user_id "${input.delegateUserId}" tidak ditemukan di tenant ini.`);

      const existing = await tx.delegationOfAuthority.findMany({
        where: {
          tenantId,
          delegatorUserId: input.delegatorUserId,
          roleId: input.roleId ?? null,
          scopeType: input.scopeType ?? null,
          scopeId: input.scopeId ?? null,
          status: { in: ["SCHEDULED", "ACTIVE"] },
        },
        select: { dateFrom: true, dateTo: true },
      });
      assertNoDelegationOverlap({ dateFrom: input.dateFrom, dateTo: input.dateTo }, existing);

      return tx.delegationOfAuthority.create({
        data: {
          tenantId,
          delegatorUserId: input.delegatorUserId,
          delegateUserId: input.delegateUserId,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          roleId: input.roleId,
          reason: input.reason ?? "OTHER",
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          approvedBy: input.approvedBy,
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  /** PRD §4.3 poin 5 — "Delegator dapat REVOKE sewaktu-waktu sebelum
   * date_to." Berlaku utk SCHEDULED maupun ACTIVE (menonaktifkan
   * workflow_delegations terkait SEKETIKA kalau sudah ada — no-op aman
   * kalau belum, masih SCHEDULED). Menolak revoke delegasi yang statusnya
   * SUDAH terminal (EXPIRED/CANCELLED/REVOKED) — tidak boleh mengubah
   * riwayat. */
  async revoke(delegationId: string): Promise<DelegationOfAuthority> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const current = await tx.delegationOfAuthority.findUniqueOrThrow({ where: { id: delegationId } });
      if (current.status !== "SCHEDULED" && current.status !== "ACTIVE") {
        throw new ConflictException(`Delegasi berstatus "${current.status}" — hanya SCHEDULED/ACTIVE yang bisa di-REVOKE.`);
      }

      const updated = await tx.delegationOfAuthority.update({
        where: { id: delegationId },
        data: { status: "REVOKED", updatedBy },
      });

      await tx.workflowDelegation.updateMany({
        where: { sourceDelegationOfAuthorityId: delegationId, isActive: true },
        data: { isActive: false },
      });

      return updated;
    });
  }

  async listForDelegator(delegatorUserId: string): Promise<DelegationOfAuthority[]> {
    return this.prisma.withRls((tx) =>
      tx.delegationOfAuthority.findMany({ where: { delegatorUserId }, orderBy: { dateFrom: "desc" } }),
    );
  }
}
