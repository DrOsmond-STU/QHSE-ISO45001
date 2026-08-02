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
exports.IncidentCorrectiveActionLinkService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const incident_context_1 = require("./incident-context");
// PRD §5/§6 BR-08 — tabel TAUTAN/LINK ke Modul 10 (CAPA, BELUM ADA di
// codebase ini, task 4.2) — BUKAN tempat mendefinisikan action plan.
// DTO ini SENGAJA tidak mengekspos field detail (action_description/PIC/
// due_date apa pun) — BR-08 "sistem menolak penambahan field detail action
// plan langsung di tabel ini" TERPENUHI BY CONSTRUCTION (tidak ada jalur
// utk menulisnya sama sekali), bukan validasi runtime eksplisit.
let IncidentCorrectiveActionLinkService = class IncidentCorrectiveActionLinkService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async link(input) {
        const createdBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.incidentCorrectiveAction.create({
            data: {
                tenantId,
                incidentReportId: input.incidentReportId,
                incidentInvestigationId: input.incidentInvestigationId,
                capaRegisterId: input.capaRegisterId,
                linkedBy: createdBy,
                linkedAt: new Date(),
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /** Modul 10 BELUM ADA — TIDAK ada event/listener sungguhan yang memanggil
     * ini (gap TDD §26, pola sama incident_corrective_actions.capa_register_id
     * bare UUID tanpa FK) — method disediakan sbg titik sinkronisasi masa
     * depan begitu Modul 10 dibangun. */
    async updateCapaStatusCache(incidentCorrectiveActionId, capaStatusCache) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.incidentCorrectiveAction.update({ where: { id: incidentCorrectiveActionId }, data: { capaStatusCache, updatedBy } }));
    }
    async listByReport(incidentReportId) {
        return this.prisma.withRls((tx) => tx.incidentCorrectiveAction.findMany({ where: { incidentReportId }, orderBy: { linkedAt: "desc" } }));
    }
};
exports.IncidentCorrectiveActionLinkService = IncidentCorrectiveActionLinkService;
exports.IncidentCorrectiveActionLinkService = IncidentCorrectiveActionLinkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IncidentCorrectiveActionLinkService);
