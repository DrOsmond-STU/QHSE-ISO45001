// Pencarian kata kunci di dalam dokumen terkendali dan register peraturan.
//
// BAGIAN INI SENGAJA TIDAK MEMANGGIL MODEL SAMA SEKALI.
//
// Yang dicari adalah dokumen milik tenant sendiri, dan jawabannya sudah ada
// di basis data. Menyerahkannya ke model berarti menukar jawaban yang pasti
// dengan jawaban yang mungkin — dan pada dokumen terkendali, "mungkin" tidak
// cukup: orang mencari prosedur untuk diikuti, bukan untuk dikira-kira.
//
// Model dipakai di lapisan LAIN (ai.js): memperluas kata kuncinya lebih dulu
// — "APD" juga dicari sebagai "alat pelindung diri" dan "PPE" — lalu hasil
// perluasan itu dijalankan di sini. Jadi yang menebak adalah pertanyaannya,
// bukan jawabannya. Kalau kunci API tidak ada, perluasan itu dilewati dan
// pencarian ini tetap bekerja apa adanya.
//
// KENAPA KONFIGURASI 'simple', BUKAN 'indonesian'. Postgres bawaan tidak
// menyertakan kamus bahasa Indonesia; 'english' akan memangkas kata Indonesia
// dengan aturan yang keliru ("kerja" -> "kerja", tapi "peraturan" -> "peraturan"
// tanpa mengenali "aturan"). 'simple' hanya memecah dan menurunkan huruf besar,
// tanpa stemming yang salah. Pemenggalan kata majemuk ditangani di lapisan
// perluasan kata kunci, tempat pengetahuan bahasanya memang berada.
const { withRls } = require("./db");

/** Batas hasil per kelompok. Cukup untuk dilihat sekali layar; lebih dari ini
 *  bukan pencarian lagi, melainkan daftar. */
const LIMIT = 12;

/**
 * Pecah masukan pengguna menjadi token yang aman untuk to_tsquery.
 *
 * Tanda baca DIBUANG, bukan di-escape: nomor peraturan seperti "PP 22/2021"
 * membuat to_tsquery melempar galat sintaks kalau garis miringnya lolos, dan
 * galat sintaks pada kotak pencarian berarti pengguna melihat 500 setelah
 * mengetik sesuatu yang wajar. Pencocokan nomor persis tetap ditangani —
 * lewat ILIKE pada frasa aslinya, di bawah.
 */
function tokenize(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 24);
}

/**
 * KATA PENGGUNA DAN KATA KARANGAN MESIN DIPERLAKUKAN BERBEDA, DAN ITU INTINYA.
 *
 *   Frasa yang DIKETIK PENGGUNA  -> OR antar kata, dengan awalan.
 *       "izin kerja panas" menemukan dokumen yang memuat ketiganya (peringkat
 *       tertinggi) maupun yang hanya memuat sebagian. Longgar, karena kata-kata
 *       itu memang yang dia maksud.
 *
 *   Istilah hasil PERLUASAN MODEL -> harus BERDAMPINGAN (<->).
 *       "alat pelindung diri" hanya cocok pada dokumen yang benar-benar memuat
 *       frasa itu — bukan pada setiap dokumen yang kebetulan memuat "alat".
 *
 * Tanpa pembedaan ini, satu perluasan yang kurang tepat langsung membanjiri
 * hasilnya: dicoba dengan kata kunci "APD", perluasan "alat pelindung diri"
 * menaikkan "SOP Inspeksi Alat Pemadam Api" dan "SOP Kalibrasi Alat Ukur" ke
 * peringkat teratas, mengalahkan dokumen yang dicari. Tebakan mesin tidak
 * boleh bisa menggeser kata yang sungguh diketik orangnya.
 */
function frasaBerdampingan(tokens) {
  if (tokens.length === 0) return null;
  // Awalan hanya pada kata terakhir: "alat <-> pelindung <-> diri:*" ikut
  // menemukan "dirinya", tapi tidak melonggarkan kata-kata di depannya.
  return tokens.map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t)).join(" <-> ");
}

function toTsQuery(tokensPengguna, istilahTambahan) {
  const bagian = [];
  if (tokensPengguna.length > 0) bagian.push(tokensPengguna.map((t) => `${t}:*`).join(" | "));
  for (const istilah of istilahTambahan) {
    const frasa = frasaBerdampingan(tokenize(istilah));
    if (frasa) bagian.push(frasa);
  }
  return bagian.map((b) => `(${b})`).join(" | ");
}

const HEADLINE = "StartSel=«, StopSel=», MaxWords=28, MinWords=10, MaxFragments=1";

/**
 * Cari di dokumen terkendali.
 *
 * Yang ikut dicari bukan hanya judul dan uraian dokumennya, tapi juga
 * RINGKASAN PERUBAHAN tiap revisi — di situlah biasanya tertulis apa yang
 * sebenarnya berubah, dan itu yang dicari orang ketika bertanya "prosedur
 * mana yang sudah memuat aturan baru itu".
 */
