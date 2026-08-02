"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NOTIFICATION_LANGUAGE = exports.NOTIFICATION_BACKOFF_BASE_DELAY_MS = exports.NOTIFICATION_MAX_ATTEMPTS = exports.NOTIFICATION_DEAD_LETTER_QUEUE = exports.NOTIFICATION_DELIVERY_JOB_NAME = exports.NOTIFICATION_QUEUE = void 0;
// TDD §13.1 — nama queue persis "notification-queue".
exports.NOTIFICATION_QUEUE = "notification-queue";
exports.NOTIFICATION_DELIVERY_JOB_NAME = "deliver";
// Dead-letter queue TERPISAH (bukan cuma andalkan failed-set internal
// BullMQ) — TASK_INSTRUCTION.md 0.11 eksplisit sebut "-> dead-letter
// queue" sebagai artefak tersendiri, bukan cuma status FAILED di
// notification_logs. Diisi worker (apps/worker/src/notification.worker.ts)
// saat percobaan TERAKHIR tetap gagal — lihat komentar di sana.
exports.NOTIFICATION_DEAD_LETTER_QUEUE = "notification-dead-letter-queue";
// TASK_INSTRUCTION.md §0.11 & TDD §10 sebut "retry exponential backoff max
// 5x" — PRD Modul 25 BR-04 sebut "maksimum 3x". Konflik antar dokumen,
// gap didokumentasikan TDD §26. Dipilih 5x: task instruction & TDD §10
// adalah acuan LANGSUNG task ini, bukan sekadar disebut lewat modul lain.
// Env-overridable HANYA utk uji manual (pola sama
// WORKFLOW_SLA_SCAN_INTERVAL_MS task 0.9), default produksi 5.
exports.NOTIFICATION_MAX_ATTEMPTS = process.env.NOTIFICATION_MAX_ATTEMPTS
    ? parseInt(process.env.NOTIFICATION_MAX_ATTEMPTS, 10)
    : 5;
exports.NOTIFICATION_BACKOFF_BASE_DELAY_MS = 1000;
// Modul 25 §4.1 "bahasa aktif user" — `users.language` BELUM ada kolomnya
// (subset auth-critical task 0.6 tidak menyertakan, menyusul task 1.3
// Modul 02). Dipakai NotificationService kalau caller (event trigger dari
// modul domain) tidak menyuplai `language` eksplisit. Gap didokumentasikan
// TDD §26.
exports.DEFAULT_NOTIFICATION_LANGUAGE = "ID";
