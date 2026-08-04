// Registri modul — SATU sumber kebenaran untuk sidebar, halaman daftar,
// halaman detail, dan kartu KPI dashboard.
//
// Setiap entri memetakan satu endpoint GET read-only yang benar-benar ada di
// apps/demo-api (dan, di lingkungan yang mampu menjalankannya, di apps/api).
// Nama field di sini adalah nama kolom basis data dalam bentuk camelCase —
// API mengembalikan baris apa adanya, tidak ada lapisan DTO/serializer di
// endpoint read-only itu.
//
// Halaman daftar/detail digerakkan konfigurasi (satu route dinamis
// app/(dashboard)/modules/[slug]) alih-alih 15 file halaman kembar — cerminan
// dari fakta bahwa 15 endpoint-nya sendiri lahir dari satu pola yang sama.
// Menambah modul ke-16 nanti = menambah satu entri di array ini DAN satu
// entri padanan di apps/demo-api/src/modules.js.
//
// ---------------------------------------------------------------------------
// KENAPA `detailSections` ADA, dan kenapa isinya BUKAN "seluruh field"
//
// Versi pertama halaman detail menampilkan SEMUA field yang dikembalikan API,
// dengan alasan bahwa menyembunyikan sebagian akan membuat halaman berbohong
// tentang isi record. Alasan itu terdengar benar dan ternyata salah dalam
// praktik: yang muncul di layar adalah dua puluh baris berisi UUID mentah,
// `Tenant id`, `Created by`, dan selusin tanda pisah untuk kolom kosong.
//
// Halaman yang menampilkan `Owner user id: b1171e4a-06d8-5441-...` tidak
// lebih jujur daripada yang menampilkan `Pemilik dokumen: Hendra Kusuma`. Ia
// hanya memindahkan pekerjaan menerjemahkan ke kepala pembaca, dan pembaca
// tidak punya tabel `users` di kepalanya.
//
// Karena itu tiap modul kini memilih fieldnya secara eksplisit, dikelompokkan
// menurut cara orang membacanya, dan API menyediakan `<field>Label` untuk
// setiap kunci asing supaya yang tampil adalah nama, bukan pengenal.
// ---------------------------------------------------------------------------

export type ColumnType =
  | "text"
  | "enum"
  | "status"
  | "date"
  | "datetime"
  | "number"
  | "bool"
  | "currency"
  | "longtext"
  /** Nomor revisi gabungan mayor.minor — dibaca dari DUA kolom sekaligus.
   *  Ditampilkan sebagai satu angka saja, revisi 2.0 dan 2.1 sama-sama
   *  terbaca "2", dan riwayat versi jadi tampak memuat baris kembar. */
  | "revision"
  /** Ukuran berkas dalam byte. Ditampilkan apa adanya, "1.567" terbaca
   *  seperti 1,567 sesuatu — pemisah ribuan Indonesia adalah titik. */
  | "filesize";

export interface ModuleColumn {
  key: string;
  header: string;
  type?: ColumnType; // default "text"
}

