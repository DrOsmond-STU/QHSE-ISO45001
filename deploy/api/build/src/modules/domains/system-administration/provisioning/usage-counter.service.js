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
exports.UsageCounterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
// Task 1.5 (Modul 31 §5) — usage_counters, snapshot berkala. Dipanggil
// dalam context tenant tertentu (tenantContextStorage.run(), pola sama
// reminder-scan/delegation-scan) oleh usage-counter-scan job.
let UsageCounterService = class UsageCounterService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** ACTIVE_USERS/ACTIVE_SITES — literal PRD §5 (2 metric_type). count()
     * murni menghitung ULANG saat ini (bukan increment/decrement stateful) —
     * snapshot independen tiap panggilan, pola sama semangat
     * system_audit_logs (fakta pada satu titik waktu). */
    async snapshot(tenantId) {
        return this.prisma.withRls(async (tx) => {
            const [activeUserCount, activeSiteCount] = await Promise.all([
                tx.user.count({ where: { tenantId, status: "ACTIVE" } }),
                tx.site.count({ where: { tenantId, status: "ACTIVE" } }),
            ]);
            return Promise.all([
                tx.usageCounter.create({ data: { tenantId, metricType: "ACTIVE_USERS", currentValue: activeUserCount } }),
                tx.usageCounter.create({ data: { tenantId, metricType: "ACTIVE_SITES", currentValue: activeSiteCount } }),
            ]);
        });
    }
    async latestForTenant(tenantId) {
        return this.prisma.withRls(async (tx) => {
            const [latestUsers, latestSites] = await Promise.all([
                tx.usageCounter.findFirst({ where: { tenantId, metricType: "ACTIVE_USERS" }, orderBy: { measuredAt: "desc" } }),
                tx.usageCounter.findFirst({ where: { tenantId, metricType: "ACTIVE_SITES" }, orderBy: { measuredAt: "desc" } }),
            ]);
            return [latestUsers, latestSites].filter((c) => c !== null);
        });
    }
};
exports.UsageCounterService = UsageCounterService;
exports.UsageCounterService = UsageCounterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsageCounterService);
