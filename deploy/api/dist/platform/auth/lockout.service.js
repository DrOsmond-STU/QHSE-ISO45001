"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockoutService = void 0;
const common_1 = require("@nestjs/common");
let LockoutService = class LockoutService {
    isLocked(state, now = new Date()) {
        return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
    }
    recordFailure(state, policy, now = new Date()) {
        const failedLoginAttempts = state.failedLoginAttempts + 1;
        if (failedLoginAttempts >= policy.maxFailedAttempts) {
            return {
                failedLoginAttempts,
                lockedUntil: new Date(now.getTime() + policy.lockoutDurationMinutes * 60_000),
            };
        }
        return { failedLoginAttempts, lockedUntil: state.lockedUntil };
    }
    resetOnSuccess() {
        return { failedLoginAttempts: 0, lockedUntil: null };
    }
};
exports.LockoutService = LockoutService;
exports.LockoutService = LockoutService = __decorate([
    (0, common_1.Injectable)()
], LockoutService);
//# sourceMappingURL=lockout.service.js.map