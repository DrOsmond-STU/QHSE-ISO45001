// Katalog metrik untuk dashboard analitik.
//
// Setiap entri adalah SATU widget yang bisa dipasang pengguna di halamannya.
// Katalog ini juga yang dikirim ke klien lewat GET /analytics/catalog, jadi
// daftar widget yang bisa dipilih di layar SELALU sama dengan daftar yang
// benar-benar bisa dihitung server — tidak ada menu pilihan yang mengarah ke
// widget yang kemudian gagal memuat.
//
// Tiga bentuk hasil, dan itu saja:
//   scalar    -> satu angka  { value, unit }
//   series    -> deret waktu { points: [{label, value}] }
//   breakdown -> komposisi   { slices: [{code, value}] }
// Klien memilih grafik dari `kind`, bukan dari nama metriknya.
//
// KODE ENUM DIKIRIM APA ADANYA (`code`), tidak dimanusiakan di sini.
// apps/web sudah punya humanizeEnum() dan statusTone() yang dipakai seluruh
// aplikasi; menerjemahkannya juga di sini berarti dua daftar terjemahan yang
// harus dijaga sinkron, dan yang di server tidak tahu apa-apa soal warna.
//
// PENYARING PERIODE. Tidak semua yang layak ditampilkan punya tanggal
// kejadian: status kontraktor dan status dokumen adalah POTRET saat ini, bukan
// rentetan peristiwa. Metrik semacam itu diberi `dateColumn: null`, dan
// jawabannya memuat `periodApplies: false` supaya widgetnya menyatakan hal itu
// di layar. Penyaring periode yang diam-diam tidak berlaku pada separuh widget
// jauh lebih buruk daripada tidak ada penyaring sama sekali — pembacanya
// menyimpulkan angka yang salah dan tidak punya cara mengetahuinya.

// Baris terhapus lunak dikecualikan di sini, berbeda dari handler daftar modul
// di server.js yang menampilkan apa adanya. Bedanya disengaja: daftar modul
// memperlihatkan isi tabel, sedangkan angka agregat dipakai untuk mengambil
// kesimpulan — dan "24 dokumen" yang diam-diam memuat dokumen terhapus adalah
// angka yang salah, bukan sekadar angka yang berbeda.
function softDeleteClause(alias, soft) {
  return soft === false ? "" : ` AND ${alias}.deleted_at IS NULL`;
}

function periodClause(alias, dateColumn, from, to, values) {
  if (!dateColumn) return "";
  let sql = "";
  if (from) {
    values.push(from);
    sql += ` AND ${alias}.${dateColumn} >= $${values.length}::date`;
  }
  if (to) {
    values.push(to);
    // Batas atas EKSKLUSIF pada hari berikutnya, bukan `<= $n`. Kolom
    // bertipe timestamptz: `<= '2026-08-03'` membandingkan dengan tengah
    // malam, sehingga seluruh kejadian pada tanggal itu justru terbuang.
    sql += ` AND ${alias}.${dateColumn} < ($${values.length}::date + 1)`;
  }
  return sql;
}

function scalarMetric({ table, valueExpr, dateColumn, where = "", soft = true }) {
  return ({ tenantId, from, to }) => {
    const values = [tenantId];
    const clause = periodClause("t", dateColumn, from, to, values);
    return {
      text: `SELECT COALESCE(${valueExpr}, 0)::float AS value
               FROM ${table} t
              WHERE t.tenant_id = $1${softDeleteClause("t", soft)}${clause}${where}`,
      values,
    };
  };
}

function breakdownMetric({ table, column, dateColumn, where = "", soft = true }) {
  return ({ tenantId, from, to }) => {
    const values = [tenantId];
    const clause = periodClause("t", dateColumn, from, to, values);
    return {
      text: `SELECT t.${column}::text AS code, count(*)::float AS value
               FROM ${table} t
              WHERE t.tenant_id = $1${softDeleteClause("t", soft)}${clause}${where}
                AND t.${column} IS NOT NULL
              GROUP BY t.${column}
              ORDER BY count(*) DESC, t.${column}::text ASC`,
      values,
    };
  };
}

