import { LockoutService, LockoutState } from "./lockout.service";

describe("LockoutService", () => {
  const service = new LockoutService();
  const policy = { maxFailedAttempts: 5, lockoutDurationMinutes: 30 };
  const now = new Date("2026-07-23T12:00:00Z");

  it("increment counter tanpa lock sebelum threshold", () => {
    let state: LockoutState = { failedLoginAttempts: 0, lockedUntil: null };
    for (let i = 1; i < policy.maxFailedAttempts; i++) {
      state = service.recordFailure(state, policy, now);
      expect(state.failedLoginAttempts).toBe(i);
      expect(state.lockedUntil).toBeNull();
      expect(service.isLocked(state, now)).toBe(false);
    }
  });

  it("mengunci akun begitu mencapai threshold", () => {
    let state: LockoutState = { failedLoginAttempts: 0, lockedUntil: null };
    for (let i = 0; i < policy.maxFailedAttempts; i++) {
      state = service.recordFailure(state, policy, now);
    }
    expect(state.failedLoginAttempts).toBe(policy.maxFailedAttempts);
    expect(state.lockedUntil).not.toBeNull();
    expect(service.isLocked(state, now)).toBe(true);
    expect(state.lockedUntil!.getTime()).toBe(now.getTime() + 30 * 60_000);
  });

  it("tidak lagi locked setelah lockedUntil terlewati", () => {
    const state = { failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() + 30 * 60_000) };
    const after = new Date(now.getTime() + 31 * 60_000);
    expect(service.isLocked(state, after)).toBe(false);
  });

  it("resetOnSuccess mengembalikan counter ke 0 dan lockedUntil ke null", () => {
    const reset = service.resetOnSuccess();
    expect(reset).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
  });
});
