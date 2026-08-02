"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WorkflowSlaScanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSlaScanService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const approver_resolution_service_1 = require("./approver-resolution.service");
const workflow_engine_constants_1 = require("./workflow-engine.constants");
const workflow_sla_scan_1 = require("./workflow-sla-scan");
// TDD §9 — job workflow-sla-scan. Job cross-tenant PERTAMA di codebase ini
// (belum ada tabel `tenants` utk enumerasi, Modul 01/task 1.1 belum ada) —
// pola: SATU query bootstrap read-only via role admin (adminPrisma, sama
// role yang dipakai migrations/prisma/seed-*.ts) untuk temukan tenant_id
// mana saja yang punya task PENDING, lalu SETIAP tenant diproses lewat
// tenantContextStorage + withRls() seperti biasa (RLS penuh, tidak ada
// query domain yang bypass RLS). Jadi rujukan utk job cross-tenant lain
// nanti (mis. 0.13 audit-log-partition-maintenance).
let WorkflowSlaScanService = WorkflowSlaScanService_1 = class WorkflowSlaScanService {
    prisma;
    approverResolutionService;
    eventEmitter;
    logger = new common_1.Logger(WorkflowSlaScanService_1.name);
    adminPrisma;
    constructor(prisma, approverResolutionService, eventEmitter) {
        this.prisma = prisma;
        this.approverResolutionService = approverResolutionService;
        this.eventEmitter = eventEmitter;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM workflow_tasks WHERE status = 'PENDING'
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                // Satu tenant error TIDAK boleh gagalkan scan tenant lain (TDD §13.2
                // — job gagal permanen -> dead-letter + alert, bukan diam-diam
                // menghentikan seluruh batch).
                this.logger.error(`workflow-sla-scan gagal untuk tenant ${row.tenant_id}: ${err}`);
            }
        }
    }
    async scanForTenant(tenantId, now) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const pendingTasks = await tx.workflowTask.findMany({
                where: { status: "PENDING", escalatedAt: null },
                include: { stage: true },
            });
            const candidates = pendingTasks.map((t) => ({
                taskId: t.id,
                createdAt: t.createdAt,
                escalatedAt: t.escalatedAt,
                slaHours: t.stage.slaHours,
                escalationAction: t.stage.escalationAction,
                escalationRoleId: t.stage.escalationRoleId,
            }));
            for (const task of (0, workflow_sla_scan_1.findOverdueTasks)(candidates, now)) {
                const decision = (0, workflow_sla_scan_1.decideEscalation)(task);
                const sourceTask = pendingTasks.find((t) => t.id === task.taskId);
                let reassignedTo = null;
                if (decision.reassignToRoleId) {
                    const candidateUserIds = await this.approverResolutionService.resolveApprovers(tx, { approverType: "ROLE_IN_SCOPE", approverRoleId: decision.reassignToRoleId, approverUserId: null }, tenantId);
                    reassignedTo = candidateUserIds[0] ?? null;
                }
                await tx.workflowTask.update({
                    where: { id: task.taskId },
                    data: {
                        escalatedAt: now,
                        ...(reassignedTo ? { assignedTo: reassignedTo } : {}),
                    },
                });
                this.eventEmitter.emit(workflow_engine_constants_1.WORKFLOW_TASK_ESCALATED_EVENT, {
                    taskId: task.taskId,
                    instanceId: sourceTask?.instanceId,
                    tenantId,
                    action: decision.action,
                    reassignedToRoleId: decision.reassignToRoleId,
                });
            }
        }));
    }
};
exports.WorkflowSlaScanService = WorkflowSlaScanService;
exports.WorkflowSlaScanService = WorkflowSlaScanService = WorkflowSlaScanService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        approver_resolution_service_1.ApproverResolutionService,
        event_emitter_1.EventEmitter2])
], WorkflowSlaScanService);
