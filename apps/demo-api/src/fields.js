// Bentuk formulir DITURUNKAN DARI SKEMA, bukan ditulis ulang per modul.
//
// Alternatifnya adalah mendaftarkan setiap kolom yang boleh diisi untuk 15
// modul dengan tangan. Itu berarti ~250 baris deklarasi yang harus diubah
// setiap kali ada migrasi — dan yang lebih buruk, ketika satu kolom berubah
// jadi NOT NULL dan daftarnya lupa diperbarui, gejalanya bukan pesan validasi
// melainkan galat Postgres mentah saat pengguna menekan Simpan.
//
// Karena itu tipe, wajib-tidaknya, panjang maksimum, dan pilihan enum dibaca
// dari information_schema dan pg_enum saat diminta. Yang TIDAK bisa
// disimpulkan dari skema — nama kolom dalam bahasa Indonesia dan kolom mana
// yang sengaja tidak boleh disentuh formulir — ditulis tangan di bawah, dan
// hanya itu.
const { toCamelCase } = require("./http");
const { BY_COLUMN } = require("./labels");

// Kolom yang TIDAK PERNAH muncul di formulir, apa pun modulnya.
//
// `status` ada di daftar ini dan itu keputusan yang paling penting di berkas
// ini: status adalah hasil dari sebuah proses (diajukan, disetujui, ditutup),
// bukan atribut yang boleh diketik. Membiarkannya diedit lewat formulir
// berarti siapa pun bisa mengubah izin kerja dari DRAFT menjadi APPROVED
// tanpa satu pun tanda tangan — persis hal yang seluruh modul persetujuan ini
// dibangun untuk mencegahnya. Perubahan status hanya lewat POST /:modul/:id/
// transition, yang memeriksa transisinya sah menurut state machine modul itu.
const NEVER_WRITABLE = new Set([
  "tenant_id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "deleted_at",
  "status",
  "workflow_instance_id",
  "custom_fields",
  "current_version_id",
]);

