// Registri modul — SATU sumber kebenaran untuk sidebar, halaman daftar,
// halaman detail, dan kartu KPI dashboard.
//
// Setiap entri memetakan satu endpoint GET read-only yang benar-benar ada di
// apps/api (lihat *.controller.ts di modules/domains/*). Kolom yang
// didaftarkan di sini adalah nama field Prisma apa adanya — API mengembalikan
// objek model mentah, tidak ada lapisan DTO/serializer di endpoint read-only
// itu, jadi nama field di sini HARUS sama persis dengan schema.prisma.
//
// Halaman daftar/detail digerakkan konfigurasi (satu route dinamis
// app/(dashboard)/modules/[slug]) alih-alih 15 file halaman kembar — cerminan
// dari fakta bahwa 15 controller-nya sendiri lahir dari satu template yang
// sama. Menambah modul ke-16 nanti = menambah satu entri di array ini.

export type ColumnType = "text" | "enum" | "status" | "date" | "datetime" | "number" | "bool";

export interface ModuleColumn {
  key: string;
  header: string;
  type?: ColumnType; // default "text"
}

export interface ModuleDefinition {
  slug: string;
  /** Path API relatif terhadap NEXT_PUBLIC_API_URL, mis. "/documents". */
  endpoint: string;
  title: string;
  /** Nomor modul PRD — dipakai di judul halaman supaya nyambung ke dokumen desain. */
  moduleNumber: string;
  group: string;
  /** Field yang jadi judul di halaman detail (nomor dokumen/permit/dst). */
  labelField: string;
  columns: ModuleColumn[];
  /**
   * Daftar anak opsional yang ikut ditampilkan di halaman detail. Saat ini
   * hanya audit yang punya (GET /audits/:id/findings) — satu-satunya endpoint
   * anak yang tersedia di API; modul lain belum punya padanannya.
   */
  children?: {
    /** Ditempel setelah `${endpoint}/${id}`, mis. "/findings". */
    pathSuffix: string;
    title: string;
    columns: ModuleColumn[];
  };
}

export const MODULE_GROUPS = [
  "Dokumen & Kepatuhan",
  "Risiko & Operasi",
  "Kejadian & Perbaikan",
  "Inspeksi & Audit",
  "Mutu & Lingkungan",
  "Kesehatan & Darurat",
  "Aset & Mitra Kerja",
] as const;

