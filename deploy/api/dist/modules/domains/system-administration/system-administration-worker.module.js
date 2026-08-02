"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemAdministrationWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const attachment_worker_module_1 = require("../../../platform/attachment/attachment-worker.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const user_role_worker_module_1 = require("../user-role/user-role-worker.module");
const usage_counter_scan_service_1 = require("./provisioning/usage-counter-scan.service");
const usage_counter_service_1 = require("./provisioning/usage-counter.service");
const data_import_poll_service_1 = require("./data-import/data-import-poll.service");
const data_import_processing_service_1 = require("./data-import/data-import-processing.service");
const data_import_row_mapper_interface_1 = require("./data-import/row-mappers/data-import-row-mapper.interface");
const data_import_row_mapper_registry_service_1 = require("./data-import/row-mappers/data-import-row-mapper-registry.service");
const employee_row_mapper_1 = require("./data-import/row-mappers/employee-row-mapper");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// OrganizationWorkerModule (1.1)/UserRoleWorkerModule (1.4): tidak ada
// HTTP/guard/JWT, cuma yang genuinely dibutuhkan. Task 1.6 menambah
// AttachmentWorkerModule (ObjectStorageService, baca stream Excel) +
// UserRoleWorkerModule (UserService, dipakai EmployeeRowMapper) +
// DataImportProcessingService/registry mapper-nya sendiri — TIDAK
// termasuk DataImportQueueService (producer, cuma dipakai sisi apps/api
// createJob()/confirmImport()) — worker CUMA konsumen job, pola sama
// persis AttachmentWorkerModule vs AttachmentModule (0.12).
let SystemAdministrationWorkerModule = class SystemAdministrationWorkerModule {
};
exports.SystemAdministrationWorkerModule = SystemAdministrationWorkerModule;
exports.SystemAdministrationWorkerModule = SystemAdministrationWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, attachment_worker_module_1.AttachmentWorkerModule, user_role_worker_module_1.UserRoleWorkerModule],
        providers: [
            usage_counter_service_1.UsageCounterService,
            usage_counter_scan_service_1.UsageCounterScanService,
            employee_row_mapper_1.EmployeeRowMapper,
            {
                provide: data_import_row_mapper_interface_1.DATA_IMPORT_ROW_MAPPERS,
                useFactory: (employeeMapper) => [employeeMapper],
                inject: [employee_row_mapper_1.EmployeeRowMapper],
            },
            data_import_row_mapper_registry_service_1.DataImportRowMapperRegistry,
            data_import_processing_service_1.DataImportProcessingService,
            // Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
            // data-import.worker.ts, dipicu CronRunnerController.
            data_import_poll_service_1.DataImportPollService,
        ],
        exports: [usage_counter_scan_service_1.UsageCounterScanService, data_import_processing_service_1.DataImportProcessingService, data_import_poll_service_1.DataImportPollService],
    })
], SystemAdministrationWorkerModule);
//# sourceMappingURL=system-administration-worker.module.js.map