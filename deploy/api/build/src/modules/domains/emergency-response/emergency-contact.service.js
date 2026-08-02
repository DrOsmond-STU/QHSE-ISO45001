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
exports.EmergencyContactService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_response_context_1 = require("./emergency-response-context");
// Task 3.7 (Modul 14 §3 "Tenant Admin | emergency_response.contact.configure").
// Direktori kontak darurat internal/eksternal — bersifat INFORMASI RUJUKAN
// bagi ERT (PRD §2.2 Non-Goals: "Dispatch otomatis ke layanan darurat
// eksternal" TIDAK di-cover, TIDAK ada integrasi API apa pun ke pihak
// ketiga). BELUM ada controller HTTP.
let EmergencyContactService = class EmergencyContactService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.emergencyContact.create({
            data: {
                tenantId,
                siteId: input.siteId,
                contactCategory: input.contactCategory,
                contactName: input.contactName,
                organizationName: input.organizationName,
                phonePrimary: input.phonePrimary,
                phoneSecondary: input.phoneSecondary,
                email: input.email,
                address: input.address,
                distanceFromSiteKm: input.distanceFromSiteKm,
                estimatedResponseTimeMinutes: input.estimatedResponseTimeMinutes,
                is24x7: input.is24x7 ?? false,
                isActive: true,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async getById(emergencyContactId) {
        return this.prisma.withRls((tx) => tx.emergencyContact.findUniqueOrThrow({ where: { id: emergencyContactId } }));
    }
    /** siteId opsional (PRD §5 "nullable utk kontak lingkup company-wide") —
     * ADA kalau caller mau kontak khusus site TERTENTU + yang company-wide
     * SEKALIGUS, TIDAK ADA kalau caller mau seluruh katalog tenant. */
    async listActive(siteId) {
        return this.prisma.withRls((tx) => tx.emergencyContact.findMany({
            where: siteId ? { isActive: true, deletedAt: null, OR: [{ siteId }, { siteId: null }] } : { isActive: true, deletedAt: null },
            orderBy: [{ contactCategory: "asc" }, { contactName: "asc" }],
        }));
    }
    async deactivate(emergencyContactId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.emergencyContact.update({ where: { id: emergencyContactId }, data: { isActive: false, updatedBy } }));
    }
};
exports.EmergencyContactService = EmergencyContactService;
exports.EmergencyContactService = EmergencyContactService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmergencyContactService);
