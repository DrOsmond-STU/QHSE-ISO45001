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
exports.LoginDto = void 0;
const class_validator_1 = require("class-validator");
// Authorization Code Flow + PKCE (TDD §8.1) — login form internal pun lewat
// alur ini, bukan cuma SSO eksternal. codeChallenge = base64url(SHA256(verifier)),
// panjang tetap 43 karakter (digest SHA-256 32 byte, base64url tanpa padding).
class LoginDto {
    email;
    password;
    codeChallenge;
    codeChallengeMethod;
    state;
    // Task 0.7 — kode TOTP 6 digit, dikirim di submit KEDUA login yang sama
    // setelah server balas "MFA_REQUIRED" pada submit pertama (password saja).
    totpCode;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(43, 43),
    __metadata("design:type", String)
], LoginDto.prototype, "codeChallenge", void 0);
__decorate([
    (0, class_validator_1.IsIn)(["S256"]),
    __metadata("design:type", String)
], LoginDto.prototype, "codeChallengeMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: "totpCode harus 6 digit angka." }),
    __metadata("design:type", String)
], LoginDto.prototype, "totpCode", void 0);
//# sourceMappingURL=login.dto.js.map