// Nama kolom -> label Indonesia. Yang tidak ada di sini dimanusiakan dari nama
// kolomnya (`planned_start_date` -> `Planned start date`), yang sudah cukup
// terbaca untuk kolom yang jarang dipakai dan tidak sepadan didaftarkan satu
// per satu.
const LABELS = {
  title: "Judul",
  description: "Uraian",
  notes: "Catatan",
  site_id: "Lokasi",
  company_id: "Perusahaan",
  branch_id: "Cabang",
  department_id: "Departemen",
  document_number: "Nomor dokumen",
  document_type: "Jenis dokumen",
  document_category_id: "Kategori dokumen",
  classification: "Klasifikasi",
  owner_user_id: "Pemilik dokumen",
  effective_date: "Tanggal berlaku",
  review_cycle_months: "Siklus tinjauan (bulan)",
  next_review_date: "Tinjauan berikutnya",
  retention_years: "Masa simpan (tahun)",
  permit_number: "Nomor izin",
  work_permit_type_id: "Jenis izin kerja",
  location_detail: "Detail lokasi",
  requester_id: "Pemohon",
  contractor_company_id: "Kontraktor pelaksana",
  risk_level: "Tingkat risiko",
  planned_start_datetime: "Rencana mulai",
  planned_end_datetime: "Rencana selesai",
  actual_start_datetime: "Realisasi mulai",
  actual_end_datetime: "Realisasi selesai",
  number_of_workers: "Jumlah pekerja",
  incident_number: "Nomor insiden",
  classification_: "Klasifikasi",
  severity_level: "Tingkat keparahan",
  incident_datetime: "Waktu kejadian",
  reported_datetime: "Waktu dilaporkan",
  immediate_action_taken: "Tindakan segera",
  is_anonymous: "Laporan anonim",
  injured_person_id: "Pekerja yang cedera",
  involves_contractor: "Melibatkan kontraktor",
  days_lost: "Hari kerja hilang",
  estimated_cost: "Estimasi biaya",
  capa_number: "Nomor CAPA",
  source_type: "Sumber",
  source_reference_number: "Nomor rujukan sumber",
  category: "Kategori",
  priority: "Prioritas",
  problem_statement: "Pernyataan masalah",
  target_closure_date: "Target penutupan",
  actual_closure_date: "Realisasi penutupan",
  audit_number: "Nomor audit",
  audit_type_id: "Jenis audit",
  audit_checklist_id: "Checklist audit",
  lead_auditor_id: "Ketua auditor",
  planned_start_date: "Rencana mulai",
  planned_end_date: "Rencana selesai",
  actual_start_date: "Realisasi mulai",
  actual_end_date: "Realisasi selesai",
  opening_meeting_datetime: "Rapat pembukaan",
  opening_meeting_notes: "Notulen pembukaan",
  closing_meeting_datetime: "Rapat penutupan",
  closing_meeting_notes: "Notulen penutupan",
  overall_conclusion: "Kesimpulan keseluruhan",
  inspection_record_number: "Nomor inspeksi",
  inspection_checklist_template_id: "Template checklist",
  inspector_id: "Inspektor",
  planned_date: "Tanggal rencana",
  actual_date: "Tanggal pelaksanaan",
  overall_score: "Skor keseluruhan",
  overall_result: "Hasil keseluruhan",
  ncr_number: "Nomor NCR",
  ncr_source: "Sumber NCR",
  detected_date: "Tanggal terdeteksi",
  detection_stage: "Tahap deteksi",
  severity: "Keparahan",
  defect_category: "Kategori cacat",
  quantity_nonconforming: "Jumlah tidak sesuai",
  unit_of_measure: "Satuan",
  immediate_containment_action: "Tindakan penahanan segera",
  disposition: "Disposisi",
  disposition_justification: "Justifikasi disposisi",
  hira_number: "Nomor HIRA",
  assessment_date: "Tanggal penilaian",
  activity_process_area: "Area aktivitas/proses",
  risk_matrix_config_id: "Matriks risiko",
  register_number: "Nomor register",
  environmental_aspect: "Aspek lingkungan",
  environmental_impact: "Dampak lingkungan",
  impact_type: "Jenis dampak",
  life_cycle_stage: "Tahap daur hidup",
  condition_type: "Kondisi",
  likelihood_score: "Skor kemungkinan",
  severity_score: "Skor keparahan",
  frequency_score: "Skor frekuensi",
  regulatory_score: "Skor regulasi",
  stakeholder_concern_score: "Skor perhatian pemangku kepentingan",
  significance_score: "Skor signifikansi",
  significance_threshold: "Ambang signifikansi",
  significance_level: "Tingkat signifikansi",
  existing_controls: "Pengendalian yang ada",
  is_regulated: "Diatur regulasi",
  review_date: "Tanggal tinjauan",
  plan_number: "Nomor rencana",
  plan_name: "Nama rencana",
  scenario_type: "Jenis skenario",
  severity_level_: "Tingkat keparahan",
  asset_code: "Kode aset",
  asset_name: "Nama aset",
  asset_category_id: "Kategori aset",
  manufacturer: "Pabrikan",
  model_number: "Nomor model",
  serial_number: "Nomor seri",
  purchase_date: "Tanggal pembelian",
  is_safety_critical: "Kritis keselamatan",
  lifecycle_status: "Status daur hidup",
  condition_status: "Kondisi",
  equipment_tag_no: "Tag alat",
  measurement_parameter: "Parameter ukur",
  calibration_interval_months: "Interval kalibrasi (bulan)",
  is_critical_measurement: "Pengukuran kritis",
  contractor_name: "Nama kontraktor",
  contractor_type: "Jenis kontraktor",
  contractor_category: "Kategori kontraktor",
  overall_risk_rating: "Peringkat risiko",
  contact_person_name: "Narahubung",
  contact_person_phone: "Telepon narahubung",
  contact_person_email: "Surel narahubung",
  regulation_number: "Nomor peraturan",
  regulation_title: "Judul peraturan",
  issuing_authority: "Instansi penerbit",
  employee_user_id: "Pekerja",
  restriction_type: "Jenis pembatasan",
  alternative_task_description: "Tugas alternatif",
  start_date: "Tanggal mulai",
  end_date: "Tanggal selesai",
};

