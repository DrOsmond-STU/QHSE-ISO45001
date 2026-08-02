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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupationalHealthAccessControlService = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const scope_hierarchy_resolver_interface_1 = require("../../../platform/rbac/scope-hierarchy-resolver.interface");
const scope_hierarchy_1 = require("../../../platform/rbac/scope-hierarchy");
const access_control_rules_1 = require("./access-control-rules");
const occupational_health_context_1 = require("./occupational-health-context");
// Modul 13 §3.1 — BR-02 dual-gate. Bagian (a) [permission RBAC
// occupational_health.medical_record.read_phi] MENUNGGU controller layer
// @RequirePermission, pola SAMA seluruh modul domain lain sesi ini (belum
// ada controller dibangun) — lihat banner comment blok Modul 13
// schema.prisma. Service INI HANYA menegakkan bagian (b): whitelist AKTIF
// di occupational_health_authorized_users, DITEGAKKAN SEKARANG (bukan
// menunggu controller) krn ini business logic domain modul ini sendiri,
// BUKAN infrastruktur RBAC generik — beda perlakuan yang SENGAJA (gap
// README menjelaskan kenapa campuran, bukan preseden "tunda semua").
let OccupationalHealthAccessControlService = class OccupationalHealthAccessControlService {
    prisma;
    hierarchyResolver;
    notificationService;
    constructor(prisma, hierarchyResolver, notificationService) {
        this.prisma = prisma;
        this.hierarchyResolver = hierarchyResolver;
        this.notificationService = notificationService;
    }
    /** Throws ForbiddenException kalau actor user (context ambient) TIDAK
     * punya entri AKTIF yang scope-nya mencakup targetScope. Caller (mis.
     * MedicalRecordService.getById()) WAJIB memanggil ini SEBELUM
     * mendekripsi/mengembalikan data PHI apa pun. */
    async assertPhiAccessAuthorized(targetScope) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const userId = (0, occupational_health_context_1.requireActorUserId)();
        const rows = await this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findMany({ where: { tenantId, userId } }));
        const activeRows = rows.filter((row) => (0, access_control_rules_1.isAuthorizationActive)({ status: row.status, expiryDate: row.expiryDate, revokedAt: row.revokedAt }, new Date()));
        if (activeRows.length === 0) {
            await this.alertDeniedAttempt(tenantId, userId);
            throw new common_1.ForbiddenException("Akses PHI ditolak — tidak ada otorisasi aktif di occupational_health_authorized_users (BR-02).");
        }
        const directOrTenantMatch = activeRows.some((row) => (0, scope_hierarchy_1.scopeCovers)({ scopeType: row.authorizedScopeType, scopeId: row.authorizedScopeId }, targetScope));
        if (directOrTenantMatch) {
            return;
        }
        // Pola SAMA PermissionService.hasPermission() (task 1.1) — resolusi
        // ancestor (round-trip DB) HANYA kalau ADA kandidat yang secara teoritis
        // bisa mencakup lewat hierarki (assignment di level lebih TINGGI dari target).
        const needsHierarchy = activeRows.some((row) => scope_hierarchy_1.SCOPE_LEVEL_ORDER[row.authorizedScopeType] < scope_hierarchy_1.SCOPE_LEVEL_ORDER[targetScope.scopeType]);
        if (needsHierarchy) {
            const targetAncestors = await this.hierarchyResolver.resolveAncestors(tenantId, targetScope.scopeType, targetScope.scopeId);
            const coveredViaHierarchy = activeRows.some((row) => (0, scope_hierarchy_1.scopeCovers)({ scopeType: row.authorizedScopeType, scopeId: row.authorizedScopeId }, targetScope, targetAncestors));
            if (coveredViaHierarchy) {
                return;
            }
        }
        await this.alertDeniedAttempt(tenantId, userId);
        throw new common_1.ForbiddenException("Akses PHI ditolak — otorisasi aktif ada, tapi scope-nya tidak mencakup entitas yang diminta (BR-02).");
    }
    // PRD §8 baris 7 — "Akses PHI oleh user di luar whitelist ditolak
    // (percobaan) -> Tenant Admin/DPO (alert keamanan)." Best-effort — kalau
    // enqueue() gagal, TIDAK boleh menutupi ForbiddenException asli (throw
    // di caller tetap terjadi apa pun hasil alert ini).
    async alertDeniedAttempt(tenantId, deniedUserId) {
        try {
            const recipients = await this.prisma.withRls((tx) => tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["TENANT_ADMIN", "COMPLIANCE_OFFICER"] } } } } },
                select: { id: true },
            }));
            for (const recipient of recipients) {
                await this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_PHI_ACCESS_DENIED",
                    entityType: "OCCUPATIONAL_HEALTH_AUTHORIZED_USER",
                    entityId: deniedUserId,
                    recipientUserId: recipient.id,
                    priority: "HIGH",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: { deniedUserId },
                });
            }
        }
        catch {
            // best-effort, lihat komentar di atas.
        }
    }
};
exports.OccupationalHealthAccessControlService = OccupationalHealthAccessControlService;
exports.OccupationalHealthAccessControlService = OccupationalHealthAccessControlService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(scope_hierarchy_resolver_interface_1.SCOPE_HIERARCHY_RESOLVER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, notification_service_1.NotificationService])
], OccupationalHealthAccessControlService);
