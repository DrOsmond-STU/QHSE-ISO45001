"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulatoryComplianceWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const license_expiry_scan_service_1 = require("./license-expiry-scan.service");
const obligation_due_scan_service_1 = require("./obligation-due-scan.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama DmsWorkerModule
// (2.1): TIDAK ada HTTP/guard/JWT, TIDAK ada *QueueService (producer, cuma
// dipakai sisi apps/api onApplicationBootstrap()) maupun
// ComplianceEvaluationWorkflowCompletionListener (reaksi ke actOnTask() yang
// jalan di apps/api, bukan konsep worker) — cuma 2 scan service yang
// genuinely dikonsumsi worker. NotificationModule (BUKAN
// NotificationWorkerModule) krn scan service ini PRODUCER notifikasi
// (enqueue()), bukan consumer delivery job.
let RegulatoryComplianceWorkerModule = class RegulatoryComplianceWorkerModule {
};
exports.RegulatoryComplianceWorkerModule = RegulatoryComplianceWorkerModule;
exports.RegulatoryComplianceWorkerModule = RegulatoryComplianceWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, notification_module_1.NotificationModule],
        providers: [license_expiry_scan_service_1.LicenseExpiryScanService, obligation_due_scan_service_1.ObligationDueScanService],
        exports: [license_expiry_scan_service_1.LicenseExpiryScanService, obligation_due_scan_service_1.ObligationDueScanService],
    })
], RegulatoryComplianceWorkerModule);
//# sourceMappingURL=regulatory-compliance-worker.module.js.map