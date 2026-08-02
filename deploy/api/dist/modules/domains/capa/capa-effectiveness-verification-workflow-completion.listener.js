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
var CapaEffectivenessVerificationWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapaEffectivenessVerificationWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const audit_finding_service_1 = require("../audit/audit-finding.service");
const incident_corrective_action_link_service_1 = require("../incident/incident-corrective-action-link.service");
const capa_register_lifecycle_1 = require("./capa-register-lifecycle");
const capa_register_service_1 = require("./capa-register.service");
// Lihat banner comment CapaEffectivenessVerificationService soal
// entityId=capa_effectiveness_verification.id (BEDA dari capa_action_plan).
const CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE = "capa_effectiveness_verification";
/**
 * Task 4.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * capa_effectiveness_verification. `payload.entityId` = baris
 * capa_effectiveness_verification (BUKAN capa_register.id) — listener
 * BOLEH re-query baris ITU (bukan baris yang SEDANG ditulis emitting
 * transaction — `result`/`capaRegisterId` SUDAH commit jauh sebelumnya
 * di `recordResult()`, panggilan TERPISAH dari `submitForApproval()`
 * yang men-start instance ini, BUKAN race pre-commit yang didokumentasikan
 * WorkflowInstanceCompletedEvent banner comment — lihat gap TDD §26
 * terkait). APPROVED -> baca `result` -> `resolveEffectivenessOutcome()`
 * (BR-01/BR-04) -> `CapaRegisterService.markEffectivenessVerificationApproved()`.
 * REJECTED -> `returnToInProgress()` (HSE Manager tidak terima temuan
 * verifikasi, PIC/Verifier redo).
 *
 * PRD §4 poin 10 — "Notifikasi status closure dikirim ke modul sumber
 * sehingga entitas sumber (mis. audit_findings.status, incident_corrective_
 * actions.capa_status_cache) ikut ter-update." Diwujudkan LANGSUNG di sini
 * (bukan notifikasi terpisah) begitu outcome=EFFECTIVE_CLOSED, KHUSUS 2
 * source_type yang PRD SENDIRI beri contoh eksplisit: AUDIT_FINDING
 * (`AuditFindingService.verify()`+`close()`, CAPA_LINKED->VERIFIED->CLOSED)
 * & INCIDENT (`IncidentCorrectiveActionLinkService.updateCapaStatusCache()`,
 * SEMUA baris incident_corrective_actions yang menunjuk capa_register ini).
 * INSPECTION_FINDING TIDAK disinkron otomatis — PRD Modul 08 §7 sendiri
 * sebut tautan itu "opsional/manual". CATATAN: hanya CREATION CAPA
 * AUDIT_FINDING yang genuinely "otomatis" (Modul 09 §4 poin 6, event
 * audit.finding_capa_required); CREATION CAPA INCIDENT tetap human-triggered
 * ("investigator memicu", Modul 07 §4 poin 6 — TIDAK ada listener setara
 * AuditFindingCapaTriggerListener utk Incident, gap TDD §26 kalau PRD
 * ternyata dimaksudkan otomatis juga). Sync-back CLOSURE (blok ini) beda
 * concern — CAPA §4 poin 10 SENDIRI eksplisit menamai KEDUA
 * audit_findings.status & incident_corrective_actions.capa_status_cache
 * sbg target, TERLEPAS dari bagaimana CAPA-nya tadi dibuat. `verification.verifiedBy` dipakai sbg
 * aktor konteks utk KESELURUHAN cascade ini (WorkflowInstanceCompletedEvent
 * tanpa field actor, `verifiedBy` adalah aktor paling relevan yang genuinely
 * tersedia).
 *
 * PRD §8 baris 6/7 ("Hasil verifikasi NOT_EFFECTIVE" / "CAPA closed") —
 * DUA SATU-SATUNYA event notifikasi PRD §8 yang genuinely py call site
 * SIAP PAKAI di sini (outcome sudah dihitung, capa_register sudah
 * di-update) — dienqueue LANGSUNG, bukan lewat scan job terpisah (beda
 * dari baris 2/5 yang genuinely butuh polling periodik krn tidak ada
 * trigger event). Baris 7 "modul sumber terkait" diwujudkan via
 * syncClosureToSourceModule() di atas (state, bukan notifikasi user) —
 * penerima notifikasi HANYA Initiator (tidak ada user/role lain yang PRD
 * sebut utk baris ini).
 */
