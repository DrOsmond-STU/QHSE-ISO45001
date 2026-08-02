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
exports.UpsertPreferenceDto = void 0;
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const CHANNEL_CODES = ["IN_APP", "EMAIL", "WHATSAPP", "TELEGRAM"];
const DELIVERY_MODES = ["REAL_TIME", "DIGEST_DAILY", "DIGEST_WEEKLY"];
class UpsertPreferenceDto {
    eventCategory;
    // IN_APP diterima di sini SUPAYA request-nya menghasilkan pesan error
    // BR-02 yang jelas dari service layer (BadRequestException), bukan
    // ditolak diam-diam di validasi DTO tanpa penjelasan.
    channelCode;
    isEnabled;
    deliveryMode;
    quietHoursStart;
    quietHoursEnd;
}
exports.UpsertPreferenceDto = UpsertPreferenceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertPreferenceDto.prototype, "eventCategory", void 0);
__decorate([
    (0, class_validator_1.IsIn)(CHANNEL_CODES),
    __metadata("design:type", String)
], UpsertPreferenceDto.prototype, "channelCode", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertPreferenceDto.prototype, "isEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(DELIVERY_MODES),
    __metadata("design:type", String)
], UpsertPreferenceDto.prototype, "deliveryMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "quietHoursStart harus format HH:mm." }),
    __metadata("design:type", String)
], UpsertPreferenceDto.prototype, "quietHoursStart", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "quietHoursEnd harus format HH:mm." }),
    __metadata("design:type", String)
], UpsertPreferenceDto.prototype, "quietHoursEnd", void 0);
