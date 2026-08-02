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
var AuditFindingCapaTriggerListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditFindingCapaTriggerListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const audit_finding_service_1 = require("../audit/audit-finding.service");
const capa_register_service_1 = require("./capa-register.service");
/**
 * Task 4.2 — konsumen SUNGGUHAN PERTAMA `audit.finding_capa_required`
 * (event stub sejak task 4.1, sebelumnya TANPA listener sama sekali).
 * PRD Modul 09 §4 poin 1 "CAPA dibuat OTOMATIS saat audit_findings Major/
 * Minor NC dibuat" — listener ini yang mewujudkan kata "otomatis" itu:
 * buat `capa_register` (source_type=AUDIT_FINDING) LALU
 * `AuditFindingService.linkCapaRegister()` menulis balik FK-nya. `userId`
 * context diambil dari `payload.identifiedBy` (aktor asli yang mencatat
 * temuan) — listener event TIDAK py AsyncLocalStorage aktor request HTTP
 * manapun (event fire-and-forget, bukan panggilan sinkron dalam request
 * yang sama), pola sama seluruh `WorkflowInstanceCompletedEvent` listener
 * lain yang selalu re-establish tenant context dari payload.
 *
 * CapaModule mengimpor AuditModule (arah domain->domain diizinkan utk
 * orkestrasi, pola sama `ProvisioningService` 1.5 impor Organization+UserRole)
 * — modul SUMBER (Audit) TIDAK mengimpor CapaModule sama sekali, arah
 * ketergantungan SEARAH (hub CAPA yang tahu soal modul sumber, bukan
 * sebaliknya).
 */
let AuditFindingCapaTriggerListener = AuditFindingCapaTriggerListener_1 = class AuditFindingCapaTriggerListener {
    prisma;
    capaRegisterService;
    auditFindingService;
    logger = new common_1.Logger(AuditFindingCapaTriggerListener_1.name);
    constructor(prisma, capaRegisterService, auditFindingService) {
        this.prisma = prisma;
        this.capaRegisterService = capaRegisterService;
        this.auditFindingService = auditFindingService;
    }
    async onAuditFindingCapaRequired(payload) {
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId, userId: payload.identifiedBy }, async () => {
            try {
                const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: payload.auditFindingId }, include: { audit: true } }));
                if (finding.capaRegisterId)
                    return; // idempotent — sudah pernah ditautkan.
                const capa = await this.capaRegisterService.create({
                    sourceType: "AUDIT_FINDING",
                    sourceId: payload.auditFindingId,
                    sourceReferenceNumber: finding.audit.auditNumber,
                    category: "CORRECTIVE",
                    priority: payload.classification === "MAJOR_NC" ? "HIGH" : "MEDIUM",
                    title: `Temuan Audit ${finding.findingNumber} (${payload.classification}) — ${finding.audit.auditNumber}`,
                    problemStatement: payload.description,
                    siteId: finding.audit.siteId,
                    targetClosureDate: finding.targetClosureDate ?? undefined,
                });
                await this.auditFindingService.linkCapaRegister(payload.auditFindingId, capa.id);
            }
            catch (err) {
                this.logger.error(`Gagal memproses ${audit_finding_service_1.AUDIT_FINDING_CAPA_REQUIRED_EVENT} utk audit_finding=${payload.auditFindingId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.AuditFindingCapaTriggerListener = AuditFindingCapaTriggerListener;
__decorate([
    (0, event_emitter_1.OnEvent)(audit_finding_service_1.AUDIT_FINDING_CAPA_REQUIRED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditFindingCapaTriggerListener.prototype, "onAuditFindingCapaRequired", null);
exports.AuditFindingCapaTriggerListener = AuditFindingCapaTriggerListener = AuditFindingCapaTriggerListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        capa_register_service_1.CapaRegisterService,
        audit_finding_service_1.AuditFindingService])
], AuditFindingCapaTriggerListener);
//# sourceMappingURL=audit-finding-capa-trigger.listener.js.map