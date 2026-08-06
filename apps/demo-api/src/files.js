// Unggah dan tampilkan berkas untuk dokumen terkendali dan register peraturan.
//
// DUA MODUL, DUA TEMPAT PENYIMPANAN, DAN ITU BUKAN INKONSISTENSI:
//
//   Dokumen terkendali — berkasnya adalah VERSInya. Skema sudah menyediakan
//     document_versions dengan file_name/file_url/file_size/mime_type, dan
//     itu model yang benar menurut ISO 9001 klausul 7.5: yang dikendalikan
//     bukan "dokumen" sebagai satu entitas kabur, melainkan revisi tertentu
//     yang punya nomor, tanggal berlaku, dan status persetujuannya sendiri.
//     Mengunggah berkas baru karena itu MELAHIRKAN VERSI BARU, bukan menimpa
//     berkas lama. Versi lama tetap ada — itulah gunanya dokumen terkendali.
//
//   Register peraturan — bukan dokumen milik perusahaan, melainkan salinan
//     peraturan pihak luar (UU, PP, Permenaker). Ia tidak punya siklus revisi
//     internal, jadi berkasnya masuk ke tabel attachments yang polimorfik.
//     Memaksakan versi pada salinan UU akan menyiratkan perusahaan yang
//     merevisi undang-undang.
const { withRls } = require("./db");
const { sendData, sendProblem, rowToCamel } = require("./http");
const storage = require("./storage");

/** Modul yang menerima unggahan, dan ke mana berkasnya disimpan. */
const UPLOAD_TARGETS = {
  documents: { kind: "documents", mode: "version" },
  "regulatory-registers": { kind: "regulatory", mode: "attachment", entityType: "regulatory_register" },
};

function targetFor(slug) {
  return UPLOAD_TARGETS[slug] || null;
}

async function handleUpload(res, claims, moduleDef, id, body) {
  const target = targetFor(moduleDef.slug);
  if (!target) return sendProblem(res, 404, "Modul ini tidak menerima unggahan berkas.");

  try {
    const buffer = storage.decodeUpload(body || {});
    const fileName = storage.safeName(body.fileName);
    const mimeType = body.mimeType;

    const result = await withRls(claims.tenant_id, async (client) => {
      const { rows: parents } = await client.query(
        `SELECT * FROM ${moduleDef.table} WHERE ${moduleDef.pk} = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, claims.tenant_id],
      );
      if (!parents[0]) return { notFound: true };

      // Berkas ditulis ke disk SETELAH induknya terbukti ada dan milik tenant
      // ini. Ditulis lebih dulu, setiap percobaan unggah ke id yang salah akan
      // meninggalkan berkas yatim yang tidak pernah dirujuk siapa pun.
      const saved = storage.saveBuffer(claims.tenant_id, target.kind, buffer, fileName);

      if (target.mode === "version") {
        // Versi berikutnya = minor + 1 dari yang tertinggi. Kenaikan mayor
        // adalah keputusan editorial (perubahan yang menuntut pelatihan ulang
        // atau persetujuan baru), bukan sesuatu yang bisa disimpulkan dari
        // fakta ada berkas terunggah — jadi tidak ditebak di sini.
        const { rows: tertinggi } = await client.query(
          `SELECT COALESCE(max(major_version), 0) AS mayor,
                  COALESCE(max(minor_version) FILTER (WHERE major_version = (SELECT COALESCE(max(major_version), 0) FROM document_versions WHERE document_id = $1 AND tenant_id = $2 AND deleted_at IS NULL)), -1) AS minor
             FROM document_versions WHERE document_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
          [id, claims.tenant_id],
        );
        const mayor = Number(tertinggi[0]?.mayor) || 1;
        const minor = Number(tertinggi[0]?.minor) + 1;

        const { rows } = await client.query(
          `INSERT INTO document_versions
             (tenant_id, document_id, major_version, minor_version, file_name, file_url, file_size, mime_type,
              change_summary, status, created_by, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', $10, $10, now(), now())
           RETURNING *, document_version_id AS id`,
          [
            claims.tenant_id,
            id,
            mayor,
            minor,
            fileName,
            saved.key,
            saved.size,
            mimeType,
            body.changeSummary || null,
            claims.sub,
          ],
        );
        return { row: rows[0], kind: "version" };
      }

      const { rows } = await client.query(
        `INSERT INTO attachments
           (tenant_id, entity_type, entity_id, file_name, file_url, file_size, mime_type, scan_status, uploaded_by, uploaded_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'CLEAN', $8, now(), now())
         RETURNING *, attachment_id AS id`,
        [claims.tenant_id, target.entityType, id, fileName, saved.key, saved.size, mimeType, claims.sub],
      );
      return { row: rows[0], kind: "attachment" };
    });

    if (result.notFound) return sendProblem(res, 404, "Data induk tidak ditemukan.");
    sendData(res, { kind: result.kind, ...rowToCamel(result.row) });
  } catch (error) {
    if (error instanceof storage.StorageError) return sendProblem(res, error.status, error.title, error.detail);
    throw error;
  }
}

