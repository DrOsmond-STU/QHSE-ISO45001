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
exports.AuditAuditeeScopeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.audit.assign_team").
// BELUM ada controller HTTP. BR-07 divalidasi di AuditTeamMemberService
// SAAT anggota tim ditambahkan (bukan retroaktif saat scope baru
// ditambahkan setelah tim sudah ada) — pola sama seluruh gate "add-time
// only" modul lain.
let AuditAuditeeScopeService = class AuditAuditeeScopeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addScope(auditId, input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.auditAuditeeScope.create({
            data: {
                tenantId,
                auditId,
                departmentId: input.departmentId,
                processArea: input.processArea,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async listByAudit(auditId) {
        return this.prisma.withRls((tx) => tx.auditAuditeeScope.findMany({ where: { auditId, deletedAt: null } }));
    }
};
exports.AuditAuditeeScopeService = AuditAuditeeScopeService;
exports.AuditAuditeeScopeService = AuditAuditeeScopeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditAuditeeScopeService);
