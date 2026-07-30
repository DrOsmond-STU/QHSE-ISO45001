import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { ApproverResolutionService } from "./approver-resolution.service";
import { WORKFLOW_TASK_ESCALATED_EVENT } from "./workflow-engine.constants";
import { decideEscalation, findOverdueTasks, OverdueTaskCandidate } from "./workflow-sla-scan";

// TDD §9 — job workflow-sla-scan. Job cross-tenant PERTAMA di codebase ini
// (belum ada tabel `tenants` utk enumerasi, Modul 01/task 1.1 belum ada) —
// pola: SATU query bootstrap read-only via role admin (adminPrisma, sama
// role yang dipakai migrations/prisma/seed-*.ts) untuk temukan tenant_id
// mana saja yang punya task PENDING, lalu SETIAP tenant diproses lewat
// tenantContextStorage + withRls() seperti biasa (RLS penuh, tidak ada
// query domain yang bypass RLS). Jadi rujukan utk job cross-tenant lain
// nanti (mis. 0.13 audit-log-partition-maintenance).
@Injectable()
export class WorkflowSlaScanService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSlaScanService.name);
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly approverResolutionService: ApproverResolutionService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM workflow_tasks WHERE status = 'PENDING'
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        // Satu tenant error TIDAK boleh gagalkan scan tenant lain (TDD §13.2
        // — job gagal permanen -> dead-letter + alert, bukan diam-diam
        // menghentikan seluruh batch).
        this.logger.error(`workflow-sla-scan gagal untuk tenant ${row.tenant_id}: ${err}`);
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const pendingTasks = await tx.workflowTask.findMany({
          where: { status: "PENDING", escalatedAt: null },
          include: { stage: true },
        });

        const candidates: OverdueTaskCandidate[] = pendingTasks.map((t) => ({
          taskId: t.id,
          createdAt: t.createdAt,
          escalatedAt: t.escalatedAt,
          slaHours: t.stage.slaHours,
          escalationAction: t.stage.escalationAction,
          escalationRoleId: t.stage.escalationRoleId,
        }));

        for (const task of findOverdueTasks(candidates, now)) {
          const decision = decideEscalation(task);
          const sourceTask = pendingTasks.find((t) => t.id === task.taskId);

          let reassignedTo: string | null = null;
          if (decision.reassignToRoleId) {
            const candidateUserIds = await this.approverResolutionService.resolveApprovers(
              tx,
              { approverType: "ROLE_IN_SCOPE", approverRoleId: decision.reassignToRoleId, approverUserId: null },
              tenantId,
            );
            reassignedTo = candidateUserIds[0] ?? null;
          }

          await tx.workflowTask.update({
            where: { id: task.taskId },
            data: {
              escalatedAt: now,
              ...(reassignedTo ? { assignedTo: reassignedTo } : {}),
            },
          });

          this.eventEmitter.emit(WORKFLOW_TASK_ESCALATED_EVENT, {
            taskId: task.taskId,
            instanceId: sourceTask?.instanceId,
            tenantId,
            action: decision.action,
            reassignedToRoleId: decision.reassignToRoleId,
          });
        }
      }),
    );
  }
}