/**
 * Menukar identitas berkas dengan URL berumur pendek yang bisa dipakai
 * <iframe>/<img>. Izinnya diperiksa DI SINI — saat token dibuat — bukan saat
 * berkasnya diambil: pengambilan hanya membuktikan token sah, dan token hanya
 * diberikan kepada yang barusan lolos pemeriksaan tenant lewat RLS.
 */
async function handleSignFile(res, claims, body) {
  const { kind, id } = body || {};
  if (kind !== "version" && kind !== "attachment") {
    return sendProblem(res, 400, "Jenis berkas tidak dikenal.", "kind harus 'version' atau 'attachment'.");
  }

  const row = await withRls(claims.tenant_id, async (client) => {
    const sql =
      kind === "version"
        ? `SELECT v.file_name, v.file_url, v.mime_type, v.file_size, v.major_version, v.minor_version, v.status,
                  d.document_number, d.title
             FROM document_versions v
             JOIN documents d ON d.document_id = v.document_id AND d.tenant_id = v.tenant_id
            WHERE v.document_version_id = $1 AND v.tenant_id = $2 AND v.deleted_at IS NULL`
        : `SELECT a.file_name, a.file_url, a.mime_type, a.file_size, r.regulation_number AS document_number, r.title
             FROM attachments a
             JOIN regulatory_register r ON r.regulatory_register_id = a.entity_id AND r.tenant_id = a.tenant_id
            WHERE a.attachment_id = $1 AND a.tenant_id = $2`;
    const { rows } = await client.query(sql, [id, claims.tenant_id]);
    return rows[0] || null;
  });

  if (!row) return sendProblem(res, 404, "Berkas tidak ditemukan.");
  if (!storage.exists(row.file_url)) {
    // Dibedakan dari 404 dengan sengaja: barisnya ADA, berkasnya yang tidak.
    // Itu keadaan nyata pada data yang disemai lewat SQL, dan menyamarkannya
    // sebagai "tidak ditemukan" membuat orang mencari baris yang sebenarnya
    // ada di depan mata.
    return sendProblem(
      res,
      409,
      "Berkasnya belum diunggah.",
      "Metadata versi ini ada di basis data, tapi berkasnya tidak ada di penyimpanan. Unggah ulang berkasnya.",
    );
  }

  const token = storage.createToken({ key: row.file_url, mimeType: row.mime_type, fileName: row.file_name });
  sendData(res, {
    url: `/files/download?token=${encodeURIComponent(token)}`,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    inlineViewable: storage.INLINE_VIEWABLE.has(row.mime_type),
    documentNumber: row.document_number,
    title: row.title,
    version: row.major_version !== undefined ? `${row.major_version}.${row.minor_version}` : null,
    status: row.status ?? null,
  });
}

function handleDownload(req, res, url) {
  const payload = storage.verifyToken(url.searchParams.get("token"));
  if (!payload) {
    return sendProblem(res, 403, "Tautan berkas tidak sah atau sudah kedaluwarsa.", "Muat ulang halamannya.");
  }
  const buffer = storage.readBuffer(payload.key);
  if (!buffer) return sendProblem(res, 404, "Berkas tidak ada di penyimpanan.");

  const disposition = url.searchParams.get("unduh") === "1" ? "attachment" : "inline";
  res.writeHead(200, {
    "Content-Type": payload.mimeType || "application/octet-stream",
    "Content-Length": buffer.length,
    "Content-Disposition": `${disposition}; filename="${storage.safeName(payload.fileName)}"`,
    // Tautannya berumur pendek dan berisi token; jangan sampai tersimpan di
    // cache bersama atau riwayat perantara.
    "Cache-Control": "private, no-store",
    // Berkas yang diunggah pengguna tidak boleh ditebak tipenya oleh peramban:
    // HTML yang menyamar sebagai PDF akan dieksekusi pada origin yang sama.
    "X-Content-Type-Options": "nosniff",
  });
  res.end(buffer);
}

module.exports = { handleUpload, handleSignFile, handleDownload, targetFor };
