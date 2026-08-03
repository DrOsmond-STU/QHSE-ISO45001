// Membuat berkas SUNGGUHAN untuk setiap versi dokumen demo dan untuk sebagian
// register peraturan.
//
// Tanpa langkah ini, modul dokumen terkendali punya 24 dokumen dengan 49 versi
// yang seluruh berkasnya tidak ada — dan penampil dokumen, yang justru bagian
// paling ingin ditunjukkan dari modul itu, selalu kosong.
//
// Dijalankan SETELAH domain-children (yang membuat baris versinya) dan membaca
// ulang barisnya dari basis data, bukan menerima id dari langkah sebelumnya —
// pola yang sama dipakai domain-children sendiri, dan itu yang membuat langkah
// ini bisa dijalankan ulang sendirian setelah dokumennya berubah.
const { simplePdf } = require("./pdf");
const storage = require("../storage");

function tanggal(value) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

function halamanDokumen(dokumen, versi) {
  return simplePdf([
    { text: "DOKUMEN CONTOH — LINGKUNGAN DEMO", size: 9, gap: 0 },
    { text: dokumen.document_number, size: 20, bold: true, gap: 34 },
    { text: dokumen.title, size: 13, bold: true, gap: 22 },
    { text: `Revisi ${versi.major_version}.${versi.minor_version}   Status ${versi.status}`, size: 11, gap: 26 },
    { text: `Jenis dokumen : ${dokumen.document_type || "-"}`, size: 10, gap: 22 },
    { text: `Klasifikasi   : ${dokumen.classification || "-"}`, size: 10 },
    { text: `Tanggal berlaku : ${tanggal(dokumen.effective_date)}`, size: 10 },
    { text: `Tinjauan berikutnya : ${tanggal(dokumen.next_review_date)}`, size: 10 },
    { text: "", size: 10 },
    { text: "Berkas ini dihasilkan penyemai data demo sebagai pengganti isi", size: 10, gap: 26 },
    { text: "dokumen yang sebenarnya. Isinya sengaja tidak menirukan prosedur", size: 10 },
    { text: "sungguhan: dokumen yang terlihat resmi tapi isinya karangan punya", size: 10 },
    { text: "kebiasaan buruk keluar dari lingkungan demo dan dipakai orang.", size: 10 },
    { text: "", size: 10 },
    { text: "Saat dibuka lewat penampil aplikasi, halaman ini diberi watermark", size: 10, gap: 26 },
    { text: "TERKENDALI beserta stempel salinan terkendalinya.", size: 10 },
    { text: versi.change_summary ? `Ringkasan perubahan: ${versi.change_summary}` : "", size: 10, gap: 30 },
  ]);
}

function halamanPeraturan(peraturan) {
  return simplePdf([
    { text: "SALINAN PERATURAN — LINGKUNGAN DEMO", size: 9, gap: 0 },
    { text: peraturan.regulation_number, size: 18, bold: true, gap: 34 },
    { text: peraturan.title, size: 12, bold: true, gap: 24 },
    { text: `Instansi penerbit : ${peraturan.issuing_authority || "-"}`, size: 10, gap: 26 },
    { text: `Tanggal terbit : ${tanggal(peraturan.issue_date)}`, size: 10 },
    { text: `Mulai berlaku  : ${tanggal(peraturan.effective_date)}`, size: 10 },
    { text: `Status : ${peraturan.status || "-"}`, size: 10 },
    { text: "", size: 10 },
    { text: "Berkas ini BUKAN salinan resmi peraturan. Ia dihasilkan penyemai", size: 10, gap: 26 },
    { text: "data demo supaya modul register peraturan punya lampiran yang", size: 10 },
    { text: "benar-benar bisa dibuka. Naskah resminya diambil dari sumber", size: 10 },
    { text: "penerbitnya, dan tautannya ada pada kolom Source URL.", size: 10 },
  ]);
}

async function seedFiles(client, ctx) {
  let versiTerisi = 0;
  let lampiranDibuat = 0;

  // --- Berkas untuk setiap versi dokumen ---
  const { rows: versi } = await client.query(
    `SELECT v.document_version_id, v.document_id, v.major_version, v.minor_version, v.status,
            v.change_summary, v.file_name, v.file_url,
            d.document_number, d.title, d.document_type, d.classification, d.effective_date, d.next_review_date
       FROM document_versions v
       JOIN documents d ON d.document_id = v.document_id AND d.tenant_id = v.tenant_id
      WHERE v.tenant_id = $1 AND v.deleted_at IS NULL
      ORDER BY d.document_number, v.major_version, v.minor_version`,
    [ctx.tenantId],
  );

  for (const row of versi) {
    // Berkas yang SUDAH ada di penyimpanan tidak ditimpa. Penyemaian ulang
    // tidak boleh menghapus berkas yang benar-benar diunggah orang lewat
    // formulir — data demo boleh dibangun ulang, unggahan pengguna tidak.
    if (storage.exists(row.file_url)) continue;

    const pdf = halamanDokumen(row, row);
    const namaBerkas = `${row.document_number.replace(/\//g, "-")}-rev-${row.major_version}.${row.minor_version}.pdf`;
    const saved = storage.saveBuffer(ctx.tenantId, "documents", pdf, namaBerkas);

    await client.query(
      `UPDATE document_versions
          SET file_name = $1, file_url = $2, file_size = $3, mime_type = 'application/pdf', updated_at = now()
        WHERE document_version_id = $4 AND tenant_id = $5`,
      [namaBerkas, saved.key, saved.size, row.document_version_id, ctx.tenantId],
    );
    versiTerisi++;
  }

  // --- Lampiran untuk register peraturan ---
  //
  // Hanya peraturan berstatus ACTIVE yang dilampiri. Peraturan yang sudah
  // dicabut atau digantikan memang wajar tidak punya salinan terkendali, dan
  // melampiri semuanya justru menghapus perbedaan yang ingin ditunjukkan.
  const { rows: peraturan } = await client.query(
    `SELECT regulatory_register_id, regulation_number, title, issuing_authority, issue_date, effective_date, status
       FROM regulatory_register
      WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'
      ORDER BY regulation_number`,
    [ctx.tenantId],
  );

  for (const row of peraturan) {
    const { rows: sudahAda } = await client.query(
      `SELECT file_url FROM attachments
        WHERE tenant_id = $1 AND entity_type = 'regulatory_register' AND entity_id = $2`,
      [ctx.tenantId, row.regulatory_register_id],
    );
    if (sudahAda.some((a) => storage.exists(a.file_url))) continue;

    const pdf = halamanPeraturan(row);
    const namaBerkas = `${row.regulation_number.replace(/[^\w.-]+/g, "-").slice(0, 60)}.pdf`;
    const saved = storage.saveBuffer(ctx.tenantId, "regulatory", pdf, namaBerkas);

    await client.query(
      `INSERT INTO attachments
         (tenant_id, entity_type, entity_id, file_name, file_url, file_size, mime_type, scan_status, uploaded_by, uploaded_at, updated_at)
       VALUES ($1, 'regulatory_register', $2, $3, $4, $5, 'application/pdf', 'CLEAN', $6, now(), now())`,
      [ctx.tenantId, row.regulatory_register_id, namaBerkas, saved.key, saved.size, ctx.audit.created_by],
    );
    lampiranDibuat++;
  }

  return { documentFiles: versiTerisi, regulationAttachments: lampiranDibuat };
}

module.exports = { seedFiles };
