"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskMatrixModule = void 0;
const common_1 = require("@nestjs/common");
const observability_module_1 = require("../../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../../platform/tenancy/tenancy.module");
const hazard_register_service_1 = require("./hazard-register.service");
const risk_matrix_bootstrap_service_1 = require("./risk-matrix-bootstrap.service");
const risk_matrix_config_service_1 = require("./risk-matrix-config.service");
// Task 3.1 (Modul 05), modul DOMAIN KETUJUH. BELUM ada controller HTTP
// (pola sama seluruh modul domain Phase 2+ sejauh ini). TIDAK impor
// WorkflowEngineModule/NumberingModule (beda dari DMS 2.1/Compliance 2.2)
// — cakupan task ini (matriks konfigurasi + hazard register) tidak py
// approval workflow maupun nomor terformat, keduanya baru relevan task 3.2
// (hira_assessments.hira_number dst).
let RiskMatrixModule = class RiskMatrixModule {
};
exports.RiskMatrixModule = RiskMatrixModule;
exports.RiskMatrixModule = RiskMatrixModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule],
        providers: [risk_matrix_bootstrap_service_1.RiskMatrixBootstrapService, risk_matrix_config_service_1.RiskMatrixConfigService, hazard_register_service_1.HazardRegisterService],
        exports: [risk_matrix_bootstrap_service_1.RiskMatrixBootstrapService, risk_matrix_config_service_1.RiskMatrixConfigService, hazard_register_service_1.HazardRegisterService],
    })
], RiskMatrixModule);
