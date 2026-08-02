"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeRowMapper = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../../../user-role/user.service");
const employee_row_validation_1 = require("./employee-row-validation");
// targetModuleCode="EMPLOYEE" — satu-satunya mapper konkret task 1.6 (lihat
// banner comment data-import-row-mapper.interface.ts utk alasan ORGANIZATION/
// ASSET/dst belum ada). Reuse UserService.inviteUser() (1.3) APA ADANYA —
// tidak dibongkar/diduplikasi validasi email-uniqueness-nya.
let EmployeeRowMapper = class EmployeeRowMapper {
    userService;
    targetModuleCode = "EMPLOYEE";
    columns = employee_row_validation_1.EMPLOYEE_IMPORT_COLUMNS;
    constructor(userService) {
        this.userService = userService;
    }
    validateRow(raw) {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)(raw);
        return result.valid ? { valid: true } : { valid: false, errorMessage: result.errorMessage };
    }
    async importRow(raw) {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)(raw);
        if (!result.valid) {
            // Defensif — seharusnya sudah disaring fase VALIDATING, tidak pernah
            // tercapai lewat alur normal DataImportProcessingService.
            throw new Error(result.errorMessage);
        }
        await this.userService.inviteUser({
            email: result.row.email,
            fullName: result.row.fullName,
            employeeId: result.row.employeeId,
            jobTitle: result.row.jobTitle,
        });
    }
};
exports.EmployeeRowMapper = EmployeeRowMapper;
exports.EmployeeRowMapper = EmployeeRowMapper = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], EmployeeRowMapper);