function humanize(column) {
  const words = column.replace(/_id$/, "").split("_");
  const first = words[0];
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(" ");
}

function labelFor(column) {
  return LABELS[column] || humanize(column);
}

/** data_type Postgres -> tipe yang dimengerti formulir. */
function fieldType(column) {
  if (column.data_type === "USER-DEFINED") return "enum";
  if (BY_COLUMN[column.column_name]) return "ref";
  switch (column.data_type) {
    case "boolean":
      return "boolean";
    case "integer":
    case "smallint":
    case "bigint":
    case "numeric":
    case "double precision":
    case "real":
      return "number";
    case "date":
      return "date";
    case "timestamp with time zone":
    case "timestamp without time zone":
      return "datetime";
    case "text":
      return "longtext";
    case "jsonb":
    case "json":
      return "json";
    default:
      return "text";
  }
}

const columnCache = new Map();
const enumCache = new Map();

async function columnsOf(client, table) {
  if (columnCache.has(table)) return columnCache.get(table);
  const { rows } = await client.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length,
            is_generated, numeric_precision, numeric_scale
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  columnCache.set(table, rows);
  return rows;
}

async function enumValues(client, udtName) {
  if (enumCache.has(udtName)) return enumCache.get(udtName);
  const { rows } = await client.query(
    `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = $1 ORDER BY e.enumsortorder`,
    [udtName],
  );
  const values = rows.map((row) => row.enumlabel);
  enumCache.set(udtName, values);
  return values;
}

// Batas jumlah pilihan untuk field rujukan. 200 cukup untuk seluruh tabel
// rujukan di skema ini (pengguna, lokasi, jenis izin); kalau suatu saat tidak
// cukup, jawabannya adalah kotak cari di sisi klien, bukan menaikkan angka
// ini sampai formulirnya memuat ribuan <option> yang tidak bisa ditelusuri.
const REF_OPTION_LIMIT = 200;

async function refOptions(client, tenantId, column) {
  const target = BY_COLUMN[column];
  if (!target) return null;
  const [table, pk, labelColumn] = target;
  const columns = await columnsOf(client, table);
  if (columns.length === 0) return null;
  const hasTenant = columns.some((c) => c.column_name === "tenant_id");
  const hasDeleted = columns.some((c) => c.column_name === "deleted_at");
  const where = [hasTenant ? `tenant_id = $1` : null, hasDeleted ? `deleted_at IS NULL` : null]
    .filter(Boolean)
    .join(" AND ");
  const { rows } = await client.query(
    `SELECT ${pk} AS value, ${labelColumn} AS label FROM ${table}
      ${where ? `WHERE ${where}` : ""}
      ORDER BY ${labelColumn} ASC LIMIT ${REF_OPTION_LIMIT + 1}`,
    hasTenant ? [tenantId] : [],
  );
  return {
    options: rows.slice(0, REF_OPTION_LIMIT).map((row) => ({ value: row.value, label: row.label })),
    truncated: rows.length > REF_OPTION_LIMIT,
  };
}

/**
 * Deskripsi field yang boleh diisi untuk sebuah modul.
 *
 * `write.hidden` per modul dipakai untuk kolom yang secara teknis bisa ditulis
 * tapi tidak boleh diketik manusia — nilai turunan (skor signifikansi yang
 * dihitung dari lima skor lain) dan kolom yang diisi proses lain.
 */