export interface DetailField {
  key: string;
  label: string;
  type?: ColumnType;
  /** Teks panjang: dirender selebar kartu sebagai paragraf, bukan sel definisi sempit. */
  wide?: boolean;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

export interface ModuleChild {
  /** Ditempel setelah `${endpoint}/${id}`, mis. "/findings". */
  pathSuffix: string;
  title: string;
  /**
   * Kalimat yang ditampilkan ketika anaknya memang belum ada. Ditulis
   * spesifik per modul, bukan "Belum ada data": audit yang belum
   * dilaksanakan memang belum punya temuan, dan mengatakannya begitu adalah
   * beda antara sistem yang menjelaskan dirinya dan sistem yang tampak rusak.
   */
  emptyMessage: string;
  columns: ModuleColumn[];
}

export interface ModuleDefinition {
  slug: string;
  endpoint: string;
  title: string;
  moduleNumber: string;
  group: string;
  labelField: string;
  /** Baris kedua judul halaman detail — biasanya judul/uraian recordnya. */
  subtitleField?: string;
  columns: ModuleColumn[];
  detailSections: DetailSection[];
  children?: ModuleChild[];
}

export const MODULE_GROUPS = [
  "Dokumen & Kepatuhan",
  "Risiko & Operasi",
  "Kejadian & Perbaikan",
  "Inspeksi & Audit",
  "Mutu & Lingkungan",
  "Kesehatan & Darurat",
  // Kelompok sendiri, bukan disisipkan ke "Kesehatan & Darurat" atau
  // "Inspeksi & Audit": pelatihan adalah satu-satunya kelompok yang isinya
  // sepasang — RENCANA dan PELAKSANAAN — dan keduanya harus terlihat
  // berdampingan di sidebar. Menaruh salah satunya di kelompok lain membuat
  // orang mencari "realisasi" di tempat ia tidak ada, lalu menyimpulkan
  // aplikasinya hanya menyimpan rencana.
  "Kompetensi & Pelatihan",
  "Aset & Mitra Kerja",
  // Kelompok TERAKHIR dan sengaja terpisah dari enam kelompok QHSE di atasnya:
  // isinya bukan pekerjaan QHSE harian, melainkan angka yang MENENTUKAN
  // bagaimana pekerjaan itu diukur — target KPI dan jam kerja. Menaruhnya di
  // antara modul operasional membuat orang mengubah target di tengah rutinitas
  // pencatatan, dan target yang diubah tanpa disadari adalah cara paling
  // halus membuat kinerja terlihat baik.
  "Pengaturan",
] as const;

/** Blok pencatatan yang sama di seluruh modul — siapa membuat, siapa terakhir mengubah. */
const REKAMAN: DetailSection = {
  title: "Pencatatan",
  fields: [
    { key: "createdBy", label: "Dibuat oleh" },
    { key: "createdAt", label: "Dibuat pada", type: "datetime" },
    { key: "updatedBy", label: "Diubah terakhir oleh" },
    { key: "updatedAt", label: "Diubah pada", type: "datetime" },
  ],
};

export const MODULES: ModuleDefinition[] = [
  {
    slug: "documents",
    endpoint: "/documents",
    title: "Dokumen Terkendali",
    moduleNumber: "Modul 03",
    group: "Dokumen & Kepatuhan",
    labelField: "documentNumber",
    subtitleField: "title",
    columns: [
      { key: "documentNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "documentType", header: "Jenis", type: "enum" },
      { key: "status", header: "Status", type: "status" },
      { key: "effectiveDate", header: "Berlaku", type: "date" },
      { key: "nextReviewDate", header: "Tinjauan berikutnya", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas dokumen",
        fields: [
          { key: "documentNumber", label: "Nomor dokumen" },
          { key: "title", label: "Judul" },
          { key: "documentType", label: "Jenis", type: "enum" },
          { key: "documentCategoryId", label: "Kategori" },
          { key: "classification", label: "Klasifikasi", type: "enum" },
          { key: "status", label: "Status", type: "status" },
          { key: "ownerUserId", label: "Pemilik dokumen" },
        ],
      },
      { title: "Isi dokumen", fields: [{ key: "description", label: "Ringkasan isi", type: "longtext", wide: true }] },
      {
        title: "Masa berlaku dan peninjauan",
        fields: [
          { key: "effectiveDate", label: "Mulai berlaku", type: "date" },
          { key: "nextReviewDate", label: "Tinjauan berikutnya", type: "date" },
          { key: "reviewCycleMonths", label: "Siklus tinjauan (bulan)", type: "number" },
          { key: "retentionYears", label: "Masa retensi (tahun)", type: "number" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/versions",
        title: "Riwayat versi",
        emptyMessage: "Dokumen ini belum punya versi yang tercatat.",
        columns: [
          { key: "majorVersion", header: "Revisi", type: "revision" },
          { key: "fileName", header: "Nama berkas" },
          { key: "status", header: "Status", type: "status" },
          { key: "changeSummary", header: "Ringkasan perubahan" },
          { key: "publishedAt", header: "Terbit", type: "date" },
          { key: "createdBy", header: "Disiapkan oleh" },
        ],
      },
    ],
  },
  {
    slug: "regulatory-registers",
    endpoint: "/regulatory-registers",
    title: "Register Peraturan",
    moduleNumber: "Modul 04",
    group: "Dokumen & Kepatuhan",
    labelField: "regulationNumber",
    subtitleField: "title",
    columns: [
      { key: "regulationNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "regulationType", header: "Jenis", type: "enum" },
      { key: "issuingAuthority", header: "Penerbit" },
      { key: "status", header: "Status", type: "status" },
      { key: "nextReviewDate", header: "Tinjauan berikutnya", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas peraturan",
        fields: [
          { key: "regulationNumber", label: "Nomor peraturan" },
          { key: "title", label: "Judul" },
          { key: "regulationType", label: "Jenis", type: "enum" },
          { key: "issuingAuthority", label: "Instansi penerbit" },
          { key: "status", label: "Status", type: "status" },
        ],
      },
      { title: "Ringkasan", fields: [{ key: "summary", label: "Ringkasan dan relevansi", type: "longtext", wide: true }] },
      {
        title: "Tanggal dan peninjauan",
        fields: [
          { key: "issueDate", label: "Tanggal terbit", type: "date" },
          { key: "effectiveDate", label: "Mulai berlaku", type: "date" },
          { key: "nextReviewDate", label: "Tinjauan berikutnya", type: "date" },
          { key: "reviewCycleMonths", label: "Siklus tinjauan (bulan)", type: "number" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/obligations",
        title: "Kewajiban kepatuhan",
        emptyMessage: "Belum ada kewajiban yang diturunkan dari peraturan ini.",
        columns: [
          { key: "obligationCode", header: "Kode" },
          { key: "clauseReference", header: "Pasal" },
          { key: "obligationDescription", header: "Kewajiban" },
          { key: "obligationType", header: "Jenis", type: "enum" },
          { key: "frequency", header: "Frekuensi", type: "enum" },
          { key: "responsibleUserId", header: "Penanggung jawab" },
          { key: "nextDueDate", header: "Jatuh tempo", type: "date" },
        ],
      },
      {
        pathSuffix: "/attachments",
        title: "Salinan peraturan",
        emptyMessage: "Belum ada salinan peraturan yang diunggah.",
        columns: [
          { key: "fileName", header: "Nama berkas" },
          { key: "mimeType", header: "Tipe" },
          { key: "fileSize", header: "Ukuran", type: "filesize" },
          { key: "uploadedByLabel", header: "Diunggah oleh" },
          { key: "uploadedAt", header: "Waktu unggah", type: "datetime" },
        ],
      },
    ],
  },
  {
    slug: "hira-assessments",
    endpoint: "/hira-assessments",
    title: "Penilaian HIRA",
    moduleNumber: "Modul 05",
    group: "Risiko & Operasi",
    labelField: "hiraNumber",
    subtitleField: "activityDescription",
    columns: [
      { key: "hiraNumber", header: "Nomor" },
      { key: "activityDescription", header: "Aktivitas" },
      { key: "assessmentType", header: "Jenis", type: "enum" },
      { key: "status", header: "Status", type: "status" },
      { key: "assessmentDate", header: "Tanggal", type: "date" },
      { key: "reviewDueDate", header: "Jatuh tempo tinjauan", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas penilaian",
        fields: [
          { key: "hiraNumber", label: "Nomor HIRA" },
          { key: "assessmentType", label: "Jenis penilaian", type: "enum" },
          { key: "status", label: "Status", type: "status" },
          { key: "siteId", label: "Lokasi" },
          { key: "departmentId", label: "Departemen" },
          { key: "assessedBy", label: "Dinilai oleh" },
          { key: "riskMatrixConfigId", label: "Matriks risiko" },
        ],
      },
      { title: "Aktivitas yang dinilai", fields: [{ key: "activityDescription", label: "Uraian aktivitas", type: "longtext", wide: true }] },
      {
        title: "Peninjauan",
        fields: [
          { key: "assessmentDate", label: "Tanggal penilaian", type: "date" },
          { key: "reviewDueDate", label: "Jatuh tempo tinjauan", type: "date" },
          { key: "reviewCycleMonths", label: "Siklus tinjauan (bulan)", type: "number" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/hazards",
        title: "Bahaya dan pengendalian",
        emptyMessage: "Belum ada baris bahaya pada penilaian ini.",
        columns: [
          { key: "hazardDescriptionFreetext", header: "Bahaya" },
          { key: "existingControls", header: "Pengendalian yang ada" },
          { key: "riskScoreBefore", header: "Skor awal", type: "number" },
          { key: "riskLevelBefore", header: "Tingkat awal", type: "status" },
          { key: "additionalControlsRequired", header: "Pengendalian tambahan" },
          { key: "riskScoreAfter", header: "Skor sisa", type: "number" },
          { key: "riskLevelAfter", header: "Tingkat sisa", type: "status" },
          { key: "responsibleUserId", header: "Penanggung jawab" },
        ],
      },
    ],
  },
  {
    slug: "work-permits",
    endpoint: "/work-permits",
    title: "Izin Kerja (PTW)",
    moduleNumber: "Modul 06",
    group: "Risiko & Operasi",
    labelField: "permitNumber",
    subtitleField: "title",
    columns: [
      { key: "permitNumber", header: "Nomor" },
      { key: "title", header: "Pekerjaan" },
      { key: "riskLevel", header: "Risiko", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "plannedStartDatetime", header: "Mulai", type: "datetime" },
      { key: "plannedEndDatetime", header: "Selesai", type: "datetime" },
    ],
    detailSections: [
      {
        title: "Identitas izin",
        fields: [
          { key: "permitNumber", label: "Nomor izin" },
          { key: "title", label: "Pekerjaan" },
          { key: "workPermitTypeId", label: "Jenis izin" },
          { key: "riskLevel", label: "Tingkat risiko", type: "status" },
          { key: "status", label: "Status", type: "status" },
          { key: "requesterId", label: "Pemohon" },
          { key: "numberOfWorkers", label: "Jumlah pekerja", type: "number" },
        ],
      },
      { title: "Uraian pekerjaan", fields: [{ key: "description", label: "Uraian", type: "longtext", wide: true }] },
      {
        title: "Lokasi dan waktu",
        fields: [
          { key: "siteId", label: "Lokasi kerja" },
          { key: "locationDetail", label: "Rincian lokasi" },
          { key: "departmentId", label: "Departemen" },
          { key: "plannedStartDatetime", label: "Rencana mulai", type: "datetime" },
          { key: "plannedEndDatetime", label: "Rencana selesai", type: "datetime" },
          { key: "actualStartDatetime", label: "Realisasi mulai", type: "datetime" },
          { key: "actualEndDatetime", label: "Realisasi selesai", type: "datetime" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/gas-tests",
        title: "Hasil uji gas",
        emptyMessage: "Jenis izin ini tidak mensyaratkan uji gas.",
        columns: [
          { key: "gasType", header: "Jenis gas", type: "enum" },
          { key: "readingValue", header: "Hasil ukur", type: "number" },
          { key: "unit", header: "Satuan" },
          { key: "acceptableMin", header: "Batas bawah", type: "number" },
          { key: "acceptableMax", header: "Batas atas", type: "number" },
          { key: "result", header: "Keputusan", type: "status" },
          { key: "testDatetime", header: "Waktu uji", type: "datetime" },
          { key: "instrumentName", header: "Alat ukur" },
          { key: "testedBy", header: "Diuji oleh" },
        ],
      },
    ],
  },
  {
    slug: "incident-reports",
    endpoint: "/incident-reports",
    title: "Laporan Insiden",
    moduleNumber: "Modul 07",
    group: "Kejadian & Perbaikan",
    labelField: "incidentNumber",
    columns: [
      { key: "incidentNumber", header: "Nomor" },
      { key: "classification", header: "Klasifikasi", type: "enum" },
      { key: "severityLevel", header: "Keparahan", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "incidentDatetime", header: "Waktu kejadian", type: "datetime" },
      { key: "daysLost", header: "Hari hilang", type: "number" },
    ],
    detailSections: [
      {
        title: "Identitas insiden",
        fields: [
          { key: "incidentNumber", label: "Nomor laporan" },
          { key: "classification", label: "Klasifikasi", type: "enum" },
          { key: "initialClassification", label: "Klasifikasi awal", type: "enum" },
          { key: "severityLevel", label: "Tingkat keparahan", type: "status" },
          { key: "status", label: "Status", type: "status" },
          { key: "reportedBy", label: "Dilaporkan oleh" },
        ],
      },
      {
        title: "Kejadian",
        fields: [
          { key: "description", label: "Kronologi", type: "longtext", wide: true },
          { key: "immediateActionTaken", label: "Tindakan segera", type: "longtext", wide: true },
        ],
      },
      {
        title: "Tempat, waktu, dan dampak",
        fields: [
          { key: "incidentDatetime", label: "Waktu kejadian", type: "datetime" },
          { key: "siteId", label: "Lokasi" },
          { key: "locationDetail", label: "Rincian lokasi" },
          { key: "departmentId", label: "Departemen" },
          { key: "daysLost", label: "Hari kerja hilang", type: "number" },
          { key: "estimatedCost", label: "Estimasi kerugian", type: "currency" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/investigations",
        title: "Investigasi",
        emptyMessage: "Insiden ini belum melewati investigasi formal.",
        columns: [
          { key: "method", header: "Metode", type: "enum" },
          { key: "leadInvestigatorId", header: "Ketua investigasi" },
          { key: "startedAt", header: "Mulai", type: "date" },
          { key: "targetCompletionAt", header: "Target selesai", type: "date" },
          { key: "completedAt", header: "Selesai", type: "date" },
          { key: "status", header: "Status", type: "status" },
          { key: "findingsSummary", header: "Ringkasan temuan" },
        ],
      },
      {
        pathSuffix: "/root-causes",
        title: "Akar masalah",
        emptyMessage: "Akar masalah belum ditetapkan — investigasinya belum selesai.",
        columns: [
          { key: "sequenceNo", header: "Urutan", type: "number" },
          { key: "causeType", header: "Jenis sebab", type: "enum" },
          { key: "category", header: "Kategori", type: "enum" },
          { key: "description", header: "Uraian" },
          { key: "methodReference", header: "Rujukan metode" },
        ],
      },
      {
        pathSuffix: "/corrective-actions",
        title: "Tindak lanjut — CAPA terkait",
        emptyMessage: "Belum ada CAPA yang ditautkan ke insiden ini.",
        columns: [
          { key: "capaRegisterId", header: "Nomor CAPA" },
          { key: "linkedBy", header: "Ditautkan oleh" },
          { key: "linkedAt", header: "Ditautkan pada", type: "date" },
        ],
      },
    ],
  },
  {
    slug: "capa-registers",
    endpoint: "/capa-registers",
    title: "Register CAPA",
    moduleNumber: "Modul 10",
    group: "Kejadian & Perbaikan",
    labelField: "capaNumber",
    subtitleField: "title",
    columns: [
      { key: "capaNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "sourceType", header: "Sumber", type: "enum" },
      { key: "priority", header: "Prioritas", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "targetClosureDate", header: "Target penutupan", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas CAPA",
        fields: [
          { key: "capaNumber", label: "Nomor CAPA" },
          { key: "title", label: "Judul" },
          { key: "sourceType", label: "Sumber", type: "enum" },
          { key: "sourceReferenceNumber", label: "Nomor rujukan sumber" },
          { key: "category", label: "Kategori", type: "enum" },
          { key: "priority", label: "Prioritas", type: "status" },
          { key: "status", label: "Status", type: "status" },
        ],
      },
      { title: "Masalah", fields: [{ key: "problemStatement", label: "Pernyataan masalah", type: "longtext", wide: true }] },
      {
        title: "Penanggung jawab dan target",
        fields: [
          { key: "initiatedBy", label: "Diprakarsai oleh" },
          { key: "initiatedAt", label: "Tanggal prakarsa", type: "date" },
          // Tidak ada "ditugaskan kepada" di sini dengan sengaja: tabel
          // capa_register memang tidak punya kolom itu. Kepemilikan CAPA
          // tinggal pada tiap RENCANA TINDAKAN (kolom PIC di tabel bawah),
          // yang lebih dekat dengan cara kerjanya — satu CAPA bisa punya
          // beberapa tindakan dengan penanggung jawab berbeda.
          { key: "siteId", label: "Lokasi" },
          { key: "targetClosureDate", label: "Target penutupan", type: "date" },
          { key: "actualClosureDate", label: "Realisasi penutupan", type: "date" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/root-causes",
        title: "Analisis akar masalah",
        emptyMessage: "CAPA ini masih berstatus draf; analisis akar masalah belum dikerjakan.",
        columns: [
          { key: "method", header: "Metode", type: "enum" },
          { key: "rootCauseSummary", header: "Akar masalah" },
          { key: "contributingFactors", header: "Faktor penyumbang" },
          { key: "analyzedBy", header: "Dianalisis oleh" },
          { key: "analyzedAt", header: "Tanggal analisis", type: "date" },
        ],
      },
      {
        pathSuffix: "/action-plans",
        title: "Rencana tindakan",
        emptyMessage: "Belum ada rencana tindakan yang ditetapkan.",
        columns: [
          { key: "actionType", header: "Jenis", type: "enum" },
          { key: "actionDescription", header: "Tindakan" },
          { key: "justification", header: "Alasan" },
          { key: "picUserId", header: "PIC" },
          { key: "dueDate", header: "Jatuh tempo", type: "date" },
          { key: "statusCache", header: "Status", type: "status" },
        ],
      },
    ],
  },
  {
    slug: "inspection-records",
    endpoint: "/inspection-records",
    title: "Catatan Inspeksi",
    moduleNumber: "Modul 08",
    group: "Inspeksi & Audit",
    labelField: "inspectionRecordNumber",
    columns: [
      { key: "inspectionRecordNumber", header: "Nomor" },
      { key: "status", header: "Status", type: "status" },
      { key: "overallResult", header: "Hasil", type: "status" },
      { key: "overallScore", header: "Skor", type: "number" },
      { key: "plannedDate", header: "Rencana", type: "date" },
      { key: "actualDate", header: "Realisasi", type: "datetime" },
    ],
    detailSections: [
      {
        title: "Identitas inspeksi",
        fields: [
          { key: "inspectionRecordNumber", label: "Nomor catatan" },
          { key: "inspectionChecklistTemplateId", label: "Checklist yang dipakai" },
          { key: "status", label: "Status", type: "status" },
          { key: "inspectorId", label: "Pemeriksa" },
          { key: "siteId", label: "Lokasi" },
          { key: "departmentId", label: "Departemen" },
        ],
      },
      {
        title: "Pelaksanaan dan hasil",
        fields: [
          { key: "plannedDate", label: "Tanggal rencana", type: "date" },
          { key: "actualDate", label: "Tanggal realisasi", type: "datetime" },
          { key: "overallResult", label: "Hasil keseluruhan", type: "status" },
          { key: "overallScore", label: "Skor", type: "number" },
        ],
      },
      { title: "Catatan pemeriksa", fields: [{ key: "notes", label: "Catatan", type: "longtext", wide: true }] },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/findings",
        title: "Temuan inspeksi",
        emptyMessage: "Tidak ada temuan pada inspeksi ini.",
        columns: [
          { key: "title", header: "Temuan" },
          { key: "description", header: "Uraian" },
          { key: "severity", header: "Keparahan", type: "status" },
          { key: "areaLocation", header: "Area" },
          { key: "status", header: "Status", type: "status" },
          { key: "targetCloseDate", header: "Target penutupan", type: "date" },
        ],
      },
    ],
  },
  {
    slug: "audits",
    endpoint: "/audits",
    title: "Audit",
    moduleNumber: "Modul 09",
    group: "Inspeksi & Audit",
    labelField: "auditNumber",
    columns: [
      { key: "auditNumber", header: "Nomor" },
      { key: "status", header: "Status", type: "status" },
      { key: "plannedStartDate", header: "Rencana mulai", type: "date" },
      { key: "plannedEndDate", header: "Rencana selesai", type: "date" },
      { key: "actualStartDate", header: "Realisasi mulai", type: "date" },
      { key: "actualEndDate", header: "Realisasi selesai", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas audit",
        fields: [
          { key: "auditNumber", label: "Nomor audit" },
          { key: "auditTypeId", label: "Jenis audit" },
          { key: "auditChecklistId", label: "Checklist / standar" },
          { key: "status", label: "Status", type: "status" },
          { key: "leadAuditorId", label: "Ketua auditor" },
          { key: "siteId", label: "Lokasi yang diaudit" },
        ],
      },
      {
        title: "Jadwal dan pelaksanaan",
        fields: [
          { key: "plannedStartDate", label: "Rencana mulai", type: "date" },
          { key: "plannedEndDate", label: "Rencana selesai", type: "date" },
          { key: "actualStartDate", label: "Realisasi mulai", type: "date" },
          { key: "actualEndDate", label: "Realisasi selesai", type: "date" },
          { key: "openingMeetingDatetime", label: "Rapat pembukaan", type: "datetime" },
          { key: "closingMeetingDatetime", label: "Rapat penutupan", type: "datetime" },
        ],
      },
      {
        title: "Notulen dan kesimpulan",
        fields: [
          { key: "openingMeetingNotes", label: "Notulen rapat pembukaan", type: "longtext", wide: true },
          { key: "closingMeetingNotes", label: "Notulen rapat penutupan", type: "longtext", wide: true },
          { key: "overallConclusion", label: "Kesimpulan audit", type: "longtext", wide: true },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/findings",
        title: "Temuan audit",
        emptyMessage: "Audit ini belum dilaksanakan, jadi belum ada temuan.",
        columns: [
          { key: "findingNumber", header: "Nomor" },
          { key: "classification", header: "Klasifikasi", type: "status" },
          { key: "description", header: "Uraian" },
          { key: "status", header: "Status", type: "status" },
          { key: "requiresCapa", header: "Butuh CAPA", type: "bool" },
          { key: "identifiedBy", header: "Ditemukan oleh" },
          { key: "targetClosureDate", header: "Target penutupan", type: "date" },
        ],
      },
      {
        pathSuffix: "/team",
        title: "Tim audit",
        emptyMessage: "Tim audit belum ditetapkan.",
        columns: [
          { key: "userId", header: "Nama" },
          { key: "roleInTeam", header: "Peran", type: "enum" },
        ],
      },
    ],
  },
  {
    slug: "ncr-records",
    endpoint: "/ncr-records",
    title: "NCR Mutu",
    moduleNumber: "Modul 11",
    group: "Mutu & Lingkungan",
    labelField: "ncrNumber",
    subtitleField: "title",
    columns: [
      { key: "ncrNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "ncrSource", header: "Sumber", type: "enum" },
      { key: "severity", header: "Keparahan", type: "status" },
      { key: "disposition", header: "Disposisi", type: "status" },
      { key: "detectedDate", header: "Terdeteksi", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas ketidaksesuaian",
        fields: [
          { key: "ncrNumber", label: "Nomor NCR" },
          { key: "title", label: "Judul" },
          { key: "ncrSource", label: "Sumber", type: "enum" },
          { key: "severity", label: "Keparahan", type: "status" },
          { key: "status", label: "Status", type: "status" },
          { key: "detectionStage", label: "Tahap deteksi", type: "enum" },
          { key: "detectedBy", label: "Terdeteksi oleh" },
          { key: "detectedDate", label: "Tanggal terdeteksi", type: "date" },
        ],
      },
      {
        title: "Objek yang tidak sesuai",
        fields: [
          { key: "productName", label: "Produk / material" },
          { key: "productCode", label: "Kode produk" },
          { key: "batchLotNumber", label: "Nomor lot" },
          { key: "quantityNonconforming", label: "Jumlah tidak sesuai", type: "number" },
          { key: "unitOfMeasure", label: "Satuan" },
          { key: "processArea", label: "Area proses" },
          { key: "defectCategory", label: "Kategori cacat" },
          { key: "supplierName", label: "Pemasok" },
        ],
      },
      {
        title: "Uraian dan penanganan",
        fields: [
          { key: "description", label: "Uraian ketidaksesuaian", type: "longtext", wide: true },
          { key: "immediateContainmentAction", label: "Tindakan penahanan segera", type: "longtext", wide: true },
          { key: "dispositionJustification", label: "Alasan disposisi", type: "longtext", wide: true },
        ],
      },
      {
        title: "Disposisi dan penutupan",
        fields: [
          { key: "disposition", label: "Disposisi", type: "status" },
          { key: "dispositionApprovedBy", label: "Disetujui oleh" },
          { key: "dispositionApprovedAt", label: "Disetujui pada", type: "date" },
          { key: "reInspectionResult", label: "Hasil inspeksi ulang", type: "status" },
          { key: "closedDate", label: "Tanggal ditutup", type: "date" },
          { key: "closedBy", label: "Ditutup oleh" },
        ],
      },
      REKAMAN,
    ],
  },
  {
    slug: "environmental-aspect-impacts",
    endpoint: "/environmental-aspect-impacts",
    title: "Aspek & Dampak Lingkungan",
    moduleNumber: "Modul 12",
    group: "Mutu & Lingkungan",
    labelField: "registerNumber",
    subtitleField: "activityProcessArea",
    columns: [
      { key: "registerNumber", header: "Nomor" },
      { key: "activityProcessArea", header: "Aktivitas / area" },
      { key: "impactType", header: "Jenis dampak", type: "enum" },
      { key: "significanceScore", header: "Skor", type: "number" },
      { key: "significanceLevel", header: "Signifikansi", type: "status" },
      { key: "isRegulated", header: "Diatur regulasi", type: "bool" },
    ],
    detailSections: [
      {
        title: "Identitas aspek",
        fields: [
          { key: "registerNumber", label: "Nomor register" },
          { key: "activityProcessArea", label: "Aktivitas / area" },
          { key: "conditionType", label: "Kondisi operasi", type: "enum" },
          { key: "impactType", label: "Jenis dampak", type: "enum" },
          { key: "isRegulated", label: "Diatur regulasi", type: "bool" },
          { key: "status", label: "Status", type: "status" },
          { key: "siteId", label: "Lokasi" },
          { key: "identifiedBy", label: "Diidentifikasi oleh" },
        ],
      },
      {
        title: "Aspek dan dampaknya",
        fields: [
          { key: "environmentalAspect", label: "Aspek lingkungan", type: "longtext", wide: true },
          { key: "environmentalImpact", label: "Dampak lingkungan", type: "longtext", wide: true },
        ],
      },
      {
        title: "Penilaian signifikansi",
        fields: [
          { key: "likelihoodScore", label: "Kemungkinan", type: "number" },
          { key: "severityScore", label: "Keparahan", type: "number" },
          { key: "frequencyScore", label: "Frekuensi", type: "number" },
          { key: "regulatoryScore", label: "Aspek regulasi", type: "number" },
          { key: "stakeholderConcernScore", label: "Perhatian pemangku kepentingan", type: "number" },
          { key: "significanceScore", label: "Skor signifikansi", type: "number" },
          { key: "significanceThreshold", label: "Ambang signifikan", type: "number" },
          { key: "significanceLevel", label: "Kesimpulan", type: "status" },
        ],
      },
      REKAMAN,
    ],
  },
  {
    slug: "restricted-duty-assignments",
    endpoint: "/restricted-duty-assignments",
    title: "Penugasan Kerja Terbatas",
    moduleNumber: "Modul 13",
    group: "Kesehatan & Darurat",
    labelField: "restrictionType",
    columns: [
      { key: "restrictionType", header: "Jenis pembatasan", type: "enum" },
      { key: "alternativeTaskDescription", header: "Tugas alternatif" },
      { key: "status", header: "Status", type: "status" },
      { key: "startDate", header: "Mulai", type: "date" },
      { key: "endDate", header: "Selesai", type: "date" },
      { key: "complianceConfirmedBySupervisor", header: "Dikonfirmasi atasan", type: "bool" },
    ],
    detailSections: [
      {
        title: "Penugasan",
        fields: [
          { key: "employeeUserId", label: "Pekerja" },
          { key: "restrictionType", label: "Jenis pembatasan", type: "enum" },
          { key: "status", label: "Status", type: "status" },
          { key: "siteId", label: "Lokasi" },
          { key: "departmentId", label: "Departemen" },
          { key: "assignedBy", label: "Ditetapkan oleh" },
          { key: "supervisorUserId", label: "Atasan langsung" },
          { key: "complianceConfirmedBySupervisor", label: "Dikonfirmasi atasan", type: "bool" },
        ],
      },
      { title: "Tugas alternatif", fields: [{ key: "alternativeTaskDescription", label: "Uraian tugas", type: "longtext", wide: true }] },
      {
        title: "Masa berlaku",
        fields: [
          { key: "startDate", label: "Mulai", type: "date" },
          { key: "endDate", label: "Selesai", type: "date" },
        ],
      },
      REKAMAN,
    ],
  },
  {
    slug: "emergency-response-plans",
    endpoint: "/emergency-response-plans",
    title: "Rencana Tanggap Darurat",
    moduleNumber: "Modul 14",
    group: "Kesehatan & Darurat",
    labelField: "planNumber",
    subtitleField: "planTitle",
    columns: [
      { key: "planNumber", header: "Nomor" },
      { key: "planTitle", header: "Judul" },
      { key: "emergencyType", header: "Jenis darurat", type: "enum" },
      { key: "severityLevel", header: "Keparahan", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "nextReviewDueDate", header: "Tinjauan berikutnya", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas rencana",
        fields: [
          { key: "planNumber", label: "Nomor rencana" },
          { key: "planTitle", label: "Judul" },
          { key: "emergencyType", label: "Jenis keadaan darurat", type: "enum" },
          { key: "severityLevel", label: "Tingkat", type: "status" },
          { key: "status", label: "Status", type: "status" },
          { key: "versionNumber", label: "Versi", type: "number" },
          { key: "siteId", label: "Lokasi" },
        ],
      },
      { title: "Skenario", fields: [{ key: "scenarioDescription", label: "Uraian skenario", type: "longtext", wide: true }] },
      {
        title: "Pengesahan dan peninjauan",
        fields: [
          { key: "effectiveDate", label: "Mulai berlaku", type: "date" },
          { key: "approvedBy", label: "Disahkan oleh" },
          { key: "approvedAt", label: "Tanggal pengesahan", type: "date" },
          { key: "reviewedBy", label: "Ditinjau oleh" },
          { key: "lastReviewedDate", label: "Tinjauan terakhir", type: "date" },
          { key: "nextReviewDueDate", label: "Tinjauan berikutnya", type: "date" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/steps",
        title: "Langkah tanggap darurat",
        emptyMessage: "Langkah tanggap darurat belum disusun.",
        columns: [
          { key: "sequenceNo", header: "Urutan", type: "number" },
          { key: "stepDescription", header: "Langkah" },
          { key: "responsibleErtRole", header: "Penanggung jawab", type: "enum" },
          { key: "maxTimeTargetMinutes", header: "Target (menit)", type: "number" },
        ],
      },
    ],
  },
  {
    slug: "assets",
    endpoint: "/assets",
    title: "Aset & Peralatan",
    moduleNumber: "Modul 15",
    group: "Aset & Mitra Kerja",
    labelField: "assetCode",
    subtitleField: "assetName",
    columns: [
      { key: "assetCode", header: "Kode" },
      { key: "assetName", header: "Nama" },
      { key: "manufacturer", header: "Pabrikan" },
      { key: "lifecycleStatus", header: "Status", type: "status" },
      { key: "conditionStatus", header: "Kondisi", type: "status" },
      { key: "isSafetyCritical", header: "Safety critical", type: "bool" },
    ],
    detailSections: [
      {
        title: "Identitas aset",
        fields: [
          { key: "assetCode", label: "Kode aset" },
          { key: "assetName", label: "Nama aset" },
          { key: "assetCategoryId", label: "Kategori" },
          { key: "manufacturer", label: "Pabrikan" },
          { key: "modelNumber", label: "Tipe / model" },
          { key: "serialNumber", label: "Nomor seri" },
          { key: "isSafetyCritical", label: "Safety critical", type: "bool" },
        ],
      },
      {
        title: "Status dan penempatan",
        fields: [
          { key: "lifecycleStatus", label: "Status siklus hidup", type: "status" },
          { key: "conditionStatus", label: "Kondisi", type: "status" },
          { key: "siteId", label: "Lokasi" },
          { key: "departmentId", label: "Departemen" },
          { key: "purchaseDate", label: "Tanggal pembelian", type: "date" },
          { key: "commissioningDate", label: "Tanggal commissioning", type: "date" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/maintenance",
        title: "Riwayat pemeliharaan",
        emptyMessage: "Belum ada rekaman pemeliharaan untuk aset ini.",
        columns: [
          { key: "performedDate", header: "Tanggal", type: "date" },
          { key: "performedBy", header: "Dikerjakan oleh" },
          { key: "findings", header: "Temuan dan pekerjaan" },
          { key: "resultCondition", header: "Kondisi akhir", type: "status" },
          { key: "cost", header: "Biaya", type: "currency" },
        ],
      },
    ],
  },
  {
    slug: "calibration-items",
    endpoint: "/calibration-items",
    title: "Item Kalibrasi",
    moduleNumber: "Modul 16",
    group: "Aset & Mitra Kerja",
    labelField: "equipmentTagNo",
    subtitleField: "measurementParameter",
    columns: [
      { key: "equipmentTagNo", header: "Tag" },
      { key: "measurementParameter", header: "Parameter" },
      { key: "measurementRangeUnit", header: "Satuan" },
      { key: "calibrationIntervalMonths", header: "Interval (bulan)", type: "number" },
      { key: "calibrationStatus", header: "Status", type: "status" },
      { key: "isCriticalMeasurement", header: "Pengukuran kritis", type: "bool" },
    ],
    detailSections: [
      {
        title: "Identitas alat ukur",
        fields: [
          { key: "equipmentTagNo", label: "Tag peralatan" },
          { key: "assetId", label: "Aset terkait" },
          { key: "measurementParameter", label: "Parameter ukur" },
          { key: "calibrationStatus", label: "Status", type: "status" },
          { key: "isCriticalMeasurement", label: "Pengukuran kritis", type: "bool" },
          { key: "siteId", label: "Lokasi" },
        ],
      },
      {
        title: "Rentang dan interval",
        fields: [
          { key: "measurementRangeMin", label: "Batas bawah", type: "number" },
          { key: "measurementRangeMax", label: "Batas atas", type: "number" },
          { key: "measurementRangeUnit", label: "Satuan" },
          { key: "calibrationIntervalMonths", label: "Interval kalibrasi (bulan)", type: "number" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/certificates",
        title: "Sertifikat kalibrasi",
        emptyMessage: "Belum ada sertifikat kalibrasi untuk alat ini.",
        columns: [
          { key: "certificateNo", header: "Nomor sertifikat" },
          { key: "calibrationProviderId", header: "Penyedia" },
          { key: "calibrationDate", header: "Tanggal kalibrasi", type: "date" },
          { key: "nextDueDate", header: "Jatuh tempo berikutnya", type: "date" },
          { key: "calibrationResult", header: "Hasil", type: "status" },
          { key: "asFoundCondition", header: "Kondisi saat diterima" },
          { key: "measurementUncertainty", header: "Ketidakpastian" },
        ],
      },
    ],
  },
  {
    slug: "training-programs",
    endpoint: "/training-programs",
    title: "Program Pelatihan",
    moduleNumber: "Modul 19",
    group: "Kompetensi & Pelatihan",
    labelField: "programNumber",
    subtitleField: "title",
    columns: [
      { key: "programNumber", header: "Nomor" },
      { key: "title", header: "Program" },
      { key: "trainingType", header: "Jenis", type: "enum" },
      { key: "isMandatory", header: "Wajib", type: "bool" },
      { key: "plannedParticipants", header: "Rencana peserta", type: "number" },
      { key: "plannedSessions", header: "Sesi", type: "number" },
      { key: "status", header: "Status", type: "status" },
    ],
    detailSections: [
      {
        title: "Identitas program",
        fields: [
          { key: "programNumber", label: "Nomor program" },
          { key: "title", label: "Judul program" },
          { key: "trainingType", label: "Jenis pelatihan", type: "enum" },
          // TANPA type: "number". Tahun adalah penanda, bukan besaran, dan
          // pemformat angka Indonesia mencetaknya "2.026" — pemisah ribuan
          // pada tahun terbaca sebagai salah ketik.
          { key: "fiscalYear", label: "Tahun anggaran" },
          { key: "status", label: "Status", type: "status" },
          { key: "picUserId", label: "Penanggung jawab" },
          { key: "departmentId", label: "Departemen" },
        ],
      },
      {
        title: "Sasaran dan dasar",
        fields: [
          { key: "objective", label: "Tujuan pelatihan", type: "longtext", wide: true },
          { key: "targetAudience", label: "Sasaran peserta" },
          { key: "isMandatory", label: "Diwajibkan peraturan", type: "bool" },
          // Kolom yang membedakan program pelatihan dari daftar keinginan.
          // Ini yang ditunjuk saat auditor bertanya "atas dasar apa".
          { key: "regulatoryBasis", label: "Dasar peraturan", wide: true },
        ],
      },
      {
        title: "Rencana",
        fields: [
          { key: "plannedParticipants", label: "Jumlah peserta direncanakan", type: "number" },
          { key: "plannedHoursPerParticipant", label: "Jam per peserta", type: "number" },
          { key: "plannedSessions", label: "Jumlah sesi", type: "number" },
          { key: "plannedBudget", label: "Anggaran", type: "currency" },
          { key: "deliveryMethod", label: "Metode", type: "enum" },
          { key: "providerName", label: "Penyelenggara" },
          { key: "plannedStartDate", label: "Rencana mulai", type: "date" },
          { key: "plannedEndDate", label: "Rencana selesai", type: "date" },
        ],
      },
      {
        title: "Sertifikasi",
        fields: [
          { key: "certificationRequired", label: "Menghasilkan sertifikat", type: "bool" },
          { key: "certificateValidityMonths", label: "Masa berlaku sertifikat (bulan)", type: "number" },
        ],
      },
      { title: "Catatan", fields: [{ key: "notes", label: "Catatan", type: "longtext", wide: true }] },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/realizations",
        title: "Realisasi pelatihan",
        // Kalimatnya menyebut SEBABNYA, bukan sekadar "belum ada data":
        // program yang belum berjalan dan program yang gagal berjalan
        // terlihat sama pada daftar kosong, padahal keduanya menuntut
        // tindakan yang berbeda.
        emptyMessage: "Program ini belum pernah dilaksanakan — belum ada sesi yang tercatat.",
        columns: [
          { key: "realizationNumber", header: "Nomor" },
          { key: "title", header: "Sesi" },
          { key: "sessionDate", header: "Tanggal", type: "date" },
          { key: "actualParticipants", header: "Hadir", type: "number" },
          { key: "durationHours", header: "Jam", type: "number" },
          { key: "effectiveness", header: "Keefektifan", type: "enum" },
          { key: "status", header: "Status", type: "status" },
        ],
      },
    ],
  },
  {
    slug: "training-realizations",
    endpoint: "/training-realizations",
    title: "Realisasi Pelatihan",
    moduleNumber: "Modul 19",
    group: "Kompetensi & Pelatihan",
    labelField: "realizationNumber",
    subtitleField: "title",
    columns: [
      { key: "realizationNumber", header: "Nomor" },
      { key: "title", header: "Pelatihan" },
      { key: "sessionDate", header: "Tanggal", type: "date" },
      { key: "actualParticipants", header: "Hadir", type: "number" },
      { key: "durationHours", header: "Jam", type: "number" },
      { key: "effectiveness", header: "Keefektifan", type: "enum" },
      { key: "status", header: "Status", type: "status" },
    ],
    detailSections: [
      {
        title: "Pelaksanaan",
        fields: [
          { key: "realizationNumber", label: "Nomor realisasi" },
          { key: "title", label: "Judul sesi" },
          { key: "trainingType", label: "Jenis pelatihan", type: "enum" },
          // Kosong berarti pelatihan ini TIDAK berasal dari program tahunan —
          // keadaan yang sengaja bisa terjadi, mis. pelatihan dadakan setelah
          // insiden.
          { key: "trainingProgramId", label: "Program yang dilaksanakan" },
          { key: "sessionDate", label: "Tanggal pelaksanaan", type: "date" },
          { key: "sessionEndDate", label: "Tanggal selesai", type: "date" },
          { key: "durationHours", label: "Durasi (jam)", type: "number" },
          { key: "status", label: "Status", type: "status" },
        ],
      },
      {
        title: "Penyelenggaraan",
        fields: [
          { key: "deliveryMethod", label: "Metode", type: "enum" },
          { key: "providerName", label: "Penyelenggara" },
          { key: "trainerName", label: "Instruktur" },
          { key: "location", label: "Tempat" },
          { key: "siteId", label: "Lokasi kerja" },
          { key: "departmentId", label: "Departemen" },
        ],
      },
      {
        title: "Kehadiran dan biaya",
        fields: [
          { key: "plannedParticipants", label: "Peserta direncanakan", type: "number" },
          { key: "actualParticipants", label: "Peserta hadir", type: "number" },
          { key: "passedParticipants", label: "Peserta lulus", type: "number" },
          { key: "actualCost", label: "Biaya realisasi", type: "currency" },
        ],
      },
      {
        title: "Evaluasi keefektifan",
        fields: [
          { key: "averagePreTestScore", label: "Rata-rata nilai pra-uji", type: "number" },
          { key: "averagePostTestScore", label: "Rata-rata nilai pasca-uji", type: "number" },
          { key: "effectiveness", label: "Penilaian keefektifan", type: "enum" },
          { key: "evaluationMethod", label: "Cara evaluasi", wide: true },
          { key: "evaluationNotes", label: "Catatan evaluasi", type: "longtext", wide: true },
          { key: "evaluatedBy", label: "Dievaluasi oleh" },
          { key: "evaluatedDate", label: "Tanggal evaluasi", type: "date" },
          { key: "certificateIssued", label: "Sertifikat diterbitkan", type: "bool" },
        ],
      },
      { title: "Catatan", fields: [{ key: "notes", label: "Catatan", type: "longtext", wide: true }] },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/participants",
        title: "Daftar peserta",
        // Pelatihan tanpa sertifikat memang tidak didaftar namanya satu per
        // satu, dan kalimat ini mengatakannya — supaya daftar kosong tidak
        // terbaca sebagai kehadiran yang lupa dicatat.
        emptyMessage: "Sesi ini tidak mendaftar peserta per nama — kehadirannya dicatat sebagai jumlah.",
        columns: [
          { key: "participantName", header: "Nama" },
          { key: "participantCompany", header: "Perusahaan" },
          { key: "participantPosition", header: "Jabatan" },
          { key: "attendance", header: "Kehadiran", type: "enum" },
          { key: "postTestScore", header: "Nilai pasca-uji", type: "number" },
          { key: "result", header: "Hasil", type: "status" },
          { key: "certificateNumber", header: "No. sertifikat" },
          { key: "certificateExpiryDate", header: "Berlaku sampai", type: "date" },
        ],
      },
    ],
  },
  {
    slug: "quality-objectives",
    endpoint: "/quality-objectives",
    title: "Indikator Balanced Scorecard",
    moduleNumber: "Pengaturan",
    group: "Pengaturan",
    labelField: "objectiveTitle",
    subtitleField: "kpiMetricName",
    columns: [
      { key: "objectiveCode", header: "Kode" },
      { key: "objectiveTitle", header: "Sasaran" },
      { key: "bscPerspective", header: "Perspektif", type: "enum" },
      { key: "bscWeightPercentage", header: "Bobot %" },
      { key: "targetValue", header: "Target" },
      { key: "currentValue", header: "Capaian" },
      { key: "status", header: "Status", type: "status" },
    ],
    detailSections: [
      {
        title: "Sasaran",
        fields: [
          { key: "objectiveCode", label: "Kode sasaran" },
          { key: "objectiveTitle", label: "Judul sasaran" },
          { key: "description", label: "Uraian" },
          { key: "isoClauseRef", label: "Acuan klausul ISO" },
        ],
      },
      {
        title: "Pengukuran",
        fields: [
          { key: "kpiMetricName", label: "Nama indikator" },
          { key: "baselineValue", label: "Nilai awal" },
          { key: "targetValue", label: "Target" },
          { key: "currentValue", label: "Capaian berjalan" },
          { key: "targetUnit", label: "Satuan" },
          { key: "measurementFrequency", label: "Frekuensi pengukuran", type: "enum" },
        ],
      },
      {
        title: "Balanced Scorecard",
        fields: [
          { key: "bscPerspective", label: "Perspektif", type: "enum" },
          { key: "bscWeightPercentage", label: "Bobot dalam perspektif (%)" },
          { key: "periodStart", label: "Awal periode", type: "date" },
          { key: "periodEnd", label: "Akhir periode", type: "date" },
          { key: "status", label: "Status", type: "status" },
        ],
      },
    ],
  },
  {
    slug: "hse-period-statistics",
    endpoint: "/hse-period-statistics",
    title: "Statistik HSE Bulanan",
    moduleNumber: "Pengaturan",
    group: "Pengaturan",
    labelField: "periodMonth",
    columns: [
      { key: "periodMonth", header: "Bulan", type: "date" },
      { key: "manpower", header: "Tenaga kerja" },
      { key: "manhours", header: "Jam kerja" },
      { key: "safetyInductions", header: "Induksi" },
      { key: "toolboxTalks", header: "Toolbox talk" },
      { key: "unsafeActs", header: "Tindakan tidak aman" },
      { key: "unsafeConditions", header: "Kondisi tidak aman" },
    ],
    detailSections: [
      {
        title: "Pembagi indikator kekerapan",
        fields: [
          { key: "periodMonth", label: "Bulan", type: "date" },
          { key: "manpower", label: "Jumlah tenaga kerja" },
          { key: "manhours", label: "Jam kerja" },
        ],
      },
      {
        title: "Leading indicator",
        fields: [
          { key: "safetyInductions", label: "Induksi keselamatan" },
          { key: "toolboxTalks", label: "Toolbox talk" },
          { key: "hseMeetings", label: "Rapat HSE" },
          { key: "trainingHours", label: "Jam pelatihan" },
          { key: "managementWalkthroughs", label: "Kunjungan manajemen" },
          { key: "safetyObservations", label: "Observasi keselamatan" },
        ],
      },
      {
        title: "Hasil observasi",
        fields: [
          { key: "unsafeActs", label: "Tindakan tidak aman" },
          { key: "unsafeConditions", label: "Kondisi tidak aman" },
          { key: "notes", label: "Catatan" },
        ],
      },
    ],
  },
  {
    slug: "contractors",
    endpoint: "/contractors",
    title: "Kontraktor",
    moduleNumber: "Modul 17",
    group: "Aset & Mitra Kerja",
    labelField: "contractorName",
    columns: [
      { key: "contractorName", header: "Nama" },
      { key: "contractorType", header: "Jenis", type: "enum" },
      { key: "contractorCategory", header: "Kategori", type: "enum" },
      { key: "overallRiskRating", header: "Risiko", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "registeredAt", header: "Terdaftar", type: "date" },
    ],
    detailSections: [
      {
        title: "Identitas perusahaan",
        fields: [
          { key: "contractorName", label: "Nama perusahaan" },
          { key: "contractorType", label: "Jenis pekerjaan", type: "enum" },
          { key: "contractorCategory", label: "Kategori", type: "enum" },
          { key: "status", label: "Status", type: "status" },
          { key: "overallRiskRating", label: "Peringkat risiko", type: "status" },
          { key: "registeredAt", label: "Terdaftar sejak", type: "date" },
        ],
      },
      {
        title: "Legalitas",
        fields: [
          { key: "businessRegistrationNo", label: "Nomor akta / NIB" },
          { key: "taxIdNpwp", label: "NPWP" },
          { key: "businessLicenseType", label: "Jenis izin usaha" },
        ],
      },
      {
        title: "Alamat dan narahubung",
        fields: [
          { key: "address", label: "Alamat" },
          { key: "city", label: "Kota" },
          { key: "province", label: "Provinsi" },
          { key: "contactPersonName", label: "Nama narahubung" },
          { key: "contactPersonPhone", label: "Telepon" },
          { key: "contactPersonEmail", label: "Surel" },
        ],
      },
      REKAMAN,
    ],
    children: [
      {
        pathSuffix: "/evaluations",
        title: "Evaluasi kinerja",
        emptyMessage: "Kontraktor ini belum pernah dievaluasi — belum ada penugasan yang selesai.",
        columns: [
          { key: "periodStartDate", header: "Periode mulai", type: "date" },
          { key: "periodEndDate", header: "Periode selesai", type: "date" },
          { key: "overallRating", header: "Peringkat", type: "status" },
          { key: "hseComplianceScore", header: "Skor HSE", type: "number" },
          { key: "incidentCount", header: "Insiden", type: "number" },
          { key: "manHoursWorked", header: "Man-hours", type: "number" },
          { key: "recommendation", header: "Rekomendasi" },
        ],
      },
    ],
  },
];

export function findModule(slug: string): ModuleDefinition | undefined {
  return MODULES.find((module) => module.slug === slug);
}

export function modulesByGroup(): Array<{ group: string; modules: ModuleDefinition[] }> {
  return MODULE_GROUPS.map((group) => ({
    group,
    modules: MODULES.filter((module) => module.group === group),
  })).filter((entry) => entry.modules.length > 0);
}
