"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyResponseWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const emergency_plan_review_overdue_scan_service_1 = require("./emergency-plan-review-overdue-scan.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// IncidentWorkerModule (3.5)/InspectionWorkerModule (3.6): TIDAK ada HTTP/
// guard/JWT, TIDAK ada *QueueService (producer). Hanya SATU scan service
// (EmergencyPlanReviewOverdueScanService) — TIDAK py dependensi transitif
// ke service domain manapun (murni baca+notifikasi, tidak membuat baris
// baru spt InspectionRecordGenerationScanService 3.6), jadi TIDAK butuh
// NumberingModule di sini.
let EmergencyResponseWorkerModule = class EmergencyResponseWorkerModule {
};
exports.EmergencyResponseWorkerModule = EmergencyResponseWorkerModule;
exports.EmergencyResponseWorkerModule = EmergencyResponseWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, notification_module_1.NotificationModule],
        providers: [emergency_plan_review_overdue_scan_service_1.EmergencyPlanReviewOverdueScanService],
        exports: [emergency_plan_review_overdue_scan_service_1.EmergencyPlanReviewOverdueScanService],
    })
], EmergencyResponseWorkerModule);
//# sourceMappingURL=emergency-response-worker.module.js.map