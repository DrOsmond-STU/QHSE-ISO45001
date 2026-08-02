"use strict";
// notification_preferences.quiet_hours_start/end adalah Postgres `TIME`
// (`@db.Time`, tanpa tanggal) — Prisma Client merepresentasikannya sbg
// `Date` JS dgn tanggal dasar TETAP `1970-01-01` (diverifikasi empiris
// via round-trip create+read langsung ke DB dev SEBELUM kode ini
// ditulis: menulis `Date.UTC(1970,0,1,22,30,0)` terbaca balik persis
// `1970-01-01T22:30:00.000Z`, bukan tergeser timezone). API surface
// (request/response JSON) pakai string "HH:mm" polos — lebih ringkas &
// tidak ambigu drpd ISO datetime penuh utk sesuatu yang cuma "jam
// berapa", pola sama form time-input HTML native.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTimeString = isValidTimeString;
exports.timeStringToDate = timeStringToDate;
exports.dateToTimeString = dateToTimeString;
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isValidTimeString(value) {
    return TIME_FORMAT_REGEX.test(value);
}
function timeStringToDate(value) {
    if (!value)
        return null;
    const match = TIME_FORMAT_REGEX.exec(value);
    if (!match) {
        throw new Error(`Format waktu tidak valid: "${value}" (harapkan "HH:mm").`);
    }
    return new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2]), 0));
}
function dateToTimeString(value) {
    if (!value)
        return null;
    const hours = String(value.getUTCHours()).padStart(2, "0");
    const minutes = String(value.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}
