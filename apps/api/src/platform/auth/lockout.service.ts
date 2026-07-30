import { Injectable } from "@nestjs/common";

// Lockout per-akun (TDD §16 / PRD §14.3 / PasswordPolicy.maxFailedAttempts,
// lockoutDurationMinutes) — durable, disimpan di kolom `users` (bukan Redis),
// karena ini kontrol keamanan sungguhan yang tidak boleh fail-open kalau
// Redis di-flush (beda dengan session revocation, TDD §12).
//
// Pure/stateless: caller (AuthService) bertanggung jawab baca state saat ini
// dari DB, panggil method di sini, lalu tulis balik hasilnya — supaya logic
// ini bisa diuji tanpa Postgres sungguhan.

export interface LockoutState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface LockoutPolicy {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

@Injectable()
export class LockoutService {
  isLocked(state: LockoutState, now: Date = new Date()): boolean {
    return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
  }

  recordFailure(state: LockoutState, policy: LockoutPolicy, now: Date = new Date()): LockoutState {
    const failedLoginAttempts = state.failedLoginAttempts + 1;
    if (failedLoginAttempts >= policy.maxFailedAttempts) {
      return {
        failedLoginAttempts,
        lockedUntil: new Date(now.getTime() + policy.lockoutDurationMinutes * 60_000),
      };
    }
    return { failedLoginAttempts, lockedUntil: state.lockedUntil };
  }

  resetOnSuccess(): LockoutState {
    return { failedLoginAttempts: 0, lockedUntil: null };
  }
}
