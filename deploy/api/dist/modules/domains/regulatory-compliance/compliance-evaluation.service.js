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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceEvaluationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const regulatory_compliance_bootstrap_service_1 = require("./regulatory-compliance-bootstrap.service");
const regulatory_compliance_context_1 = require("./regulatory-compliance-context");
const compliance_evaluation_lifecycle_1 = require("./compliance-evaluation-lifecycle");
const COMPLIANCE_NUMBERING_MODULE_CODE = "COMPLIANCE";
const COMPLIANCE_WORKFLOW_ENTITY_TYPE = "compliance_evaluation";
// Task 2.2 (Modul 04 §4.2/§6 BR-03/BR-06). BELUM ada controller HTTP (pola
// sama seluruh modul domain Phase 2 sejauh ini tanpa deliverable apps/web)
// — compliance.evaluation.* sudah di-seed RBAC baseline (task 92).
let ComplianceEvaluationService = class ComplianceEvaluationService {
    prisma;
    numberingService;
    notificationService;
    workflowEngineService;
    bootstrapService;
    constructor(prisma, numberingService, notificationService, workflowEngineService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.notificationService = notificationService;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
    }
    /**
     * BR-01 (PRD §5) analog utk evaluation_number, via NumberingService
     * (0.10, module_code=COMPLIANCE) — TIGA langkah TERPISAH (bukan satu
     * withRls() membungkus semua), alasan PERSIS DocumentService.createDocument()
     * (2.1): ensureNumberingConfig() maupun generateNext() membuka
     * withRls()-nya masing-masing, nesting terverifikasi tidak hang tapi
     * tidak atomik.
     */
    async create(input) {
        const createdBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        const tenantId = (0, regulatory_compliance_context_1.requireTenantId)();
        await this.bootstrapService.ensureNumberingConfig();
        const evaluationNumber = await this.numberingService.generateNext(COMPLIANCE_NUMBERING_MODULE_CODE);
        return this.prisma.withRls((tx) => tx.complianceEvaluation.create({
            data: {
                tenantId,
                evaluationNumber,
                regulatoryRegisterId: input.regulatoryRegisterId,
                obligationId: input.obligationId,
                siteId: input.siteId,
                evaluationPeriodStart: input.evaluationPeriodStart,
                evaluationPeriodEnd: input.evaluationPeriodEnd,
                evaluatorUserId: input.evaluatorUserId,
                evaluationDate: input.evaluationDate,
                evaluationMethod: input.evaluationMethod,
                complianceStatus: input.complianceStatus,
                findingsSummary: input.findingsSummary,
                linkedCapaId: input.linkedCapaId,
                capaTriggered: input.linkedCapaId != null,
                status: "DRAFT",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async update(evaluationId, input) {
        const updatedBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.complianceEvaluation.update({
            where: { id: evaluationId },
            data: {
                findingsSummary: input.findingsSummary,
                complianceStatus: input.complianceStatus,
                linkedCapaId: input.linkedCapaId,
                capaTriggered: input.linkedCapaId !== undefined ? true : undefined,
                updatedBy,
            },
        }));
    }
    async getById(evaluationId) {
        return this.prisma.withRls((tx) => tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } }));
    }
    /**
     * PRD §4.2 poin 2 — submit memicu workflow_instances
     * (module_code=COMPLIANCE, entity_type=compliance_evaluation), 1 stage
     * ROLE_IN_SCOPE HSE Manager (TIDAK butuh CONTEXT_USER spt DMS — evaluasi
     * tidak py "pemilik" spesifik-entitas). TIGA transaksi TERPISAH, alasan
     * PERSIS DocumentVersionService.submitForApproval() (2.1) — lihat banner
     * comment method itu.
     *
     * PRD §8 baris 4 "Evaluasi non-compliant disubmit -> HSE Manager" —
     * notifikasi dikirim DI SINI (bukan scan job terjadwal), sinkron dgn
     * submit itu sendiri, SETELAH transaksi commit (pola sama
     * DocumentService.retire() — enqueue() tidak boleh dipanggil dari dalam
     * withRls() lain). Recipient HSE Manager diresolusi via role sistem
     * (BUKAN ApproverResolutionService/workflow-scope — notifikasi ini
     * ditujukan ke SEMUA HSE Manager tenant, bukan APPROVER SATU stage
     * tertentu; scope containment penuh di luar timebox, gap TDD §26).
     */
    async submitForApproval(evaluationId) {
        const evaluation = await this.prisma.withRls(async (tx) => {
            const existing = await tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
            if (existing.status !== "DRAFT") {
                throw new common_1.BadRequestException(`compliance_evaluations berstatus ${existing.status} tidak dapat diajukan (wajib DRAFT).`);
            }
            return existing;
        });
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(COMPLIANCE_WORKFLOW_ENTITY_TYPE, evaluationId, definition.id, {});
        const updated = await this.prisma.withRls((tx) => tx.complianceEvaluation.update({
            where: { id: evaluationId },
            data: { status: "SUBMITTED", workflowInstanceId: instance.id },
        }));
        if (evaluation.complianceStatus === "NON_COMPLIANT" || evaluation.complianceStatus === "PARTIALLY_COMPLIANT") {
            const tenantId = (0, regulatory_compliance_context_1.requireTenantId)();
            const registerId = evaluation.regulatoryRegisterId;
            const { hseManagers, regulationNumber } = await this.prisma.withRls(async (tx) => {
                const managers = await tx.user.findMany({
                    where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                    select: { id: true },
                });
                const register = registerId
                    ? await tx.regulatoryRegister.findUnique({ where: { id: registerId }, select: { regulationNumber: true } })
                    : null;
                return { hseManagers: managers, regulationNumber: register?.regulationNumber ?? null };
            });
            for (const manager of hseManagers) {
                await this.notificationService.enqueue({
                    eventType: "COMPLIANCE_EVALUATION_NON_COMPLIANT_SUBMITTED",
                    entityType: "COMPLIANCE_EVALUATION",
                    entityId: evaluationId,
                    recipientUserId: manager.id,
                    priority: "HIGH",
                    eventCategory: "COMPLIANCE",
                    variables: { regulationNumber: regulationNumber ?? evaluation.evaluationNumber },
                });
            }
        }
        return updated;
    }
    /**
     * PRD §4.2 poin 3/BR-03 — penutupan evaluasi SELALU tindakan eksplisit
     * (Evaluator/HSE Manager), TIDAK PERNAH otomatis begitu REVIEWED tercapai
     * — PRD tidak menyebutkan auto-close di manapun, termasuk utk
     * COMPLIANT/NOT_APPLICABLE yang sebenarnya tidak kena gate BR-03 (gap
     * TDD §26: kenapa tidak auto-close utk kasus yang tidak butuh CAPA cukup
     * masuk akal tapi di luar teks literal PRD, jadi TIDAK diasumsikan).
     * BR-06 recompute next_due_date DI SINI (bukan job terpisah) — dua field
     * denormalisasi (compliance_obligations.next_due_date DAN
     * compliance_evaluations.next_evaluation_due_date sendiri) diisi NILAI
     * SAMA dari computeNextObligationDueDate() yang SAMA, PRD §4.2 poin 4
     * ("next_evaluation_due_date dihitung otomatis dari frequency obligation
     * terkait") dibaca sbg terjadi PADA SAAT SAMA dgn BR-06 (sumber &
     * frequency yang dirujuk identik). dueReminderSentAt/overdueNotifiedAt
     * di-reset NULL di sini — next_due_date pindah ke masa depan
     * "menyelesaikan" reminder/overdue siklus sebelumnya.
     */
    async close(evaluationId) {
        const updatedBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const evaluation = await tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
            if (evaluation.status !== "REVIEWED") {
                throw new common_1.BadRequestException(`compliance_evaluations berstatus ${evaluation.status} tidak dapat ditutup (wajib REVIEWED).`);
            }
            (0, compliance_evaluation_lifecycle_1.assertCanCloseEvaluation)(evaluation.complianceStatus, evaluation.linkedCapaId);
            let nextDueDate = null;
            if (evaluation.obligationId) {
                const obligation = await tx.complianceObligation.findUniqueOrThrow({ where: { id: evaluation.obligationId } });
                nextDueDate = (0, compliance_evaluation_lifecycle_1.computeNextObligationDueDate)(new Date(), obligation.frequency);
                await tx.complianceObligation.update({
                    where: { id: obligation.id },
                    data: { nextDueDate, dueReminderSentAt: null, overdueNotifiedAt: null },
                });
            }
            return tx.complianceEvaluation.update({
                where: { id: evaluationId },
                data: { status: "CLOSED", nextEvaluationDueDate: nextDueDate, updatedBy },
            });
        });
    }
};
exports.ComplianceEvaluationService = ComplianceEvaluationService;
exports.ComplianceEvaluationService = ComplianceEvaluationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        notification_service_1.NotificationService,
        workflow_engine_service_1.WorkflowEngineService,
        regulatory_compliance_bootstrap_service_1.RegulatoryComplianceBootstrapService])
], ComplianceEvaluationService);
//# sourceMappingURL=compliance-evaluation.service.js.map