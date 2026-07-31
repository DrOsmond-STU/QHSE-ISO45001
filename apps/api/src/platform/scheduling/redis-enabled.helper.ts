// Toggle deployment mode (shared-hosting adaptation): default TRUE (tidak
// berubah utk deployment VPS/Docker/K8s existing yang tidak set var ini
// sama sekali, lihat DEPLOYMENT.md). Set REDIS_ENABLED=false di shared
// hosting cPanel (tidak ada Redis) — semua *-queue.service.ts BullMQ
// producer & Redis-backed platform service (session/permission-cache/
// auth-code/rate-limit) beralih ke pengganti non-Redis (lihat
// cron-runner.module.ts utk scan job, *-poll.service.ts utk notification/
// attachment-scan/data-import, dan db-*.ts implementasi utk session/cache/
// auth-code/rate-limit).
export function isRedisEnabled(): boolean {
  return process.env.REDIS_ENABLED !== "false";
}
