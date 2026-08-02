"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmsWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const document_review_scan_service_1 = require("./document-review-scan.service");
const read_acknowledgement_scan_service_1 = require("./read-acknowledgement-scan.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// SystemAdministrationWorkerModule (1.5)/OrganizationWorkerModule (1.1):
// TIDAK ada HTTP/guard/JWT, TIDAK ada *QueueService (producer, cuma dipakai
// sisi apps/api onApplicationBootstrap()) maupun
// DocumentWorkflowCompletionListener (reaksi ke actOnTask() yang jalan di
// apps/api, bukan konsep worker) — cuma 2 scan service yang genuinely
// dikonsumsi worker. NotificationModule (BUKAN NotificationWorkerModule)
// diimpor krn scan service ini PRODUCER notifikasi (enqueue()), bukan
// consumer delivery job — lihat banner comment NotificationWorkerModule
// kenapa keduanya beda.
let DmsWorkerModule = class DmsWorkerModule {
};
exports.DmsWorkerModule = DmsWorkerModule;
exports.DmsWorkerModule = DmsWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, notification_module_1.NotificationModule],
        providers: [document_review_scan_service_1.DocumentReviewScanService, read_acknowledgement_scan_service_1.ReadAcknowledgementScanService],
        exports: [document_review_scan_service_1.DocumentReviewScanService, read_acknowledgement_scan_service_1.ReadAcknowledgementScanService],
    })
], DmsWorkerModule);
//# sourceMappingURL=dms-worker.module.js.map