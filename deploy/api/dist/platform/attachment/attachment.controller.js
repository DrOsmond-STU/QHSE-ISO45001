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
exports.AttachmentController = void 0;
const common_1 = require("@nestjs/common");
const attachment_service_1 = require("./attachment.service");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const confirm_attachment_dto_1 = require("./dto/confirm-attachment.dto");
const presign_attachment_dto_1 = require("./dto/presign-attachment.dto");
// TDD §11 — endpoint HTTP PERTAMA di platform/* (numbering 0.10 & notification
// 0.11 murni in-process, tidak ada controller) karena browser klien perlu
// memanggil presign/confirm langsung, upload sungguhan terjadi DI BROWSER ke
// object storage (bukan lewat backend — TDD §11: "menghindari bottleneck").
// Otorisasi granular per-entity (mis. "boleh attach ke Work Permit INI")
// TIDAK dicek di sini — itu tanggung jawab modul domain (Phase 1+) yang
// memanggil/menge-mount attachment ke entity-nya, sama seperti
// NumberingService/WorkflowEngineService tidak mengecek otorisasi
// domain-spesifik. JwtAuthGuard global (fail-closed) sudah cukup untuk
// task 0.12 murni infra.
let AttachmentController = class AttachmentController {
    attachmentService;
    constructor(attachmentService) {
        this.attachmentService = attachmentService;
    }
    async presign(dto) {
        const result = await this.attachmentService.presign(dto);
        return { data: result };
    }
    async confirm(dto, user) {
        const result = await this.attachmentService.confirm(dto, user.userId);
        return { data: result };
    }
    async download(id) {
        const result = await this.attachmentService.getDownloadUrl(id);
        return { data: result };
    }
};
exports.AttachmentController = AttachmentController;
__decorate([
    (0, common_1.Post)("presign"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [presign_attachment_dto_1.PresignAttachmentDto]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "presign", null);
__decorate([
    (0, common_1.Post)("confirm"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [confirm_attachment_dto_1.ConfirmAttachmentDto, Object]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "confirm", null);
__decorate([
    (0, common_1.Get)(":id/download"),
    __param(0, (0, common_1.Param)("id", common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "download", null);
exports.AttachmentController = AttachmentController = __decorate([
    (0, common_1.Controller)("attachments"),
    __metadata("design:paramtypes", [attachment_service_1.AttachmentService])
], AttachmentController);
//# sourceMappingURL=attachment.controller.js.map