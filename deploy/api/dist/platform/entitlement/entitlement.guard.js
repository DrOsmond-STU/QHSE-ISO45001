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
exports.EntitlementGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const require_permission_decorator_1 = require("../rbac/require-permission.decorator");
const entitlement_check_service_1 = require("./entitlement-check.service");
// Task 1.5 — BR-01 (Modul 31 §6). APP_GUARD KETIGA (didaftarkan
// SystemAdministrationModule, diimpor SEBELUM RbacModule di app.module.ts
// supaya jalan LEBIH DULU dari PermissionGuard — "blokir modul secara
// PENUH" lebih fundamental daripada cek permission granular, dan
// menghindari resolusi scope RBAC yang tidak perlu utk modul yang memang
// tidak aktif). Reuse metadata @RequirePermission() (BUKAN decorator baru
// @RequireModule()) — permission_code SUDAH membawa module_code lewat
// Permission.moduleCode (lihat EntitlementCheckService.resolveModuleCodeForPermission()),
// jadi route yang sudah @RequirePermission() OTOMATIS ikut ter-gate modul
// tanpa perlu menandai diri dua kali. Route TANPA @RequirePermission()
// no-op (lolos) — pola PERSIS PermissionGuard (0.8).
let EntitlementGuard = class EntitlementGuard {
    entitlementCheckService;
    reflector;
    constructor(entitlementCheckService, reflector) {
        this.entitlementCheckService = entitlementCheckService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const metadata = this.reflector.getAllAndOverride(require_permission_decorator_1.REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        if (!metadata) {
            return true;
        }
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) {
            // JwtAuthGuard (APP_GUARD pertama) seharusnya sudah menolak sebelum
            // sampai sini — fail closed juga kalau tetap terjadi.
            throw new common_1.ForbiddenException("Akses ditolak.");
        }
        const moduleCode = await this.entitlementCheckService.resolveModuleCodeForPermission(metadata.code);
        if (!moduleCode) {
            // permission_code tidak dikenal katalog — bukan tanggung jawab guard
            // ini (PermissionGuard/hasPermission() yang akan menolaknya).
            return true;
        }
        const allowed = await this.entitlementCheckService.isModuleEnabledForTenant(user.tenantId, moduleCode);
        if (!allowed) {
            throw new common_1.ForbiddenException(`Modul "${moduleCode}" tidak aktif untuk tenant Anda.`);
        }
        return true;
    }
};
exports.EntitlementGuard = EntitlementGuard;
exports.EntitlementGuard = EntitlementGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [entitlement_check_service_1.EntitlementCheckService,
        core_1.Reflector])
], EntitlementGuard);
//# sourceMappingURL=entitlement.guard.js.map