// TDD §8.2/§12 — cache role→permission resolution, TTL 5 menit ATAU
// invalidasi eksplisit event-driven (bukan cuma TTL).
export const PERMISSION_CACHE_TTL_SECONDS = 5 * 60; // 300

export const ROLE_CHANGED_EVENT = "role.changed";
export const PERMISSION_CHANGED_EVENT = "permission.changed";