let CapaEffectivenessVerificationWorkflowCompletionListener = CapaEffectivenessVerificationWorkflowCompletionListener_1 = class CapaEffectivenessVerificationWorkflowCompletionListener {
    prisma;
    registerService;
    auditFindingService;
    incidentCorrectiveActionLinkService;
    notificationService;
    logger = new common_1.Logger(CapaEffectivenessVerificationWorkflowCompletionListener_1.name);
    constructor(prisma, registerService, auditFindingService, incidentCorrectiveActionLinkService, notificationService) {
        this.prisma = prisma;
        this.registerService = registerService;
        this.auditFindingService = auditFindingService;
        this.incidentCorrectiveActionLinkService = incidentCorrectiveActionLinkService;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE)
            return;
        try {
            const verification = await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, () => this.prisma.withRls((tx) => tx.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: payload.entityId } })));
            await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId, userId: verification.verifiedBy }, async () => {
                if (payload.status === "APPROVED") {
                    const outcome = (0, capa_register_lifecycle_1.resolveEffectivenessOutcome)(verification.result);
                    await this.registerService.markEffectivenessVerificationApproved(verification.capaRegisterId, outcome);
                    if (outcome === "EFFECTIVE_CLOSED") {
                        await this.syncClosureToSourceModule(verification.capaRegisterId);
                        await this.notifyEffectiveClosed(payload.tenantId, verification.capaRegisterId);
                    }
                    else if (outcome === "NOT_EFFECTIVE_REOPENED") {
                        await this.notifyNotEffectiveReopened(payload.tenantId, verification.capaRegisterId);
                    }
                }
                else if (payload.status === "REJECTED") {
                    await this.registerService.returnToInProgress(verification.capaRegisterId);
                }
            });
        }
        catch (err) {
            this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk capa_effectiveness_verification=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
        }
    }
    async syncClosureToSourceModule(capaRegisterId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        if (!capa.sourceId)
            return;
        if (capa.sourceType === "AUDIT_FINDING") {
            await this.auditFindingService.verify(capa.sourceId);
            await this.auditFindingService.close(capa.sourceId);
        }
        else if (capa.sourceType === "INCIDENT") {
            const links = await this.prisma.withRls((tx) => tx.incidentCorrectiveAction.findMany({ where: { capaRegisterId } }));
            for (const link of links) {
                await this.incidentCorrectiveActionLinkService.updateCapaStatusCache(link.id, "EFFECTIVE_CLOSED");
            }
        }
    }
    async notifyEffectiveClosed(tenantId, capaRegisterId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
            eventType: "CAPA_EFFECTIVE_CLOSED",
            entityType: "CAPA_REGISTER",
            entityId: capaRegisterId,
            recipientUserId: capa.initiatedBy,
            priority: "MEDIUM",
            eventCategory: "CAPA",
            variables: { capaNumber: capa.capaNumber },
        }));
    }
    async notifyNotEffectiveReopened(tenantId, capaRegisterId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId }, include: { actionPlans: true } }));
        const hseManagers = await this.prisma.withRls((tx) => tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } }, select: { id: true } }));
        const recipientUserIds = new Set([capa.initiatedBy, ...hseManagers.map((m) => m.id), ...capa.actionPlans.map((p) => p.picUserId)]);
        await tenant_context_1.tenantContextStorage.run({ tenantId }, async () => {
            for (const recipientUserId of recipientUserIds) {
                await this.notificationService.enqueue({
                    eventType: "CAPA_NOT_EFFECTIVE_REOPENED",
                    entityType: "CAPA_REGISTER",
                    entityId: capaRegisterId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "CAPA",
                    variables: { capaNumber: capa.capaNumber },
                });
            }
        });
    }
};
exports.CapaEffectivenessVerificationWorkflowCompletionListener = CapaEffectivenessVerificationWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CapaEffectivenessVerificationWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.CapaEffectivenessVerificationWorkflowCompletionListener = CapaEffectivenessVerificationWorkflowCompletionListener = CapaEffectivenessVerificationWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        capa_register_service_1.CapaRegisterService,
        audit_finding_service_1.AuditFindingService,
        incident_corrective_action_link_service_1.IncidentCorrectiveActionLinkService,
        notification_service_1.NotificationService])
], CapaEffectivenessVerificationWorkflowCompletionListener);
//# sourceMappingURL=capa-effectiveness-verification-workflow-completion.listener.js.map