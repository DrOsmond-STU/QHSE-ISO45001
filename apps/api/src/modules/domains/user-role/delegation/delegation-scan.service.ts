import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import {
  ActiveDelegationCandidate,
  findDelegationsToActivate,
  findDelegationsToExpire,
  ScheduledDelegationCandidate,
} from "./delegation-lifecycle";

// TDD §13.1/§9 — pola job cross-tenant PERSIS reminder-scan (1.1)/
// workflow-sla-scan (0.9): bootstrap read-only via role admin, lalu SETIAP
// tenant diproses lewat tenantContextStorage + withRls() (RLS penuh).
//
// Tiga tanggung jawab per tenant per scan (PRD Modul 02 §4.3):
// 1. BR-08 aktivasi: delegation_of_authority SCHEDULED -> ACTIVE begitu
//    date_from tercapai, PROVISIONING workflow_delegations terkait (satu
//    baris baru, sourceDelegationOfAuthorityId menunjuk balik) — mencegah
//    admin konfigurasi delegasi dua kali terpisah (PRD §4.3 poin 3).
// 2. BR-08 deaktivasi: delegation_of_authority ACTIVE -> EXPIRED begitu
//    date_to terlewati, workflow_delegations terkait di-nonaktifkan
//    (isActive:false, BUKAN dihapus — riwayat tetap ada) (PRD §4.3 poin 4).
// 3. Reroute workflow_tasks PENDING yang SUDAH ADA sebelum delegasi aktif
//    (acceptance criterion literal TASK_INSTRUCTION.md 1.4: "task yang
//    menunggu approver terdelegasi otomatis terarah ke delegate") — task
//    BARU yang dibuat SETELAH delegasi aktif sudah otomatis dapat delegate
//    lewat ApproverResolutionService.substituteActiveDelegates() (task 1.4
//    juga, tidak perlu ditangani di sini).
@Injectable()
export class DelegationScanService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM delegation_of_authority WHERE status IN ('SCHEDULED', 'ACTIVE')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        // Satu tenant error TIDAK boleh gagalkan scan tenant lain (TDD
        // §13.2 — pola sama reminder-scan/workflow-sla-scan).
        this.logger.event("error", "delegation-scan gagal untuk satu tenant", {
          module: "user-role",
          action: "delegation-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        await this.activateScheduled(tx, tenantId, now);
        await this.expireActive(tx, tenantId, now);
      }),
    );
  }

  private async activateScheduled(tx: Prisma.TransactionClient, tenantId: string, now: Date): Promise<void> {
    const scheduled = await tx.delegationOfAuthority.findMany({
      where: { status: "SCHEDULED" },
      select: {
        id: true,
        dateFrom: true,
        dateTo: true,
        delegatorUserId: true,
        delegateUserId: true,
        roleId: true,
        scopeType: true,
        scopeId: true,
      },
    });

    const candidates: ScheduledDelegationCandidate[] = scheduled.map((s) => ({ delegationId: s.id, dateFrom: s.dateFrom }));
    const toActivate = findDelegationsToActivate(candidates, now);
    if (toActivate.length === 0) return;

    for (const candidate of toActivate) {
      const source = scheduled.find((s) => s.id === candidate.delegationId);
      /* istanbul ignore next -- source SELALU ditemukan, sama list asalnya */
      if (!source) continue;

      await tx.delegationOfAuthority.update({ where: { id: source.id }, data: { status: "ACTIVE" } });

      await tx.workflowDelegation.create({
        data: {
          tenantId,
          delegatorUserId: source.delegatorUserId,
          delegateUserId: source.delegateUserId,
          roleId: source.roleId,
          scopeType: source.scopeType,
          scopeId: source.scopeId,
          dateFrom: source.dateFrom,
          dateTo: source.dateTo,
          isActive: true,
          sourceDelegationOfAuthorityId: source.id,
        },
      });

      const reroutedCount = await this.rerouteExistingPendingTasks(
        tx,
        source.delegatorUserId,
        source.delegateUserId,
        source.roleId,
      );

      this.logger.event("info", "delegation_of_authority SCHEDULED -> ACTIVE (BR-08)", {
        module: "user-role",
        action: "delegation-scan.activated",
        tenant_id: tenantId,
        delegation_id: source.id,
        delegator_user_id: source.delegatorUserId,
        delegate_user_id: source.delegateUserId,
        rerouted_task_count: reroutedCount,
      });
    }
  }

  private async expireActive(tx: Prisma.TransactionClient, tenantId: string, now: Date): Promise<void> {
    const active = await tx.delegationOfAuthority.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, dateTo: true },
    });

    const candidates: ActiveDelegationCandidate[] = active.map((a) => ({ delegationId: a.id, dateTo: a.dateTo }));
    const toExpire = findDelegationsToExpire(candidates, now);
    if (toExpire.length === 0) return;

    const expiredIds = toExpire.map((c) => c.delegationId);
    await tx.delegationOfAuthority.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });
    await tx.workflowDelegation.updateMany({
      where: { sourceDelegationOfAuthorityId: { in: expiredIds }, isActive: true },
      data: { isActive: false },
    });

    this.logger.event("info", "delegation_of_authority ACTIVE -> EXPIRED (BR-08)", {
      module: "user-role",
      action: "delegation-scan.expired",
      tenant_id: tenantId,
      delegation_ids: expiredIds,
    });
  }

  /**
   * roleId NULL ("seluruh role delegator", PRD §5) me-reroute SEMUA task
   * PENDING milik delegator di stage manapun yang allowDelegation=true —
   * intent-nya "serahkan seluruh pekerjaan approval saya" (mis. cuti),
   * bukan cuma satu role. roleId TERISI mempersempit ke stage yang
   * approver_role_id-nya PERSIS cocok (delegasi eksplisit dibatasi satu
   * role, PRD §5 "batasi delegasi hanya untuk role tertentu").
   *
   * TIDAK mempersempit dgn scope_type/scope_id — workflow_tasks tidak
   * membawa referensi scope organisasi langsung (cuma
   * workflow_instances.entityType/entityId polymorphic ke tabel domain,
   * platform TIDAK BOLEH tahu bentuknya per modul) — gap didokumentasikan
   * TDD §26, pola sama keterbatasan scope ApproverResolutionService
   * (gap #23) yang sudah ada sejak 1.1.
   */
  private async rerouteExistingPendingTasks(
    tx: Prisma.TransactionClient,
    delegatorUserId: string,
    delegateUserId: string,
    roleId: string | null,
  ): Promise<number> {
    const pendingTasks = await tx.workflowTask.findMany({
      where: {
        assignedTo: delegatorUserId,
        status: "PENDING",
        stage: { allowDelegation: true, ...(roleId ? { approverRoleId: roleId } : {}) },
      },
      select: { id: true },
    });
    if (pendingTasks.length === 0) return 0;

    await tx.workflowTask.updateMany({
      where: { id: { in: pendingTasks.map((t) => t.id) } },
      data: { assignedTo: delegateUserId, delegatedTo: delegateUserId },
    });
    return pendingTasks.length;
  }
}
