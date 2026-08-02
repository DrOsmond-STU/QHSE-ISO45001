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
exports.EmergencyResponseTeamService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_response_context_1 = require("./emergency-response-context");
const emergency_team_member_rules_1 = require("./emergency-team-member-rules");
// Task 3.7 (Modul 14 §4.2/§6 BR-03). BELUM ada controller HTTP.
let EmergencyResponseTeamService = class EmergencyResponseTeamService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.emergencyResponseTeam.create({
            data: {
                tenantId,
                siteId: input.siteId,
                teamName: input.teamName,
                teamType: input.teamType,
                effectiveDate: input.effectiveDate,
                isActive: true,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /** BR-03 — "ert_role=INCIDENT_COMMANDER wajib unik per
     * emergency_response_team_id AKTIF, kecuali sebagai backup_for_member_id
     * eksplisit." Kandidat existing disaring status=ACTIVE pada tim yang SAMA
     * SEBELUM diteruskan ke fungsi murni. §4.2 poin 2 "validasi kompetensi
     * OPSIONAL via certification_reference" — TIDAK ditegakkan sbg guard
     * (certificationReferenceId bare UUID nullable, Modul 19 belum ada). */
    async addMember(emergencyResponseTeamId, input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existingActiveMembers = await tx.emergencyResponseTeamMember.findMany({
                where: { emergencyResponseTeamId, status: "ACTIVE" },
                select: { ertRole: true, backupForMemberId: true },
            });
            (0, emergency_team_member_rules_1.assertIncidentCommanderUniquePerActiveTeam)(existingActiveMembers, {
                ertRole: input.ertRole,
                backupForMemberId: input.backupForMemberId,
            });
            return tx.emergencyResponseTeamMember.create({
                data: {
                    tenantId,
                    emergencyResponseTeamId,
                    userId: input.userId,
                    ertRole: input.ertRole,
                    backupForMemberId: input.backupForMemberId,
                    certificationReferenceId: input.certificationReferenceId,
                    assignedDate: input.assignedDate,
                    status: "ACTIVE",
                    createdBy,
                    updatedBy: createdBy,
                },
            });
        });
    }
    async removeMember(teamMemberId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.emergencyResponseTeamMember.update({
            where: { id: teamMemberId },
            data: { status: "INACTIVE", endDate: new Date(), updatedBy },
        }));
    }
    async getById(emergencyResponseTeamId) {
        return this.prisma.withRls((tx) => tx.emergencyResponseTeam.findUniqueOrThrow({ where: { id: emergencyResponseTeamId }, include: { members: true } }));
    }
    async listActiveBySite(siteId) {
        return this.prisma.withRls((tx) => tx.emergencyResponseTeam.findMany({ where: { siteId, isActive: true, deletedAt: null }, orderBy: { teamName: "asc" } }));
    }
};
exports.EmergencyResponseTeamService = EmergencyResponseTeamService;
exports.EmergencyResponseTeamService = EmergencyResponseTeamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmergencyResponseTeamService);
