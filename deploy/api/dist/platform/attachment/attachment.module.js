"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentModule = void 0;
const common_1 = require("@nestjs/common");
const observability_module_1 = require("../observability/observability.module");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const attachment_controller_1 = require("./attachment.controller");
const local_storage_controller_1 = require("./local-storage.controller");
const attachment_poll_service_1 = require("./attachment-poll.service");
const attachment_queue_service_1 = require("./attachment-queue.service");
const attachment_scan_service_1 = require("./attachment-scan.service");
const attachment_service_1 = require("./attachment.service");
const malware_scanner_interface_1 = require("./malware-scanner.interface");
const object_storage_service_1 = require("./object-storage.service");
const stub_malware_scanner_1 = require("./stub-malware-scanner");
let AttachmentModule = class AttachmentModule {
};
exports.AttachmentModule = AttachmentModule;
exports.AttachmentModule = AttachmentModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule],
        controllers: [attachment_controller_1.AttachmentController, local_storage_controller_1.LocalStorageController],
        providers: [
            object_storage_service_1.ObjectStorageService,
            attachment_queue_service_1.AttachmentQueueService,
            stub_malware_scanner_1.StubMalwareScanner,
            { provide: malware_scanner_interface_1.MALWARE_SCANNER, useExisting: stub_malware_scanner_1.StubMalwareScanner },
            attachment_service_1.AttachmentService,
            // Diekspor juga di sini (bukan cuma AttachmentWorkerModule) supaya test
            // integration apps/api bisa panggil processScanJob() langsung tanpa
            // boot proses worker terpisah — pola sama NotificationDeliveryService
            // di NotificationModule (task 0.11).
            attachment_scan_service_1.AttachmentScanService,
            // Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
            // attachment-scan.worker.ts, dipicu CronRunnerController.
            attachment_poll_service_1.AttachmentPollService,
        ],
        exports: [attachment_service_1.AttachmentService, attachment_scan_service_1.AttachmentScanService, object_storage_service_1.ObjectStorageService, attachment_poll_service_1.AttachmentPollService],
    })
], AttachmentModule);
//# sourceMappingURL=attachment.module.js.map