async function describeFields(client, tenantId, moduleDef) {
  const write = moduleDef.write || {};
  const hidden = new Set(write.hidden || []);
  const columns = await columnsOf(client, moduleDef.table);

  const fields = [];
  for (const column of columns) {
    const name = column.column_name;
    if (name === moduleDef.pk) continue;
    if (NEVER_WRITABLE.has(name)) continue;
    if (hidden.has(name)) continue;
    if (column.is_generated === "ALWAYS") continue;
    // Kolom nomor dokumen dibuat server saat create dan tidak pernah diubah
    // sesudahnya — nomor yang bisa diketik ulang adalah nomor yang bisa
    // bentrok, dan keterlacakan seluruh modul bergantung padanya.
    if (name === write.numberColumn) continue;

    const type = fieldType(column);
    if (type === "json") continue;

    const field = {
      column: name,
      key: toCamelCase(name),
      label: labelFor(name),
      type,
      required: column.is_nullable === "NO" && column.column_default === null,
      maxLength: column.character_maximum_length,
    };
    if (type === "enum") field.options = (await enumValues(client, column.udt_name)).map((value) => ({ value, label: value }));
    if (type === "ref") {
      const refs = await refOptions(client, tenantId, name);
      if (!refs) continue;
      field.options = refs.options;
      field.truncated = refs.truncated;
    }
    fields.push(field);
  }
  return fields;
}

// --- Validasi ----------------------------------------------------------------

function coerceValue(field, raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  switch (field.type) {
    case "number": {
      const value = Number(raw);
      if (!Number.isFinite(value)) return { error: "harus berupa angka" };
      return value;
    }
    case "boolean":
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      return { error: "harus true atau false" };
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return { error: "format tanggal harus YYYY-MM-DD" };
      return String(raw);
    case "datetime": {
      const value = new Date(String(raw));
      if (Number.isNaN(value.getTime())) return { error: "waktu tidak sah" };
      return value;
    }
    case "enum":
      if (!field.options.some((option) => option.value === raw)) return { error: `nilai "${raw}" bukan pilihan yang sah` };
      return raw;
    case "ref":
      if (!/^[0-9a-f-]{36}$/i.test(String(raw))) return { error: "rujukan tidak sah" };
      // Keanggotaan pilihan TIDAK diperiksa di sini melainkan diserahkan ke
      // kunci asing dan RLS: keduanya menolak baris milik tenant lain di
      // lapisan basis data, dan itu penjagaan yang tidak bisa dilewati dengan
      // menebak UUID.
      return String(raw);
    default: {
      const value = String(raw);
      if (field.maxLength && value.length > field.maxLength) {
        return { error: `maksimum ${field.maxLength} karakter` };
      }
      return value;
    }
  }
}

/**
 * @param partial true untuk PUT: hanya field yang dikirim yang divalidasi,
 *        field wajib yang tidak dikirim TIDAK dianggap hilang (nilai lamanya
 *        tetap berlaku).
 */
function coerceAndValidate(fields, body, { partial } = { partial: false }) {
  const values = {};
  const errors = {};
  const payload = body || {};

  for (const field of fields) {
    const present = Object.prototype.hasOwnProperty.call(payload, field.key);
    if (!present) {
      if (!partial && field.required) errors[field.key] = "wajib diisi";
      continue;
    }
    const coerced = coerceValue(field, payload[field.key]);
    if (coerced !== null && typeof coerced === "object" && coerced.error) {
      errors[field.key] = coerced.error;
      continue;
    }
    if (coerced === null && field.required) {
      errors[field.key] = "wajib diisi";
      continue;
    }
    values[field.column] = coerced;
  }
  return { values, errors, hasErrors: Object.keys(errors).length > 0 };
}

// --- Penomoran ---------------------------------------------------------------

/**
 * Nomor dokumen berikutnya, dari numbering_configs.
 *
 * Barisnya dikunci (FOR UPDATE) sebelum dinaikkan. Tanpa kunci itu, dua
 * pengajuan yang bersamaan membaca last_sequence yang sama dan menghasilkan
 * dua dokumen bernomor kembar — dan nomor kembar pada dokumen terkendali
 * adalah temuan audit, bukan sekadar kerapian.
 *
 * `last_period_key` mereset urutan setiap tahun, sesuai reset_period=YEARLY
 * yang dipakai seluruh modul di skema ini.
 */
