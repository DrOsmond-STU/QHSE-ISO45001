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
exports.AuditTeamMemberService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
const audit_team_rules_1 = require("./audit-team-rules");
// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.audit.assign_team",
// BR-07). BELUM ada controller HTTP.
let AuditTeamMemberService = class AuditTeamMemberService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addMember(auditId, input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        const [candidate, auditeeScopes] = await this.prisma.withRls((tx) => Promise.all([
            tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { departmentId: true } }),
            tx.auditAuditeeScope.findMany({ where: { auditId }, select: { departmentId: true } }),
        ]));
        (0, audit_team_rules_1.assertAuditorIndependence)(candidate.departmentId, auditeeScopes.map((s) => s.departmentId));
        return this.prisma.withRls((tx) => tx.auditTeamMember.create({
            data: { tenantId, auditId, userId: input.userId, roleInTeam: input.roleInTeam, createdBy, updatedBy: createdBy },
        }));
    }
    async removeMember(auditTeamMemberId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.auditTeamMember.update({ where: { id: auditTeamMemberId }, data: { deletedAt: new Date(), updatedBy } }));
    }
    async listByAudit(auditId) {
        return this.prisma.withRls((tx) => tx.auditTeamMember.findMany({ where: { auditId, deletedAt: null } }));
    }
};
exports.AuditTeamMemberService = AuditTeamMemberService;
exports.AuditTeamMemberService = AuditTeamMemberService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditTeamMemberService);
