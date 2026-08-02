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
exports.MedicalRecordAccessLogService = void 0;
const common_1 = require("@nestjs/common");
const request_context_1 = require("../../../platform/observability/request-context");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const occupational_health_context_1 = require("./occupational-health-context");
// BR-01 — "Setiap akses baca (VIEW/EXPORT/PRINT)... wajib tercatat...
// sistem MENOLAK MERENDER DATA jika penulisan log gagal (fail-closed)."
// Method ini TIDAK menangkap error sendiri — kalau INSERT gagal, exception
// menjalar apa adanya ke caller (mis. MedicalRecordService.getById()), yang
// harus memanggil recordAccess() SEBELUM mendekripsi/mengembalikan data:
// urutan "log dulu, baru render" ITU SENDIRI yang menegakkan fail-closed,
// bukan try/catch di sini.
let MedicalRecordAccessLogService = class MedicalRecordAccessLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordAccess(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const accessedByUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.medicalRecordAccessLog.create({
            data: {
                tenantId,
                accessedByUserId,
                subjectEmployeeUserId: input.subjectEmployeeUserId,
                accessedEntityType: input.accessedEntityType,
                accessedEntityId: input.accessedEntityId,
                accessType: input.accessType,
                reasonForAccess: input.reasonForAccess,
                reasonNotes: input.reasonNotes,
                ipAddress: (0, request_context_1.getCurrentIpAddress)(),
                userAgent: (0, request_context_1.getCurrentUserAgent)(),
            },
        }));
    }
};
exports.MedicalRecordAccessLogService = MedicalRecordAccessLogService;
exports.MedicalRecordAccessLogService = MedicalRecordAccessLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MedicalRecordAccessLogService);