async function nextNumber(client, tenantId, moduleDef, row, actorId) {
  const write = moduleDef.write;
  if (!write?.numberColumn) return null;

  const year = new Date().getUTCFullYear();
  const periodKey = String(year);
  const moduleCode = write.numberModuleCode;

  const { rows: existing } = await client.query(
    `SELECT * FROM numbering_configs WHERE tenant_id = $1 AND module_code = $2 AND scope_id IS NULL FOR UPDATE`,
    [tenantId, moduleCode],
  );

  let config = existing[0];
  if (!config) {
    const { rows: created } = await client.query(
      `INSERT INTO numbering_configs
         (tenant_id, module_code, pattern, prefix, reset_period, scope_level, scope_id, last_sequence, last_period_key,
          created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'YEARLY', 'TENANT', NULL, 0, $5, $6, $6, now(), now())
       RETURNING *`,
      [tenantId, moduleCode, write.numberPattern, write.numberPrefix, periodKey, actorId],
    );
    config = created[0];
  }

  const sequence = config.last_period_key === periodKey ? Number(config.last_sequence) + 1 : 1;
  await client.query(
    `UPDATE numbering_configs SET last_sequence = $1, last_period_key = $2, updated_at = now()
      WHERE numbering_config_id = $3`,
    [sequence, periodKey, config.numbering_config_id],
  );

  let segment = null;
  if (write.numberSegment) {
    const { column, table, pk, codeColumn } = write.numberSegment;
    const referenced = row[column];
    if (referenced) {
      const { rows } = await client.query(`SELECT ${codeColumn} AS code FROM ${table} WHERE ${pk} = $1 AND tenant_id = $2`, [
        referenced,
        tenantId,
      ]);
      segment = rows[0]?.code || null;
    }
  }

  const width = write.numberSeqWidth || 4;
  return String(config.pattern || write.numberPattern)
    .replace("{PREFIX}", config.prefix || write.numberPrefix)
    .replace("{SEG}", segment || "GEN")
    .replace("{YYYY}", periodKey)
    .replace(new RegExp(`\\{SEQ:\\d+\\}`), String(sequence).padStart(width, "0"));
}

/**
 * Menyelaraskan penghitung dengan nomor yang SUDAH ADA di tabelnya.
 *
 * Data demo disemai lewat SQL langsung, tanpa melewati penomoran ini, jadi
 * penghitungnya mulai dari nol sementara tabelnya sudah memuat 54 izin kerja.
 * Tanpa langkah ini, izin pertama yang dibuat lewat formulir akan bernomor
 * PTW/.../0001 dan langsung bentrok dengan yang sudah ada.
 */
async function alignSequence(client, tenantId, moduleDef, actorId) {
  const write = moduleDef.write;
  if (!write?.numberColumn) return;
  const periodKey = String(new Date().getUTCFullYear());

  const { rows } = await client.query(
    `SELECT max((regexp_match(${write.numberColumn}, '(\\d+)$'))[1]::int) AS tertinggi
       FROM ${moduleDef.table}
      WHERE tenant_id = $1 AND ${write.numberColumn} ~ '\\d+$'`,
    [tenantId],
  );
  const highest = rows[0]?.tertinggi || 0;
  if (highest === 0) return;

  await client.query(
    `INSERT INTO numbering_configs
       (tenant_id, module_code, pattern, prefix, reset_period, scope_level, scope_id, last_sequence, last_period_key,
        created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'YEARLY', 'TENANT', NULL, $5, $6, $7, $7, now(), now())
     ON CONFLICT DO NOTHING`,
    [tenantId, write.numberModuleCode, write.numberPattern, write.numberPrefix, highest, periodKey, actorId],
  );
  await client.query(
    `UPDATE numbering_configs SET last_sequence = GREATEST(last_sequence, $1), last_period_key = $2, updated_at = now()
      WHERE tenant_id = $3 AND module_code = $4 AND scope_id IS NULL AND last_period_key = $2`,
    [highest, periodKey, tenantId, write.numberModuleCode],
  );
}

module.exports = { describeFields, coerceAndValidate, nextNumber, alignSequence, labelFor, NEVER_WRITABLE };