// Deret bulanan dibangun dari generate_series, BUKAN dari GROUP BY atas
// barisnya saja. Kalau digroup dari barisnya, bulan tanpa kejadian hilang dari
// hasil, dan grafik garis menyambungkan Januari langsung ke Maret seolah
// Februari tidak pernah ada — persis kebalikan dari yang ingin dilihat orang,
// karena bulan tanpa insiden justru kabar baik yang layak terlihat.
function monthlySeriesMetric({ table, dateColumn, valueExpr, where = "", soft = true }) {
  return ({ tenantId, from, to }) => ({
    text: `
      WITH bulan AS (
        SELECT generate_series(
                 date_trunc('month', $2::date),
                 date_trunc('month', $3::date),
                 interval '1 month'
               ) AS awal
      )
      SELECT to_char(b.awal, 'YYYY-MM') AS label,
             COALESCE(${valueExpr}, 0)::float AS value
        FROM bulan b
        LEFT JOIN ${table} t
               ON t.tenant_id = $1${softDeleteClause("t", soft)}
              AND t.${dateColumn} >= b.awal
              AND t.${dateColumn} < b.awal + interval '1 month'${where}
       GROUP BY b.awal
       ORDER BY b.awal`,
    values: [tenantId, from, to],
  });
}

const METRICS = [
  // --- Kejadian & Perbaikan -------------------------------------------------
  {
    key: "incident-trend",
    title: "Tren insiden per bulan",
    caption: "Jumlah insiden yang dilaporkan, dihitung dari tanggal kejadian.",
    group: "Kejadian & Perbaikan",
    kind: "series",
    unit: "insiden",
    dateColumn: "incident_datetime",
    build: monthlySeriesMetric({
      table: "incident_reports",
      dateColumn: "incident_datetime",
      valueExpr: "count(t.incident_report_id)",
    }),
  },
  {
    key: "incident-by-classification",
    title: "Insiden per klasifikasi",
    caption: "Nyaris celaka, cedera ringan, hilang hari kerja, dan seterusnya.",
    group: "Kejadian & Perbaikan",
    kind: "breakdown",
    unit: "insiden",
    dateColumn: "incident_datetime",
    build: breakdownMetric({ table: "incident_reports", column: "classification", dateColumn: "incident_datetime" }),
  },
  {
    key: "incident-by-severity",
    title: "Insiden per tingkat keparahan",
    caption: "Sebaran keparahan insiden pada periode terpilih.",
    group: "Kejadian & Perbaikan",
    kind: "breakdown",
    unit: "insiden",
    dateColumn: "incident_datetime",
    build: breakdownMetric({ table: "incident_reports", column: "severity_level", dateColumn: "incident_datetime" }),
  },
  {
    key: "incident-days-lost",
    title: "Hari kerja hilang",
    caption: "Total hari kerja yang hilang akibat insiden pada periode terpilih.",
    group: "Kejadian & Perbaikan",
    kind: "scalar",
    unit: "hari",
    dateColumn: "incident_datetime",
    build: scalarMetric({ table: "incident_reports", valueExpr: "sum(t.days_lost)", dateColumn: "incident_datetime" }),
  },
  {
    key: "incident-cost",
    title: "Estimasi biaya insiden",
    caption: "Jumlah estimasi biaya yang tercatat pada laporan insiden.",
    group: "Kejadian & Perbaikan",
    kind: "scalar",
    unit: "IDR",
    format: "currency",
    dateColumn: "incident_datetime",
    build: scalarMetric({ table: "incident_reports", valueExpr: "sum(t.estimated_cost)", dateColumn: "incident_datetime" }),
  },
  {
    key: "capa-by-status",
    title: "CAPA per status",
    caption: "Posisi seluruh CAPA dalam alur perbaikannya.",
    group: "Kejadian & Perbaikan",
    kind: "breakdown",
    unit: "CAPA",
    dateColumn: "initiated_at",
    build: breakdownMetric({ table: "capa_register", column: "status", dateColumn: "initiated_at" }),
  },
  {
    key: "capa-by-priority",
    title: "CAPA per prioritas",
    caption: "Sebaran prioritas CAPA yang terdaftar.",
    group: "Kejadian & Perbaikan",
    kind: "breakdown",
    unit: "CAPA",
    dateColumn: "initiated_at",
    build: breakdownMetric({ table: "capa_register", column: "priority", dateColumn: "initiated_at" }),
  },
  {
    key: "capa-overdue",
    title: "CAPA lewat tenggat",
    caption: "Belum ditutup padahal target penutupannya sudah lewat.",
    group: "Kejadian & Perbaikan",
    kind: "scalar",
    unit: "CAPA",
    tone: "inverse", // makin besar makin buruk
    dateColumn: null,
    build: scalarMetric({
      table: "capa_register",
      valueExpr: "count(*)",
      dateColumn: null,
      where: " AND t.target_closure_date < CURRENT_DATE AND t.status NOT IN ('EFFECTIVE_CLOSED', 'CANCELLED')",
    }),
  },
  {
    key: "capa-closure-rate",
    title: "Tingkat penutupan CAPA",
    caption: "Persentase CAPA berstatus tertutup-efektif dari seluruh CAPA.",
    group: "Kejadian & Perbaikan",
    kind: "scalar",
    unit: "%",
    format: "percent",
    dateColumn: "initiated_at",
    build: scalarMetric({
      table: "capa_register",
      valueExpr:
        "100.0 * count(*) FILTER (WHERE t.status = 'EFFECTIVE_CLOSED') / NULLIF(count(*), 0)",
      dateColumn: "initiated_at",
    }),
  },

  // --- Inspeksi & Audit -----------------------------------------------------
  {
    key: "inspection-trend",
    title: "Tren inspeksi terlaksana",
    caption: "Jumlah inspeksi yang benar-benar dikerjakan tiap bulan.",
    group: "Inspeksi & Audit",
    kind: "series",
    unit: "inspeksi",
    dateColumn: "actual_date",
    build: monthlySeriesMetric({
      table: "inspection_records",
      dateColumn: "actual_date",
      valueExpr: "count(t.inspection_record_id)",
    }),
  },
  {
    key: "inspection-pass-rate",
    title: "Tingkat kelulusan inspeksi",
    caption: "Persentase inspeksi berhasil dari yang sudah dinilai hasilnya.",
    group: "Inspeksi & Audit",
    kind: "scalar",
    unit: "%",
    format: "percent",
    dateColumn: "actual_date",
    build: scalarMetric({
      table: "inspection_records",
      valueExpr: "100.0 * count(*) FILTER (WHERE t.overall_result = 'PASS') / NULLIF(count(*) FILTER (WHERE t.overall_result IS NOT NULL), 0)",
      dateColumn: "actual_date",
    }),
  },
  {
    key: "inspection-by-result",
    title: "Hasil inspeksi",
    caption: "Sebaran hasil akhir inspeksi yang sudah dilaksanakan.",
    group: "Inspeksi & Audit",
    kind: "breakdown",
    unit: "inspeksi",
    dateColumn: "actual_date",
    build: breakdownMetric({ table: "inspection_records", column: "overall_result", dateColumn: "actual_date" }),
  },
  {
    key: "inspection-finding-severity",
    title: "Temuan inspeksi per keparahan",
    caption: "Sebaran keparahan temuan yang muncul dari inspeksi lapangan.",
    group: "Inspeksi & Audit",
    kind: "breakdown",
    unit: "temuan",
    dateColumn: null,
    build: breakdownMetric({ table: "inspection_findings", column: "severity", dateColumn: null }),
  },
  {
    key: "audit-finding-classification",
    title: "Temuan audit per klasifikasi",
    caption: "Ketidaksesuaian mayor, minor, dan peluang perbaikan.",
    group: "Inspeksi & Audit",
    kind: "breakdown",
    unit: "temuan",
    dateColumn: null,
    build: breakdownMetric({ table: "audit_findings", column: "classification", dateColumn: null }),
  },
  {
    key: "audit-finding-open",
    title: "Temuan audit belum ditutup",
    caption: "Temuan yang masih terbuka atau menunggu verifikasi.",
    group: "Inspeksi & Audit",
    kind: "scalar",
    unit: "temuan",
    tone: "inverse",
    dateColumn: null,
    build: scalarMetric({
      table: "audit_findings",
      valueExpr: "count(*)",
      dateColumn: null,
      where: " AND t.status <> 'CLOSED'",
    }),
  },
  {
    key: "audit-by-status",
    title: "Audit per status",
    caption: "Posisi seluruh audit dalam siklus perencanaan sampai penutupan.",
    group: "Inspeksi & Audit",
    kind: "breakdown",
    unit: "audit",
    dateColumn: "planned_start_date",
    build: breakdownMetric({ table: "audits", column: "status", dateColumn: "planned_start_date" }),
  },

  // --- Risiko & Operasi -----------------------------------------------------
  {
    key: "permit-trend",
    title: "Tren izin kerja",
    caption: "Jumlah izin kerja per bulan menurut rencana mulainya.",
    group: "Risiko & Operasi",
    kind: "series",
    unit: "izin",
    dateColumn: "planned_start_datetime",
    build: monthlySeriesMetric({
      table: "work_permits",
      dateColumn: "planned_start_datetime",
      valueExpr: "count(t.work_permit_id)",
    }),
  },
  {
    key: "permit-by-status",
    title: "Izin kerja per status",
    caption: "Berapa yang menunggu persetujuan, berjalan, dan sudah selesai.",
    group: "Risiko & Operasi",
    kind: "breakdown",
    unit: "izin",
    dateColumn: "planned_start_datetime",
    build: breakdownMetric({ table: "work_permits", column: "status", dateColumn: "planned_start_datetime" }),
  },
  {
    key: "permit-by-risk",
    title: "Izin kerja per tingkat risiko",
    caption: "Sebaran tingkat risiko pekerjaan yang diizinkan.",
    group: "Risiko & Operasi",
    kind: "breakdown",
    unit: "izin",
    dateColumn: "planned_start_datetime",
    build: breakdownMetric({ table: "work_permits", column: "risk_level", dateColumn: "planned_start_datetime" }),
  },
  {
    key: "hira-risk-after",
    title: "Risiko HIRA setelah kendali",
    caption: "Tingkat risiko yang tersisa setelah pengendalian diterapkan.",
    group: "Risiko & Operasi",
    kind: "breakdown",
    unit: "bahaya",
    dateColumn: null,
    build: breakdownMetric({ table: "hira_hazard_lines", column: "risk_level_after", dateColumn: null }),
  },
  {
    key: "hira-risk-reduction",
    title: "Penurunan skor risiko",
    caption: "Rata-rata selisih skor risiko sebelum dan sesudah pengendalian.",
    group: "Risiko & Operasi",
    kind: "scalar",
    unit: "poin",
    dateColumn: null,
    build: scalarMetric({
      table: "hira_hazard_lines",
      valueExpr: "avg(t.risk_score_before - t.risk_score_after)",
      dateColumn: null,
      where: " AND t.risk_score_after IS NOT NULL",
    }),
  },

  // --- Mutu & Lingkungan ----------------------------------------------------
  {
    key: "ncr-trend",
    title: "Tren NCR mutu",
    caption: "Ketidaksesuaian mutu per bulan menurut tanggal terdeteksi.",
    group: "Mutu & Lingkungan",
    kind: "series",
    unit: "NCR",
    dateColumn: "detected_date",
    build: monthlySeriesMetric({ table: "ncr_records", dateColumn: "detected_date", valueExpr: "count(t.ncr_id)" }),
  },
  {
    key: "ncr-by-severity",
    title: "NCR per tingkat keparahan",
    caption: "Sebaran keparahan ketidaksesuaian mutu.",
    group: "Mutu & Lingkungan",
    kind: "breakdown",
    unit: "NCR",
    dateColumn: "detected_date",
    build: breakdownMetric({ table: "ncr_records", column: "severity", dateColumn: "detected_date" }),
  },
  {
    key: "env-significance",
    title: "Aspek lingkungan per tingkat penting",
    caption: "Aspek yang dinilai penting menuntut pengendalian khusus.",
    group: "Mutu & Lingkungan",
    kind: "breakdown",
    unit: "aspek",
    dateColumn: null,
    build: breakdownMetric({ table: "environmental_aspects_impacts", column: "significance_level", dateColumn: null }),
  },

  // --- Dokumen & Kepatuhan --------------------------------------------------
  {
    key: "document-by-status",
    title: "Dokumen per status",
    caption: "Potret status seluruh dokumen terkendali saat ini.",
    group: "Dokumen & Kepatuhan",
    kind: "breakdown",
    unit: "dokumen",
    dateColumn: null,
    build: breakdownMetric({ table: "documents", column: "status", dateColumn: null }),
  },
  {
    key: "document-review-due",
    title: "Dokumen jatuh tempo tinjauan",
    caption: "Tinjauan berkalanya jatuh tempo dalam 60 hari ke depan, atau sudah lewat.",
    group: "Dokumen & Kepatuhan",
    kind: "scalar",
    unit: "dokumen",
    tone: "inverse",
    dateColumn: null,
    build: scalarMetric({
      table: "documents",
      valueExpr: "count(*)",
      dateColumn: null,
      where: " AND t.next_review_date IS NOT NULL AND t.next_review_date <= CURRENT_DATE + 60",
    }),
  },
  {
    key: "obligation-by-status",
    title: "Kewajiban kepatuhan per status",
    caption: "Status pemenuhan kewajiban yang diturunkan dari peraturan.",
    group: "Dokumen & Kepatuhan",
    kind: "breakdown",
    unit: "kewajiban",
    dateColumn: null,
    build: breakdownMetric({ table: "compliance_obligations", column: "status", dateColumn: null }),
  },

  // --- Aset & Mitra Kerja ---------------------------------------------------
  {
    key: "calibration-due",
    title: "Kalibrasi jatuh tempo",
    caption: "Sertifikat kalibrasi yang jatuh tempo dalam 30 hari, atau sudah lewat.",
    group: "Aset & Mitra Kerja",
    kind: "scalar",
    unit: "alat",
    tone: "inverse",
    dateColumn: null,
    build: scalarMetric({
      table: "calibration_certificates",
      valueExpr: "count(DISTINCT t.calibration_item_id)",
      dateColumn: null,
      where: " AND t.next_due_date IS NOT NULL AND t.next_due_date <= CURRENT_DATE + 30",
    }),
  },
  {
    key: "asset-condition",
    title: "Kondisi aset",
    caption: "Sebaran kondisi aset dan peralatan yang terdaftar.",
    group: "Aset & Mitra Kerja",
    kind: "breakdown",
    unit: "aset",
    dateColumn: null,
    build: breakdownMetric({ table: "assets", column: "condition_status", dateColumn: null }),
  },
  {
    key: "contractor-by-status",
    title: "Kontraktor per status",
    caption: "Potret status mitra kerja saat ini.",
    group: "Aset & Mitra Kerja",
    kind: "breakdown",
    unit: "kontraktor",
    dateColumn: null,
    build: breakdownMetric({ table: "contractors", column: "status", dateColumn: null }),
  },
  {
    key: "maintenance-cost-trend",
    title: "Biaya pemeliharaan per bulan",
    caption: "Total biaya pemeliharaan aset menurut tanggal pengerjaan.",
    group: "Aset & Mitra Kerja",
    kind: "series",
    unit: "IDR",
    format: "currency",
    dateColumn: "performed_date",
    build: monthlySeriesMetric({
      table: "maintenance_records",
      dateColumn: "performed_date",
      valueExpr: "sum(t.cost)",
      soft: false, // maintenance_records satu-satunya tabel di katalog ini tanpa deleted_at
    }),
  },

  // --- Kesehatan & Darurat --------------------------------------------------
  {
    key: "restricted-duty-active",
    title: "Penugasan kerja terbatas aktif",
    caption: "Pekerja yang sedang menjalani pembatasan tugas karena alasan kesehatan.",
    group: "Kesehatan & Darurat",
    kind: "scalar",
    unit: "orang",
    dateColumn: null,
    build: scalarMetric({
      table: "restricted_duty_assignments",
      valueExpr: "count(*)",
      dateColumn: null,
      where: " AND t.status = 'ACTIVE'",
    }),
  },

  // --- Eksekutif: jam kerja, angka kekerapan, leading indicator -------------
  //
  // Kelompok ini menjawab pertanyaan yang berbeda dari kelompok di atasnya.
  // Yang di atas menghitung KEJADIAN; yang di sini menghitung KEKERAPAN —
  // kejadian dibagi jam kerja — dan KEGIATAN PENCEGAHAN yang mendahuluinya.
  //
  // Pembedaan leading vs lagging bukan istilah hiasan. Lagging indicator
  // (kecelakaan, hari kerja hilang) hanya bisa dibaca setelah orang celaka;
  // leading indicator (induksi, toolbox talk, inspeksi, observasi) bisa
  // digerakkan sebelum ada yang celaka. Dashboard yang hanya memuat lagging
  // memberi tahu manajemen apa yang sudah terlambat.
  {
    key: "exec-manhours",
    title: "Jam kerja",
    caption: "Total jam kerja pada periode terpilih. Pembagi bagi LTIFR dan TRIR.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "jam",
    dateColumn: "period_month",
    build: scalarMetric({
      table: "hse_period_statistics",
      valueExpr: "sum(t.manhours)",
      dateColumn: "period_month",
    }),
  },
  {
    key: "exec-manhours-trend",
    title: "Tren jam kerja",
    caption: "Jam kerja per bulan.",
    group: "Eksekutif",
    kind: "series",
    unit: "jam",
    dateColumn: "period_month",
    build: monthlySeriesMetric({
      table: "hse_period_statistics",
      dateColumn: "period_month",
      valueExpr: "sum(t.manhours)",
    }),
  },
  {
    key: "exec-manpower",
    title: "Tenaga kerja rata-rata",
    caption: "Rata-rata jumlah pekerja per bulan pada periode terpilih.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "orang",
    dateColumn: "period_month",
    build: scalarMetric({
      table: "hse_period_statistics",
      valueExpr: "round(avg(t.manpower))",
      dateColumn: "period_month",
    }),
  },

  // LTIFR dan TRIR dihitung dari DUA tabel sekaligus, jadi keduanya tidak
  // memakai pembantu scalarMetric — pembilangnya insiden, penyebutnya jam
  // kerja.
  //
  // NULLIF pada penyebut, bukan CASE WHEN: tanpa jam kerja terisi, jawaban
  // yang benar adalah "belum bisa dihitung" (null), bukan nol. Nol berarti
  // "tidak ada kecelakaan per juta jam kerja" — kabar baik yang dibuat-buat
  // dari data yang belum ada.
  {
    key: "exec-ltifr",
    title: "LTIFR",
    caption:
      "Kecelakaan hilang hari kerja per satu juta jam kerja. Kosong bila jam kerja periode itu belum diisi.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "per 1 juta jam",
    tone: "inverse",
    dateColumn: "incident_datetime",
    build: ({ tenantId, from, to }) => ({
      text: `
        SELECT (
          (SELECT count(*) FROM incident_reports i
            WHERE i.tenant_id = $1 AND i.deleted_at IS NULL
              AND i.classification IN ('LOST_TIME_INJURY', 'FATALITY')
              AND i.incident_datetime >= $2::date AND i.incident_datetime < ($3::date + 1))::float
          * 1000000
          / NULLIF((SELECT sum(s.manhours) FROM hse_period_statistics s
                     WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
                       AND s.period_month >= date_trunc('month', $2::date)
                       AND s.period_month <= $3::date), 0)
        )::float AS value`,
      values: [tenantId, from, to],
    }),
  },
  {
    key: "exec-trir",
    title: "TRIR",
    caption:
      "Kasus tercatat (cedera medis, kerja terbatas, hilang hari kerja, fatal) per satu juta jam kerja.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "per 1 juta jam",
    tone: "inverse",
    dateColumn: "incident_datetime",
    build: ({ tenantId, from, to }) => ({
      text: `
        SELECT (
          (SELECT count(*) FROM incident_reports i
            WHERE i.tenant_id = $1 AND i.deleted_at IS NULL
              AND i.classification IN ('MEDICAL_TREATMENT', 'RESTRICTED_WORK_CASE', 'LOST_TIME_INJURY', 'FATALITY')
              AND i.incident_datetime >= $2::date AND i.incident_datetime < ($3::date + 1))::float
          * 1000000
          / NULLIF((SELECT sum(s.manhours) FROM hse_period_statistics s
                     WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
                       AND s.period_month >= date_trunc('month', $2::date)
                       AND s.period_month <= $3::date), 0)
        )::float AS value`,
      values: [tenantId, from, to],
    }),
  },
  {
    key: "exec-safe-manhours",
    title: "Jam kerja aman tanpa LTI",
    caption: "Jam kerja sejak kecelakaan hilang hari kerja terakhir.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "jam",
    dateColumn: null,
    build: ({ tenantId }) => ({
      // Dihitung dari LTI TERAKHIR, bukan dari awal periode: "jam kerja aman"
      // yang di-reset tiap tanggal 1 bukan capaian apa pun.
      text: `
        SELECT COALESCE(sum(s.manhours), 0)::float AS value
          FROM hse_period_statistics s
         WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
           AND s.period_month > COALESCE(
                 (SELECT date_trunc('month', max(i.incident_datetime))
                    FROM incident_reports i
                   WHERE i.tenant_id = $1 AND i.deleted_at IS NULL
                     AND i.classification IN ('LOST_TIME_INJURY', 'FATALITY')),
                 '1900-01-01'::timestamptz)`,
      values: [tenantId],
    }),
  },
  {
    key: "exec-fatality",
    title: "Kecelakaan fatal",
    caption: "Jumlah kejadian fatal pada periode terpilih. Sasarannya selalu nol.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "kejadian",
    tone: "inverse",
    dateColumn: "incident_datetime",
    build: scalarMetric({
      table: "incident_reports",
      valueExpr: "count(*)",
      dateColumn: "incident_datetime",
      where: " AND t.classification = 'FATALITY'",
    }),
  },
  {
    key: "exec-lost-days",
    title: "Hari kerja hilang",
    caption: "Total hari kerja yang hilang akibat insiden pada periode terpilih.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "hari",
    tone: "inverse",
    dateColumn: "incident_datetime",
    build: scalarMetric({
      table: "incident_reports",
      valueExpr: "sum(t.days_lost)",
      dateColumn: "incident_datetime",
    }),
  },
  {
    key: "exec-leading-indicators",
    title: "Leading indicator",
    // JAM PELATIHAN SENGAJA TIDAK ADA DI SINI, dan itu bukan kelalaian.
    //
    // Rincian ini ditampilkan sebagai batang beserta PERSENTASE dari totalnya.
    // Persentase hanya berarti bila seluruh butirnya satu satuan. Dengan jam
    // pelatihan ikut di dalamnya, totalnya adalah penjumlahan jam dan jumlah
    // kegiatan — dan layar sempat menampilkan "Training hour 4221 (39%)"
    // seolah 39% kegiatan pencegahan adalah pelatihan, padahal yang
    // dibandingkan jam melawan cacah. Jam pelatihan punya widget sendiri.
    caption: "Cacah kegiatan pencegahan pada periode terpilih. Jam pelatihan dihitung terpisah.",
    group: "Eksekutif",
    kind: "breakdown",
    unit: "kegiatan",
    dateColumn: "period_month",
    build: ({ tenantId, from, to }) => ({
      // Satu baris per jenis kegiatan, dirakit dengan VALUES supaya urutannya
      // tetap dan tidak ada kegiatan yang hilang ketika nilainya nol —
      // kegiatan pencegahan yang tidak dijalankan justru yang paling perlu
      // terlihat.
      text: `
        WITH j AS (
          SELECT COALESCE(sum(t.safety_inductions), 0) AS induksi,
                 COALESCE(sum(t.toolbox_talks), 0) AS tbt,
                 COALESCE(sum(t.hse_meetings), 0) AS rapat,
                 COALESCE(sum(t.management_walkthroughs), 0) AS kunjungan,
                 COALESCE(sum(t.safety_observations), 0) AS observasi
            FROM hse_period_statistics t
           WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
             AND t.period_month >= date_trunc('month', $2::date)
             AND t.period_month <= $3::date
        )
        SELECT v.code, v.value::float AS value
          FROM j, LATERAL (VALUES
            ('SAFETY_INDUCTION', j.induksi),
            ('TOOLBOX_TALK', j.tbt),
            ('HSE_MEETING', j.rapat),
            ('MANAGEMENT_WALKTHROUGH', j.kunjungan),
            ('SAFETY_OBSERVATION', j.observasi)
          ) AS v(code, value)`,
      values: [tenantId, from, to],
    }),
  },
  {
    key: "exec-training-hours",
    title: "Jam pelatihan",
    caption: "Total jam pelatihan K3 yang terselenggara pada periode terpilih.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "jam",
    dateColumn: "period_month",
    build: scalarMetric({
      table: "hse_period_statistics",
      valueExpr: "sum(t.training_hours)",
      dateColumn: "period_month",
    }),
  },
  {
    key: "exec-unsafe-acts-conditions",
    title: "Tindakan vs kondisi tidak aman",
    caption: "Hasil observasi keselamatan, dipisah antara perilaku dan keadaan.",
    group: "Eksekutif",
    kind: "breakdown",
    unit: "temuan",
    dateColumn: "period_month",
    build: ({ tenantId, from, to }) => ({
      text: `
        WITH j AS (
          SELECT COALESCE(sum(t.unsafe_acts), 0) AS tindakan,
                 COALESCE(sum(t.unsafe_conditions), 0) AS kondisi
            FROM hse_period_statistics t
           WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
             AND t.period_month >= date_trunc('month', $2::date)
             AND t.period_month <= $3::date
        )
        SELECT v.code, v.value::float AS value
          FROM j, LATERAL (VALUES ('UNSAFE_ACT', j.tindakan), ('UNSAFE_CONDITION', j.kondisi)) AS v(code, value)`,
      values: [tenantId, from, to],
    }),
  },
  {
    key: "exec-unsafe-trend",
    title: "Tren observasi tidak aman",
    caption: "Tindakan dan kondisi tidak aman yang tercatat per bulan.",
    group: "Eksekutif",
    kind: "series",
    unit: "temuan",
    dateColumn: "period_month",
    build: monthlySeriesMetric({
      table: "hse_period_statistics",
      dateColumn: "period_month",
      valueExpr: "sum(t.unsafe_acts + t.unsafe_conditions)",
    }),
  },
  {
    key: "exec-toolbox-trend",
    title: "Tren toolbox talk",
    caption: "Jumlah toolbox talk yang terselenggara per bulan.",
    group: "Eksekutif",
    kind: "series",
    unit: "kegiatan",
    dateColumn: "period_month",
    build: monthlySeriesMetric({
      table: "hse_period_statistics",
      dateColumn: "period_month",
      valueExpr: "sum(t.toolbox_talks)",
    }),
  },
  {
    key: "exec-audit-finding-closed-rate",
    title: "Temuan audit tertutup",
    caption: "Bagian temuan audit yang sudah ditutup, dari seluruh temuan pada periode terpilih.",
    group: "Eksekutif",
    kind: "scalar",
    unit: "%",
    format: "percent",
    dateColumn: null,
    build: ({ tenantId }) => ({
      text: `
        SELECT (100.0 * count(*) FILTER (WHERE t.status = 'CLOSED') / NULLIF(count(*), 0))::float AS value
          FROM audit_findings t
         WHERE t.tenant_id = $1 AND t.deleted_at IS NULL`,
      values: [tenantId],
    }),
  },
];

const METRIC_BY_KEY = new Map(METRICS.map((metric) => [metric.key, metric]));

function findMetric(key) {
  return METRIC_BY_KEY.get(key) || null;
}

/** Bentuk katalog yang dikirim ke klien — tanpa `build`, yang tidak bisa diserialkan. */
function catalog() {
  return METRICS.map(({ key, title, caption, group, kind, unit, format, tone, dateColumn }) => ({
    key,
    title,
    caption,
    group,
    kind,
    unit,
    format: format || null,
    tone: tone || null,
    periodApplies: Boolean(dateColumn),
  }));
}

module.exports = { METRICS, findMetric, catalog };
