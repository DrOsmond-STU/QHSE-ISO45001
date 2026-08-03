// Pembantu HTTP — bentuk respons sukses dan galat.
//
// Kontraknya bukan pilihan bebas: apps/web membongkar `{ data, meta }` di
// lib/api-client.ts dan membaca galat sebagai RFC 7807 Problem Details
// (packages/shared-types ApiErrorResponse). Bentuk yang berbeda muncul di
// layar sebagai "undefined" atau pesan galat kosong, bukan sebagai kesalahan
// yang bisa ditelusuri.
const MAX_BODY_BYTES = 256 * 1024;

function sendJson(res, status, payload, extraHeaders) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...(extraHeaders || {}),
  });
  res.end(body);
}

function sendData(res, data, meta) {
  sendJson(res, 200, meta === undefined ? { data } : { data, meta });
}

/** RFC 7807 — `type` memakai tag urn: karena demo ini tidak menerbitkan
 * halaman dokumentasi galat, dan URL yang mengarah ke 404 lebih menyesatkan
 * daripada pengenal yang jujur-jujur bukan alamat. */
function sendProblem(res, status, title, detail, instance) {
  sendJson(res, status, {
    type: `urn:qhse:demo-api:${status}`,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(instance ? { instance } : {}),
  });
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Badan permintaan terlalu besar.");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Badan permintaan bukan JSON yang sah.");
  }
}

function parseCookies(header) {
  const jar = {};
  if (!header) return jar;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    jar[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return jar;
}

/** page/limit dibatasi dengan ambang yang sama seperti controller read-only
 * apps/api (limit maksimum 100) supaya jumlah di dashboard tidak berubah
 * hanya karena backend-nya ditukar. */
function readPagination(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, offset: (page - 1) * limit };
}

/** snake_case -> camelCase. apps/web menampilkan nama field Prisma apa adanya
 * (lihat komentar pembuka lib/modules.ts), sementara di sini kolomnya dibaca
 * mentah dari Postgres — konversi ini yang menjembatani keduanya. */
function toCamelCase(value) {
  return value.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function rowToCamel(row) {
  if (!row) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) out[toCamelCase(key)] = value;
  return out;
}

module.exports = { sendJson, sendData, sendProblem, readJsonBody, parseCookies, readPagination, rowToCamel, toCamelCase };
