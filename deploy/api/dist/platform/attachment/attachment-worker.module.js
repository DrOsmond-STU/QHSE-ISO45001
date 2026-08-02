"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const attachment_scan_service_1 = require("./attachment-scan.service");
const malware_scanner_interface_1 = require("./malware-scanner.interface");
const object_storage_service_1 = require("./object-storage.service");
const stub_malware_scanner_1 = require("./stub-malware-scanner");
// Modul SLIM khusus proses worker (apps/worker) — TIDAK ada HTTP/guard/JWT,
// cuma yang genuinely dibutuhkan AttachmentScanService. TIDAK termasuk
// AttachmentQueueService (producer, cuma dipakai sisi apps/api
// presign()/confirm()) — worker CUMA konsumen job. Pola sama persis
// notification-worker.module.ts (task 0.11) / workflow-engine-worker.module.ts
// (task 0.9).
let AttachmentWorkerModule = class AttachmentWorkerModule {
};
exports.AttachmentWorkerModule = AttachmentWorkerModule;
exports.AttachmentWorkerModule = AttachmentWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule],
        providers: [
            object_storage_service_1.ObjectStorageService,
            stub_malware_scanner_1.StubMalwareScanner,
            { provide: malware_scanner_interface_1.MALWARE_SCANNER, useExisting: stub_malware_scanner_1.StubMalwareScanner },
            attachment_scan_service_1.AttachmentScanService,
        ],
        // ObjectStorageService diekspor juga sejak task 1.6 — DataImportProcessingService
        // (system-administration, sisi worker) baca stream file Excel dari
        // storage yang SAMA, tidak boleh instansiasi client S3 terpisah (biaya
        // koneksi ganda tanpa manfaat, bucket-init onModuleInit() jadi dobel).
        exports: [attachment_scan_service_1.AttachmentScanService, object_storage_service_1.ObjectStorageService],
    })
], AttachmentWorkerModule);
//# sourceMappingURL=attachment-worker.module.js.map