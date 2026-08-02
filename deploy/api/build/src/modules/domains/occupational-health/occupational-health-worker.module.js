"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupationalHealthWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const mcu_reminder_scan_service_1 = require("./mcu-reminder-scan.service");
const occupational_health_reassessment_scan_service_1 = require("./occupational-health-reassessment-scan.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// EnvironmentalWorkerModule (5.2): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). DUA scan service (murni baca+notifikasi/update
// kolom idempotency, tidak membuat baris baru), TIDAK butuh
// NumberingModule/WorkflowEngineModule/RbacModule/FieldEncryptionModule
// di sini.
let OccupationalHealthWorkerModule = class OccupationalHealthWorkerModule {
};
exports.OccupationalHealthWorkerModule = OccupationalHealthWorkerModule;
exports.OccupationalHealthWorkerModule = OccupationalHealthWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, notification_module_1.NotificationModule],
        providers: [mcu_reminder_scan_service_1.McuReminderScanService, occupational_health_reassessment_scan_service_1.OccupationalHealthReassessmentScanService],
        exports: [mcu_reminder_scan_service_1.McuReminderScanService, occupational_health_reassessment_scan_service_1.OccupationalHealthReassessmentScanService],
    })
], OccupationalHealthWorkerModule);
