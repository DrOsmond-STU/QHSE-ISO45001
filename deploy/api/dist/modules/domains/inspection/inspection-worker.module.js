"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const inspection_finding_sla_scan_service_1 = require("./inspection-finding-sla-scan.service");
const inspection_numbering_bootstrap_service_1 = require("./inspection-numbering-bootstrap.service");
const inspection_record_generation_scan_service_1 = require("./inspection-record-generation-scan.service");
const inspection_record_overdue_scan_service_1 = require("./inspection-record-overdue-scan.service");
const inspection_record_service_1 = require("./inspection-record.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// IncidentWorkerModule (3.5): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). InspectionRecordGenerationScanService BUTUH
// InspectionRecordService (genuinely membuat baris inspection_records
// baru, bukan cuma update status spt 2 scan lain) — providers menyertakan
// dependensi transitifnya (InspectionNumberingBootstrapService).
let InspectionWorkerModule = class InspectionWorkerModule {
};
exports.InspectionWorkerModule = InspectionWorkerModule;
exports.InspectionWorkerModule = InspectionWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        providers: [
            inspection_numbering_bootstrap_service_1.InspectionNumberingBootstrapService,
            inspection_record_service_1.InspectionRecordService,
            inspection_record_generation_scan_service_1.InspectionRecordGenerationScanService,
            inspection_record_overdue_scan_service_1.InspectionRecordOverdueScanService,
            inspection_finding_sla_scan_service_1.InspectionFindingSlaScanService,
        ],
        exports: [inspection_record_generation_scan_service_1.InspectionRecordGenerationScanService, inspection_record_overdue_scan_service_1.InspectionRecordOverdueScanService, inspection_finding_sla_scan_service_1.InspectionFindingSlaScanService],
    })
], InspectionWorkerModule);
//# sourceMappingURL=inspection-worker.module.js.map