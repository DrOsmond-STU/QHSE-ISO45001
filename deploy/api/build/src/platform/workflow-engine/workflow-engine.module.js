"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngineModule = void 0;
const common_1 = require("@nestjs/common");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const approver_resolution_service_1 = require("./approver-resolution.service");
const workflow_engine_service_1 = require("./workflow-engine.service");
const workflow_sla_queue_service_1 = require("./workflow-sla-queue.service");
const workflow_sla_scan_service_1 = require("./workflow-sla-scan.service");
let WorkflowEngineModule = class WorkflowEngineModule {
};
exports.WorkflowEngineModule = WorkflowEngineModule;
exports.WorkflowEngineModule = WorkflowEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule],
        providers: [approver_resolution_service_1.ApproverResolutionService, workflow_engine_service_1.WorkflowEngineService, workflow_sla_scan_service_1.WorkflowSlaScanService, workflow_sla_queue_service_1.WorkflowSlaQueueService],
        exports: [workflow_engine_service_1.WorkflowEngineService],
    })
], WorkflowEngineModule);
