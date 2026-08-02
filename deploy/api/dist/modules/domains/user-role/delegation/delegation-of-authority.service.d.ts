import { DelegationOfAuthority, DelegationReason, ScopeType } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface CreateDelegationOfAuthorityInput {
    delegatorUserId: string;
    delegateUserId: string;
    scopeType?: ScopeType;
    scopeId?: string;
    roleId?: string;
    reason?: DelegationReason;
    dateFrom: Date;
    dateTo: Date;
    approvedBy?: string;
}
export declare class DelegationOfAuthorityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /** BR-07 — overlap dicek terhadap kombinasi identitas
     * (delegator/role/scope) yang SAMA, status SCHEDULED/ACTIVE saja
     * (riwayat EXPIRED/CANCELLED/REVOKED tidak menghalangi). Delegator/
     * delegate divalidasi ADA di tenant yang sama (query di dalam withRls(),
     * RLS yang jadi jaminan — pola sama gap TDD §26 poin 14: FK constraint
     * TIDAK menghormati RLS, jadi validasi eksplisit tetap wajib walau FK
     * "sukses"). */
    create(input: CreateDelegationOfAuthorityInput): Promise<DelegationOfAuthority>;
    /** PRD §4.3 poin 5 — "Delegator dapat REVOKE sewaktu-waktu sebelum
     * date_to." Berlaku utk SCHEDULED maupun ACTIVE (menonaktifkan
     * workflow_delegations terkait SEKETIKA kalau sudah ada — no-op aman
     * kalau belum, masih SCHEDULED). Menolak revoke delegasi yang statusnya
     * SUDAH terminal (EXPIRED/CANCELLED/REVOKED) — tidak boleh mengubah
     * riwayat. */
    revoke(delegationId: string): Promise<DelegationOfAuthority>;
    listForDelegator(delegatorUserId: string): Promise<DelegationOfAuthority[]>;
}
