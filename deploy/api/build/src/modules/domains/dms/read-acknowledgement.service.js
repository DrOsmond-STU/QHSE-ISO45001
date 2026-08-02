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
exports.ReadAcknowledgementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const dms_context_1 = require("./dms-context");
const read_acknowledgement_lifecycle_1 = require("./read-acknowledgement-lifecycle");
// Task 2.1 (Modul 03 §4.2/§6, BR-04) — sisi USER dari read_acknowledgement_logs
// (ekspansi/pembuatan baris ada di DocumentDistributionService). Seluruh
// method di sini SELF-SCOPE (dms.acknowledgement.acknowledge, PRD §3 "milik
// sendiri") — actingUser HARUS sama dgn ack_log.user_id, pola sama
// NotificationQueryService.markAsRead() (1.7): NotFoundException SERAGAM
// baik utk baris yang genuinely tidak ada MAUPUN milik user lain (BUKAN
// ForbiddenException utk kasus kedua) — mencegah kebocoran info keberadaan
// row, gap #31 (1.3) direplikasi di sini.
let ReadAcknowledgementService = class ReadAcknowledgementService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPendingForCurrentUser() {
        const tenantId = (0, dms_context_1.requireTenantId)();
        const userId = (0, dms_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.readAcknowledgementLog.findMany({
            where: { tenantId, userId, status: { in: ["PENDING", "VIEWED", "OVERDUE"] } },
            orderBy: { createdAt: "desc" },
        }));
    }
    async markViewed(ackLogId) {
        const userId = (0, dms_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const log = await this.findOwnedOrThrow(tx, ackLogId, userId);
            (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)(log.status, "VIEWED", log.acknowledgementMethod);
            return tx.readAcknowledgementLog.update({ where: { id: ackLogId }, data: { status: "VIEWED", viewedAt: new Date() } });
        });
    }
    async acknowledge(ackLogId, method) {
        const userId = (0, dms_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const log = await this.findOwnedOrThrow(tx, ackLogId, userId);
            (0, read_acknowledgement_lifecycle_1.validateAcknowledgementTransition)(log.status, "ACKNOWLEDGED", method);
            return tx.readAcknowledgementLog.update({
                where: { id: ackLogId },
                data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgementMethod: method },
            });
        });
    }
    async findOwnedOrThrow(tx, ackLogId, userId) {
        const log = await tx.readAcknowledgementLog.findUnique({ where: { id: ackLogId } });
        if (!log || log.userId !== userId) {
            throw new common_1.NotFoundException(`read_acknowledgement_logs ${ackLogId} tidak ditemukan.`);
        }
        return log;
    }
};
exports.ReadAcknowledgementService = ReadAcknowledgementService;
exports.ReadAcknowledgementService = ReadAcknowledgementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReadAcknowledgementService);
