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
exports.RbacController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tenancy/prisma.service");
const require_permission_decorator_1 = require("./require-permission.decorator");
// Proof-of-concept @RequirePermission (task 0.8) — permission_code ini
// PERSIS sesuai Modul 02 §3 (baris Super Admin Platform):
// "user_mgmt.permission.manage (katalog global)". Bukan endpoint admin
// sungguhan (Modul 02/task 1.3 yang membangun itu) — cuma membuktikan guard
// + PermissionService bekerja end-to-end terhadap tabel permissions global.
let RbacController = class RbacController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPermissions() {
        const rows = await this.prisma.withRls((tx) => tx.permission.findMany({ where: { isActive: true }, orderBy: { permissionCode: "asc" } }));
        return { data: rows };
    }
};
exports.RbacController = RbacController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("user_mgmt.permission.manage"),
    (0, common_1.Get)("permissions"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RbacController.prototype, "listPermissions", null);
exports.RbacController = RbacController = __decorate([
    (0, common_1.Controller)("rbac"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RbacController);
//# sourceMappingURL=rbac.controller.js.map