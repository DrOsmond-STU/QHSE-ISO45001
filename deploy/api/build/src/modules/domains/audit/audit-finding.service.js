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
exports.AuditFindingService = exports.AUDIT_FINDING_CAPA_REQUIRED_EVENT = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
const audit_lifecycle_1 = require("./audit-lifecycle");
const audit_finding_rules_1 = require("./audit-finding-rules");
exports.AUDIT_FINDING_CAPA_REQUIRED_EVENT = "audit.finding_capa_required";
/**
 * Task 4.1 (Modul 09 §4 poin 6/§6 BR-02/04/05, §7). PRD §7 "audit_findings
 * Major/Minor NC memicu CAPA (source_type=AUDIT_FINDING)" — Modul 10 (CAPA,
 * task 4.2) BELUM ADA, jadi create() HANYA emit event via EventEmitter2
 * (pola PERSIS InspectionFindingService.INSPECTION_FINDING_CREATED_EVENT
 * 3.6, namespace `audit.` bukan lewat WorkflowEngineService) BILA
 * requiresCapa=true (default TRUE utk Major/Minor NC, BISA override manual
 * jadi true utk Observation/OFI juga — event tetap dipicu kalau override
 * begitu, konsisten literal "memicu CAPA" merujuk ke requires_capa BUKAN
 * classification mentah). TIDAK ADA listener yang genuinely mengonsumsi
 * event ini sekarang di codebase ini — linkCapaRegister() jadi titik
 * sinkronisasi MANUAL begitu Modul 10 genuinely ada, gap TDD §26.
 */
let AuditFindingService = class AuditFindingService {
    prisma;
    eventEmitter;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async create(input) {
        const identifiedBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        const identifiedAt = new Date();
        const requiresCapa = input.requiresCapa ?? (0, audit_finding_rules_1.resolveDefaultRequiresCapa)(input.classification);
        const targetClosureDate = (0, audit_lifecycle_1.computeTargetClosureDate)(identifiedAt, input.classification);
        const finding = await this.prisma.withRls((tx) => tx.auditFinding.create({
            data: {
                tenantId,
                auditId: input.auditId,
                checklistItemId: input.checklistItemId,
                findingNumber: input.findingNumber,
                classification: input.classification,
                clauseReference: input.clauseReference,
                description: input.description,
                evidenceDescription: input.evidenceDescription,
                requiresCapa,
                status: "OPEN",
                identifiedBy,
                identifiedAt,
                targetClosureDate,
                createdBy: identifiedBy,
                updatedBy: identifiedBy,
            },
        }));
        if (requiresCapa) {
            const event = {
                tenantId,
                auditFindingId: finding.id,
                auditId: finding.auditId,
                classification: finding.classification,
                description: finding.description,
                identifiedBy: finding.identifiedBy,
                identifiedAt: finding.identifiedAt,
            };
            this.eventEmitter.emit(exports.AUDIT_FINDING_CAPA_REQUIRED_EVENT, event);
        }
        return finding;
    }
    /**
     * BR-05 — "Perubahan classification wajib dicatat di system_audit_logs
     * (OTOMATIS via audit_log_trigger generik, TIDAK ADA kode tambahan di
     * sini) dan memicu perhitungan ulang target_closure_date."
     */
    async updateClassification(auditFindingId, classification) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
        const targetClosureDate = (0, audit_lifecycle_1.computeTargetClosureDate)(finding.identifiedAt, classification);
        return this.prisma.withRls((tx) => tx.auditFinding.update({ where: { id: auditFindingId }, data: { classification, targetClosureDate, updatedBy } }));
    }
    // PRD §3 "Auditee (Department Head) | ... memberi auditee_response".
    async setAuditeeResponse(auditFindingId, auditeeResponse) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.auditFinding.update({ where: { id: auditFindingId }, data: { auditeeResponse, updatedBy } }));
    }
    /** Titik sinkronisasi MANUAL begitu Modul 10 genuinely ada dan CAPA
     * dibuat DI SANA — TIDAK ADA listener otomatis, pola sama
     * InspectionFindingService.linkActionTracking() 3.6. */
    async linkCapaRegister(auditFindingId, capaRegisterId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
        (0, audit_finding_rules_1.validateAuditFindingStatusTransition)(finding.status, "CAPA_LINKED", finding.requiresCapa);
        return this.prisma.withRls((tx) => tx.auditFinding.update({ where: { id: auditFindingId }, data: { capaRegisterId, status: "CAPA_LINKED", updatedBy } }));
    }
    // "CAPA terkait sudah effectiveness verified Modul 10" — sinkronisasi MANUAL.
    async verify(auditFindingId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
        (0, audit_finding_rules_1.validateAuditFindingStatusTransition)(finding.status, "VERIFIED", finding.requiresCapa);
        return this.prisma.withRls((tx) => tx.auditFinding.update({ where: { id: auditFindingId }, data: { status: "VERIFIED", updatedBy } }));
    }
    async close(auditFindingId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
        (0, audit_finding_rules_1.validateAuditFindingStatusTransition)(finding.status, "CLOSED", finding.requiresCapa);
        return this.prisma.withRls((tx) => tx.auditFinding.update({ where: { id: auditFindingId }, data: { status: "CLOSED", closedAt: new Date(), updatedBy } }));
    }
    async getById(auditFindingId) {
        return this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
    }
    async listByAudit(auditId) {
        return this.prisma.withRls((tx) => tx.auditFinding.findMany({ where: { auditId, deletedAt: null }, orderBy: { findingNumber: "asc" } }));
    }
};
exports.AuditFindingService = AuditFindingService;
exports.AuditFindingService = AuditFindingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], AuditFindingService);
