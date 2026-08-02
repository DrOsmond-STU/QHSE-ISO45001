"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTACHMENT_SCAN_MAX_ATTEMPTS = exports.ATTACHMENT_SCAN_JOB_NAME = exports.ATTACHMENT_SCAN_QUEUE = exports.THUMBNAIL_MAX_DIMENSION_PX = exports.THUMBNAIL_MIME_TYPES = exports.DEFAULT_ALLOWED_MIME_TYPES = exports.DEFAULT_MAX_FILE_SIZE_BYTES = void 0;
// TDD §11 — batas & whitelist default platform (modul domain Phase 1+
// menyuplai allowedMimeTypes sendiri sesuai konteks, mis. "foto inspeksi:
// image only" — ini fallback generik kalau caller tidak menyuplai).
exports.DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
exports.DEFAULT_ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];
exports.THUMBNAIL_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
exports.THUMBNAIL_MAX_DIMENSION_PX = 320;
// TDD §13.1 — nama queue persis "attachment-scan".
exports.ATTACHMENT_SCAN_QUEUE = "attachment-scan";
exports.ATTACHMENT_SCAN_JOB_NAME = "scan";
exports.ATTACHMENT_SCAN_MAX_ATTEMPTS = 3;
