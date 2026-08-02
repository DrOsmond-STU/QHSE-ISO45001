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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImportRowMapperRegistry = void 0;
const common_1 = require("@nestjs/common");
const data_import_row_mapper_interface_1 = require("./data-import-row-mapper.interface");
// Indeks mapper by targetModuleCode. Menambah mapper baru: implement
// DataImportRowMapper, lalu tambahkan ke factory array di
// data-import.module.ts (lihat komentar di sana) — kelas ini sendiri
// TIDAK perlu diubah.
let DataImportRowMapperRegistry = class DataImportRowMapperRegistry {
    byModuleCode = new Map();
    constructor(mappers) {
        for (const mapper of mappers) {
            this.byModuleCode.set(mapper.targetModuleCode, mapper);
        }
    }
    get(targetModuleCode) {
        return this.byModuleCode.get(targetModuleCode);
    }
    isSupported(targetModuleCode) {
        return this.byModuleCode.has(targetModuleCode);
    }
    supportedTargetModuleCodes() {
        return [...this.byModuleCode.keys()];
    }
};
exports.DataImportRowMapperRegistry = DataImportRowMapperRegistry;
exports.DataImportRowMapperRegistry = DataImportRowMapperRegistry = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(data_import_row_mapper_interface_1.DATA_IMPORT_ROW_MAPPERS)),
    __metadata("design:paramtypes", [Array])
], DataImportRowMapperRegistry);
//# sourceMappingURL=data-import-row-mapper-registry.service.js.map