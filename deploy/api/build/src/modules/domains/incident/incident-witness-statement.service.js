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
exports.IncidentWitnessStatementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const incident_context_1 = require("./incident-context");
// BR-07 (PRD Modul 07 §6) — "tidak dapat diedit setelah statement_datetime
// difinalisasi — koreksi dicatat sebagai entri baru." TIDAK ADA method
// update() sama sekali di service ini (pola sama HazardRegisterService
// tanpa hard-delete, BR-07 Modul 05, 3.1) — terpenuhi BY CONSTRUCTION,
// koreksi = record() lagi dgn statement_datetime baru.
let IncidentWitnessStatementService = class IncidentWitnessStatementService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(input) {
        const recordedBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.incidentWitnessStatement.create({
            data: {
                tenantId,
                incidentReportId: input.incidentReportId,
                witnessUserId: input.witnessUserId,
                witnessNameExternal: input.witnessNameExternal,
                statementText: input.statementText,
                statementDatetime: input.statementDatetime,
                recordedBy,
                createdBy: recordedBy,
                updatedBy: recordedBy,
            },
        }));
    }
    async listByReport(incidentReportId) {
        return this.prisma.withRls((tx) => tx.incidentWitnessStatement.findMany({ where: { incidentReportId }, orderBy: { statementDatetime: "desc" } }));
    }
};
exports.IncidentWitnessStatementService = IncidentWitnessStatementService;
exports.IncidentWitnessStatementService = IncidentWitnessStatementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IncidentWitnessStatementService);
