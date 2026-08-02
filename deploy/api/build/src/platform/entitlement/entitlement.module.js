"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const entitlement_check_service_1 = require("./entitlement-check.service");
const entitlement_guard_1 = require("./entitlement.guard");
// Task 1.5 — BR-01. Diimpor SEBELUM RbacModule di app.module.ts (urutan
// import menentukan urutan eksekusi APP_GUARD, pola sama JwtAuthGuard
// sebelum PermissionGuard sejak 0.6/0.8) supaya EntitlementGuard jalan
// SEBELUM PermissionGuard.
let EntitlementModule = class EntitlementModule {
};
exports.EntitlementModule = EntitlementModule;
exports.EntitlementModule = EntitlementModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule],
        providers: [entitlement_check_service_1.EntitlementCheckService, { provide: core_1.APP_GUARD, useClass: entitlement_guard_1.EntitlementGuard }],
        exports: [entitlement_check_service_1.EntitlementCheckService],
    })
], EntitlementModule);