async function searchDocuments(client, tenantId, tsq, phrase) {
  const { rows } = await client.query(
    `WITH bahan AS (
       SELECT d.document_id AS id, d.document_number, d.title, d.description,
              d.status, d.document_type,
              COALESCE(
                (SELECT string_agg(COALESCE(v.change_summary, '') || ' ' || COALESCE(v.file_name, ''), ' ')
                   FROM document_versions v
                  WHERE v.document_id = d.document_id AND v.deleted_at IS NULL), '') AS revisi
         FROM documents d
        WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
     ), berbobot AS (
       SELECT b.*,
              setweight(to_tsvector('simple', b.document_number), 'A') ||
              setweight(to_tsvector('simple', b.title), 'A') ||
              setweight(to_tsvector('simple', COALESCE(b.description, '')), 'B') ||
              setweight(to_tsvector('simple', b.revisi), 'C') AS vektor
         FROM bahan b
     )
     SELECT id, document_number, title, description, status, document_type,
            ts_rank(vektor, to_tsquery('simple', $2)) +
              CASE WHEN document_number ILIKE $3 OR title ILIKE $3 THEN 1 ELSE 0 END AS skor,
            ts_headline('simple', COALESCE(description, title), to_tsquery('simple', $2), $4) AS cuplikan
       FROM berbobot
      WHERE vektor @@ to_tsquery('simple', $2) OR document_number ILIKE $3 OR title ILIKE $3
      ORDER BY skor DESC, document_number ASC
      LIMIT ${LIMIT}`,
    [tenantId, tsq, `%${phrase}%`, HEADLINE],
  );
  return rows;
}

/**
 * Cari di register peraturan.
 *
 * Kewajiban (compliance_obligations) ikut dicari dan bobotnya paling rendah:
 * satu peraturan bisa punya belasan kewajiban, dan tanpa pembobotan, peraturan
 * bertele-tele akan selalu mengalahkan peraturan yang judulnya persis cocok.
 */
async function searchRegulations(client, tenantId, tsq, phrase) {
  const { rows } = await client.query(
    `WITH bahan AS (
       SELECT r.regulatory_register_id AS id, r.regulation_number, r.title,
              r.issuing_authority, r.summary, r.status, r.source_url, r.effective_date,
              COALESCE(
                (SELECT string_agg(COALESCE(o.obligation_description, ''), ' ')
                   FROM compliance_obligations o
                  WHERE o.regulatory_register_id = r.regulatory_register_id
                    AND o.deleted_at IS NULL), '') AS kewajiban
         FROM regulatory_register r
        WHERE r.tenant_id = $1 AND r.deleted_at IS NULL
     ), berbobot AS (
       SELECT b.*,
              setweight(to_tsvector('simple', b.regulation_number), 'A') ||
              setweight(to_tsvector('simple', b.title), 'A') ||
              setweight(to_tsvector('simple', COALESCE(b.issuing_authority, '')), 'B') ||
              setweight(to_tsvector('simple', COALESCE(b.summary, '')), 'B') ||
              setweight(to_tsvector('simple', b.kewajiban), 'C') AS vektor
         FROM bahan b
     )
     SELECT id, regulation_number, title, issuing_authority, summary, status,
            source_url, effective_date,
            ts_rank(vektor, to_tsquery('simple', $2)) +
              CASE WHEN regulation_number ILIKE $3 OR title ILIKE $3 THEN 1 ELSE 0 END AS skor,
            ts_headline('simple', COALESCE(summary, title), to_tsquery('simple', $2), $4) AS cuplikan
       FROM berbobot
      WHERE vektor @@ to_tsquery('simple', $2) OR regulation_number ILIKE $3 OR title ILIKE $3
      ORDER BY skor DESC, effective_date DESC NULLS LAST
      LIMIT ${LIMIT}`,
    [tenantId, tsq, `%${phrase}%`, HEADLINE],
  );
  return rows;
}

/**
 * Jalankan pencarian untuk SEKUMPULAN istilah.
 *
 * `istilah` sudah termasuk hasil perluasan model (kalau ada). Semuanya
 * digabung menjadi satu tsquery ber-OR: dokumen yang cocok dengan istilah asli
 * tetap menang karena frasa aslinya juga diadu lewat ILIKE, yang memberi bonus
 * skor. Perluasan menambah jangkauan tanpa menggeser yang paling relevan.
 */
async function cari(tenantId, frasa, istilahTambahan = []) {
  const tokensPengguna = tokenize(frasa);
  const tsq = toTsQuery(tokensPengguna, istilahTambahan);
  if (!tsq) return { documents: [], regulations: [], query: "" };

  return withRls(tenantId, async (client) => {
    const [documents, regulations] = await Promise.all([
      searchDocuments(client, tenantId, tsq, frasa),
      searchRegulations(client, tenantId, tsq, frasa),
    ]);
    return { documents, regulations, query: tsq };
  });
}

module.exports = { cari, tokenize };
