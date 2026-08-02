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
exports.LocalStorageController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/public.decorator");
const object_storage_service_1 = require("./object-storage.service");
const local_storage_util_1 = require("./local-storage.util");
// Shared-hosting adaptation (STORAGE_MODE=local) — endpoint tujuan
// uploadUrl/downloadUrl "presigned" yang dihasilkan ObjectStorageService
// mode local (lihat banner comment di sana). @Public() krn caller adalah
// browser client langsung (pola sama presigned S3 URL — otorisasi via
// KEPEMILIKAN TOKEN bertanda tangan HMAC + expiry, BUKAN JWT session), tidak
// pernah dipanggil kalau STORAGE_MODE=s3 (frontend dapat URL S3 asli,
// bukan URL ke controller ini sama sekali).
let LocalStorageController = class LocalStorageController {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    requireSecret() {
        const secret = process.env.LOCAL_STORAGE_SIGNING_SECRET;
        if (!secret) {
            throw new common_1.BadRequestException("STORAGE_MODE=local tidak terkonfigurasi (LOCAL_STORAGE_SIGNING_SECRET kosong).");
        }
        return secret;
    }
    async upload(token, req, res) {
        const payload = (0, local_storage_util_1.verifyLocalStorageToken)(token, this.requireSecret());
        if (!payload) {
            throw new common_1.BadRequestException("Token upload tidak valid atau sudah kedaluwarsa.");
        }
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        await this.storage.putObject(payload.key, body, payload.contentType ?? "application/octet-stream");
        res.status(200).send();
    }
    async download(token, res) {
        const payload = (0, local_storage_util_1.verifyLocalStorageToken)(token, this.requireSecret());
        if (!payload) {
            throw new common_1.BadRequestException("Token download tidak valid atau sudah kedaluwarsa.");
        }
        try {
            const buffer = await this.storage.getObjectBuffer(payload.key);
            res.status(200).send(buffer);
        }
        catch {
            throw new common_1.NotFoundException("File tidak ditemukan.");
        }
    }
};
exports.LocalStorageController = LocalStorageController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Put)("upload/:token"),
    __param(0, (0, common_1.Param)("token")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LocalStorageController.prototype, "upload", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("download/:token"),
    __param(0, (0, common_1.Param)("token")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LocalStorageController.prototype, "download", null);
exports.LocalStorageController = LocalStorageController = __decorate([
    (0, common_1.Controller)("storage/local"),
    __metadata("design:paramtypes", [object_storage_service_1.ObjectStorageService])
], LocalStorageController);
