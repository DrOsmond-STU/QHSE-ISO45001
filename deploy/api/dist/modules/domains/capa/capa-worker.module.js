"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapaWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const capa_effectiveness_verification_due_scan_service_1 = require("./capa-effectiveness-verification-due-scan.service");
const capa_root_cause_sla_scan_service_1 = require("./capa-root-cause-sla-scan.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// AuditWorkerModule (4.1): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). DUA scan service (murni baca+notifikasi/
// update kolom idempotency, tidak membuat baris baru), jadi TIDAK butuh
// NumberingModule/WorkflowEngineModule di sini.
let CapaWorkerModule = class CapaWorkerModule {
};
exports.CapaWorkerModule = CapaWorkerModule;
exports.CapaWorkerModule = CapaWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, notification_module_1.NotificationModule],
        providers: [capa_root_cause_sla_scan_service_1.CapaRootCauseSlaScanService, capa_effectiveness_verification_due_scan_service_1.CapaEffectivenessVerificationDueScanService],
        exports: [capa_root_cause_sla_scan_service_1.CapaRootCauseSlaScanService, capa_effectiveness_verification_due_scan_service_1.CapaEffectivenessVerificationDueScanService],
    })
], CapaWorkerModule);
//# sourceMappingURL=capa-worker.module.js.map