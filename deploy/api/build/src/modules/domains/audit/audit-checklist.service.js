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
exports.AuditChecklistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.checklist.manage").
// BELUM ada controller HTTP. `version` TIDAK punya method createNewVersion()
// (BEDA dari InspectionChecklistTemplateService 3.6/BR-07-nya) — PRD §5
// modul ini tidak memberi BR wajib versi baru tiap perubahan, lihat banner
// comment AuditChecklist.version di schema.prisma.
let AuditChecklistService = class AuditChecklistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const checklist = await tx.auditChecklist.create({
                data: {
                    tenantId,
                    name: input.name,
                    standardCode: input.standardCode,
                    version: 1,
                    isActive: true,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await this.createItems(tx, tenantId, checklist.id, input.items, createdBy);
            return checklist;
        });
    }
    async addItem(auditChecklistId, input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.auditChecklistItem.create({
            data: {
                tenantId,
                auditChecklistId,
                clauseReference: input.clauseReference,
                sequenceNo: input.sequenceNo,
                criteriaText: input.criteriaText,
                guidanceNote: input.guidanceNote,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async createItems(tx, tenantId, auditChecklistId, items, createdBy) {
        if (items.length === 0)
            return;
        await tx.auditChecklistItem.createMany({
            data: items.map((item) => ({
                tenantId,
                auditChecklistId,
                clauseReference: item.clauseReference,
                sequenceNo: item.sequenceNo,
                criteriaText: item.criteriaText,
                guidanceNote: item.guidanceNote,
                createdBy,
                updatedBy: createdBy,
            })),
        });
    }
    async getById(auditChecklistId) {
        return this.prisma.withRls((tx) => tx.auditChecklist.findUniqueOrThrow({ where: { id: auditChecklistId }, include: { items: { orderBy: { sequenceNo: "asc" } } } }));
    }
    async listActive() {
        return this.prisma.withRls((tx) => tx.auditChecklist.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
    }
    async retire(auditChecklistId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.auditChecklist.update({ where: { id: auditChecklistId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }));
    }
};
exports.AuditChecklistService = AuditChecklistService;
exports.AuditChecklistService = AuditChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditChecklistService);
