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
exports.AuditorCompetencyRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
// Task 4.1 (Modul 09 §3 "Tenant Admin/HR | audit.auditor_competency.manage",
// ISO 19011 klausul 7). BELUM ada controller HTTP. Bukti sertifikat via
// attachments generik (entity_type=auditor_competency_record, PRD §5
// catatan) — TIDAK ADA kolom/upload khusus di sini.
let AuditorCompetencyRecordService = class AuditorCompetencyRecordService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.auditorCompetencyRecord.create({
            data: {
                tenantId,
                userId: input.userId,
                competencyType: input.competencyType,
                standardScope: input.standardScope,
                certificationBody: input.certificationBody,
                certificateNumber: input.certificateNumber,
                issuedDate: input.issuedDate,
                expiryDate: input.expiryDate,
                status: "ACTIVE",
                relatedTrainingRecordId: input.relatedTrainingRecordId,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async revoke(competencyRecordId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.auditorCompetencyRecord.update({ where: { id: competencyRecordId }, data: { status: "REVOKED", updatedBy } }));
    }
    // Dipanggil auditor-competency-expiry-scan (task 201).
    async markExpired(competencyRecordId) {
        return this.prisma.withRls((tx) => tx.auditorCompetencyRecord.update({ where: { id: competencyRecordId }, data: { status: "EXPIRED" } }));
    }
    async getById(competencyRecordId) {
        return this.prisma.withRls((tx) => tx.auditorCompetencyRecord.findUniqueOrThrow({ where: { id: competencyRecordId } }));
    }
    async listByUser(userId) {
        return this.prisma.withRls((tx) => tx.auditorCompetencyRecord.findMany({ where: { userId, deletedAt: null }, orderBy: { issuedDate: "desc" } }));
    }
};
exports.AuditorCompetencyRecordService = AuditorCompetencyRecordService;
exports.AuditorCompetencyRecordService = AuditorCompetencyRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditorCompetencyRecordService);
