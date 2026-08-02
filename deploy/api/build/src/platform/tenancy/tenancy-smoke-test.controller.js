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
exports.TenancySmokeTestController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/public.decorator");
const prisma_service_1 = require("./prisma.service");
// Bukti mekanisme RLS + tenant context berjalan end-to-end (task 0.2),
// dari HTTP request -> AsyncLocalStorage -> SET LOCAL -> query terfilter.
// Dihapus/diganti begitu modul domain sungguhan (Modul 01 dst., Phase 1)
// tersedia dan bisa jadi bukti yang sama secara alami.
//
// Public (task 0.6, JwtAuthGuard global) — TAPI sejak middleware tenant
// context tidak lagi percaya header x-tenant-id mentah (diganti ekstraksi
// JWT, lihat tenant-context.middleware.ts), endpoint ini praktis selalu
// mengembalikan 0 baris tanpa Bearer token valid. Diterima: controller ini
// murni smoke-test task 0.2/0.3, dihapus begitu modul domain Phase 1 ada
// (lihat komentar di atas) — memberi jalur x-tenant-id lagi ke sini di luar
// scope task 0.6.
let TenancySmokeTestController = class TenancySmokeTestController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async check() {
        const rows = await this.prisma.withRls((tx) => tx.rlsSmokeTest.findMany());
        return { data: rows, meta: { count: rows.length } };
    }
};
exports.TenancySmokeTestController = TenancySmokeTestController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TenancySmokeTestController.prototype, "check", null);
exports.TenancySmokeTestController = TenancySmokeTestController = __decorate([
    (0, common_1.Controller)("platform/tenancy-smoke-test"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenancySmokeTestController);
