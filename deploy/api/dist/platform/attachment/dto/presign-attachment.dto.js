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
exports.PresignAttachmentDto = void 0;
const class_validator_1 = require("class-validator");
class PresignAttachmentDto {
    fileName;
    mimeType;
    fileSize;
    entityType;
    entityId;
    // TDD §11 — "whitelist ekstensi per konteks (mis. foto inspeksi: image
    // only; dokumen DMS: PDF/DOCX/XLSX)". Belum ada modul domain (Phase 0)
    // yang memanggil ini, jadi opsional — caller Phase 1+ menyuplai sesuai
    // konteksnya sendiri, fallback ke whitelist platform generik kalau kosong.
    allowedMimeTypes;
}
exports.PresignAttachmentDto = PresignAttachmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PresignAttachmentDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PresignAttachmentDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500 * 1024 * 1024) // 500MB — batas atas absolut permintaan (DEFAULT_MAX_FILE_SIZE_BYTES layanan bisa lebih ketat)
    ,
    __metadata("design:type", Number)
], PresignAttachmentDto.prototype, "fileSize", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PresignAttachmentDto.prototype, "entityType", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PresignAttachmentDto.prototype, "entityId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], PresignAttachmentDto.prototype, "allowedMimeTypes", void 0);
//# sourceMappingURL=presign-attachment.dto.js.map