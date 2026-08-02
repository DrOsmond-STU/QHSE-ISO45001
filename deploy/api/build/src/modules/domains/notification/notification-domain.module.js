"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDomainModule = void 0;
const common_1 = require("@nestjs/common");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const notification_controller_1 = require("./notification.controller");
const notification_preference_service_1 = require("./notification-preference.service");
const notification_query_service_1 = require("./notification-query.service");
// Task 1.7 — modul domain notification, SENGAJA dinamai
// "NotificationDomainModule" (bukan "NotificationModule" polos) supaya
// tidak collide dgn platform/notification/notification.module.ts
// (0.11, `NotificationModule` — enqueue()/delivery, kelas SEPENUHNYA
// berbeda). TIDAK mengimpor platform NotificationModule — query di sini
// langsung ke tabel `notifications`/`notification_preferences` lewat
// PrismaService (pola sama query-langsung-ke-tabel-platform yang dipakai
// berulang di codebase ini), tidak ada method relevan di NotificationService
// 0.11 (murni write-side) utk direuse.
let NotificationDomainModule = class NotificationDomainModule {
};
exports.NotificationDomainModule = NotificationDomainModule;
exports.NotificationDomainModule = NotificationDomainModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule],
        controllers: [notification_controller_1.NotificationController],
        providers: [notification_query_service_1.NotificationQueryService, notification_preference_service_1.NotificationPreferenceService],
        exports: [notification_query_service_1.NotificationQueryService, notification_preference_service_1.NotificationPreferenceService],
    })
], NotificationDomainModule);