export const MODULES: ModuleDefinition[] = [
  {
    slug: "documents",
    endpoint: "/documents",
    title: "Dokumen Terkendali",
    moduleNumber: "Modul 03",
    group: "Dokumen & Kepatuhan",
    labelField: "documentNumber",
    columns: [
      { key: "documentNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "documentType", header: "Jenis", type: "enum" },
      { key: "status", header: "Status", type: "status" },
      { key: "effectiveDate", header: "Berlaku", type: "date" },
      { key: "nextReviewDate", header: "Tinjauan berikutnya", type: "date" },
    ],
  },
  {
    slug: "regulatory-registers",
    endpoint: "/regulatory-registers",
    title: "Register Peraturan",
    moduleNumber: "Modul 04",
    group: "Dokumen & Kepatuhan",
    labelField: "regulationNumber",
    columns: [
      { key: "regulationNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "regulationType", header: "Jenis", type: "enum" },
      { key: "issuingAuthority", header: "Penerbit" },
      { key: "status", header: "Status", type: "status" },
      { key: "nextReviewDate", header: "Tinjauan berikutnya", type: "date" },
    ],
  },
  {
    slug: "hira-assessments",
    endpoint: "/hira-assessments",
    title: "Penilaian HIRA",
    moduleNumber: "Modul 05",
    group: "Risiko & Operasi",
    labelField: "hiraNumber",
    columns: [
      { key: "hiraNumber", header: "Nomor" },
      { key: "activityDescription", header: "Aktivitas" },
      { key: "assessmentType", header: "Jenis", type: "enum" },
      { key: "status", header: "Status", type: "status" },
      { key: "assessmentDate", header: "Tanggal", type: "date" },
      { key: "reviewDueDate", header: "Jatuh tempo tinjauan", type: "date" },
    ],
  },
  {
    slug: "work-permits",
    endpoint: "/work-permits",
    title: "Izin Kerja (PTW)",
    moduleNumber: "Modul 06",
    group: "Risiko & Operasi",
    labelField: "permitNumber",
    columns: [
      { key: "permitNumber", header: "Nomor" },
      { key: "title", header: "Pekerjaan" },
      { key: "riskLevel", header: "Risiko", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "plannedStartDatetime", header: "Mulai", type: "datetime" },
      { key: "plannedEndDatetime", header: "Selesai", type: "datetime" },
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
  },
  {
    slug: "capa-registers",
    endpoint: "/capa-registers",
    title: "Register CAPA",
    moduleNumber: "Modul 10",
    group: "Kejadian & Perbaikan",
    labelField: "capaNumber",
    columns: [
      { key: "capaNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "sourceType", header: "Sumber", type: "enum" },
      { key: "priority", header: "Prioritas", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "targetClosureDate", header: "Target penutupan", type: "date" },
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
    children: {
      pathSuffix: "/findings",
      title: "Temuan audit",
      columns: [
        { key: "findingNumber", header: "Nomor" },
        { key: "classification", header: "Klasifikasi", type: "status" },
        { key: "description", header: "Uraian" },
        { key: "status", header: "Status", type: "status" },
        { key: "requiresCapa", header: "Butuh CAPA", type: "bool" },
        { key: "targetClosureDate", header: "Target penutupan", type: "date" },
      ],
    },
  },
  {
    slug: "ncr-records",
    endpoint: "/ncr-records",
    title: "NCR Mutu",
    moduleNumber: "Modul 11",
    group: "Mutu & Lingkungan",
    labelField: "ncrNumber",
    columns: [
      { key: "ncrNumber", header: "Nomor" },
      { key: "title", header: "Judul" },
      { key: "ncrSource", header: "Sumber", type: "enum" },
      { key: "severity", header: "Keparahan", type: "status" },
      { key: "disposition", header: "Disposisi", type: "status" },
      { key: "detectedDate", header: "Terdeteksi", type: "date" },
    ],
  },
  {
    slug: "environmental-aspect-impacts",
    endpoint: "/environmental-aspect-impacts",
    title: "Aspek & Dampak Lingkungan",
    moduleNumber: "Modul 12",
    group: "Mutu & Lingkungan",
    labelField: "registerNumber",
    columns: [
      { key: "registerNumber", header: "Nomor" },
      { key: "activityProcessArea", header: "Aktivitas / area" },
      { key: "impactType", header: "Jenis dampak", type: "enum" },
      { key: "significanceScore", header: "Skor", type: "number" },
      { key: "significanceLevel", header: "Signifikansi", type: "status" },
      { key: "isRegulated", header: "Diatur regulasi", type: "bool" },
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
  },
  {
    slug: "emergency-response-plans",
    endpoint: "/emergency-response-plans",
    title: "Rencana Tanggap Darurat",
    moduleNumber: "Modul 14",
    group: "Kesehatan & Darurat",
    labelField: "planNumber",
    columns: [
      { key: "planNumber", header: "Nomor" },
      { key: "planTitle", header: "Judul" },
      { key: "emergencyType", header: "Jenis darurat", type: "enum" },
      { key: "severityLevel", header: "Keparahan", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "nextReviewDueDate", header: "Tinjauan berikutnya", type: "date" },
    ],
  },
  {
    slug: "assets",
    endpoint: "/assets",
    title: "Aset & Peralatan",
    moduleNumber: "Modul 15",
    group: "Aset & Mitra Kerja",
    labelField: "assetCode",
    columns: [
      { key: "assetCode", header: "Kode" },
      { key: "assetName", header: "Nama" },
      { key: "manufacturer", header: "Pabrikan" },
      { key: "lifecycleStatus", header: "Status", type: "status" },
      { key: "conditionStatus", header: "Kondisi", type: "status" },
      { key: "isSafetyCritical", header: "Safety critical", type: "bool" },
    ],
  },
  {
    slug: "calibration-items",
    endpoint: "/calibration-items",
    title: "Item Kalibrasi",
    moduleNumber: "Modul 16",
    group: "Aset & Mitra Kerja",
    labelField: "equipmentTagNo",
    columns: [
      { key: "equipmentTagNo", header: "Tag" },
      { key: "measurementParameter", header: "Parameter" },
      { key: "measurementRangeUnit", header: "Satuan" },
      { key: "calibrationIntervalMonths", header: "Interval (bulan)", type: "number" },
      { key: "calibrationStatus", header: "Status", type: "status" },
      { key: "isCriticalMeasurement", header: "Pengukuran kritis", type: "bool" },
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
