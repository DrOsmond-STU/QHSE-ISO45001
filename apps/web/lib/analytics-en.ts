// Padanan Inggris untuk katalog metrik yang dikirim demo-api.
//
// KENAPA DI SISI KLIEN, BUKAN DI SERVER.
//
// Alternatifnya adalah menambah `titleEn`/`captionEn` pada tiap entri di
// apps/demo-api/src/analytics.js. Itu terdengar lebih rapi sampai dipikirkan
// akibatnya: bahasa antarmuka jadi bagian dari kontrak API, dan menambah
// bahasa ketiga berarti mengubah bentuk respons yang dipakai seluruh klien.
// Bahasa yang dipilih pengguna adalah urusan tampilan, dan urusan tampilan
// tinggal di apps/web — di tempat yang sama dengan seluruh terjemahan lain
// (lihat lib/modules-en.ts).
//
// Judul, keterangan, DAN SATUAN sama-sama diterjemahkan. Satuan mudah
// terlupakan justru karena pendek, padahal ia menempel pada angka yang paling
// diperhatikan: "961.833 jam" pada layar berbahasa Inggris membuat angkanya
// terbaca seolah bukan bagian dari halaman yang sama.

export const KAMUS_METRIK: Record<string, string> = {
  // --- Kelompok ---
  "Kejadian & Perbaikan": "Incidents & Corrective Action",
  "Inspeksi & Audit": "Inspection & Audit",
  "Risiko & Operasi": "Risk & Operations",
  "Mutu & Lingkungan": "Quality & Environment",
  "Dokumen & Kepatuhan": "Documents & Compliance",
  "Aset & Mitra Kerja": "Assets & Contractors",
  "Kesehatan & Darurat": "Health & Emergency",
  "Kompetensi & Pelatihan": "Competency & Training",
  Eksekutif: "Executive",

  // --- Satuan ---
  insiden: "incidents",
  hari: "days",
  IDR: "IDR",
  CAPA: "CAPA",
  "%": "%",
  inspeksi: "inspections",
  temuan: "findings",
  audit: "audits",
  izin: "permits",
  bahaya: "hazards",
  poin: "points",
  NCR: "NCRs",
  aspek: "aspects",
  dokumen: "documents",
  kewajiban: "obligations",
  alat: "instruments",
  aset: "assets",
  kontraktor: "contractors",
  orang: "people",
  jam: "hours",
  "per 1 juta jam": "per million hours",
  kejadian: "events",
  kegiatan: "activities",
  "jam-orang": "person-hours",
  program: "programmes",
  sertifikat: "certificates",

  // --- Perspektif Balanced Scorecard (judul & keterangan dari demo-api) ---
  Keuangan: "Financial",
  "Biaya kerugian, denda, dan penghematan yang lahir dari kinerja QHSE.":
    "Loss costs, fines, and savings that arise from QHSE performance.",
  "Pelanggan & Pemangku Kepentingan": "Customer & Stakeholders",
  "Kepuasan pelanggan, keluhan, dan kepatuhan yang dilihat pihak luar.":
    "Customer satisfaction, complaints, and compliance as seen from outside.",
  "Proses Internal": "Internal Process",
  "Mutu pelaksanaan operasi: insiden, temuan, CAPA, izin kerja, inspeksi.":
    "Quality of operational execution: incidents, findings, CAPA, work permits, inspections.",
  "Pembelajaran & Pertumbuhan": "Learning & Growth",
  "Kompetensi, pelatihan, budaya lapor, dan kesiapan organisasi.":
    "Competency, training, reporting culture, and organisational readiness.",

  // --- Insiden ---
  "Tren insiden per bulan": "Monthly incident trend",
  "Jumlah insiden yang dilaporkan, dihitung dari tanggal kejadian.":
    "Number of reported incidents, counted by event date.",
  "Insiden per klasifikasi": "Incidents by classification",
  "Nyaris celaka, cedera ringan, hilang hari kerja, dan seterusnya.":
    "Near miss, first aid, lost time injury, and so on.",
  "Insiden per tingkat keparahan": "Incidents by severity",
  "Sebaran keparahan insiden pada periode terpilih.": "Severity distribution of incidents in the selected period.",
  "Hari kerja hilang": "Lost workdays",
  "Total hari kerja yang hilang akibat insiden pada periode terpilih.":
    "Total workdays lost to incidents in the selected period.",
  "Estimasi biaya insiden": "Estimated incident cost",
  "Jumlah estimasi biaya yang tercatat pada laporan insiden.":
    "Total estimated cost recorded on incident reports.",

  // --- CAPA ---
  "CAPA per status": "CAPA by status",
  "Posisi seluruh CAPA dalam alur perbaikannya.": "Where every CAPA sits in its corrective-action flow.",
  "CAPA per prioritas": "CAPA by priority",
  "Sebaran prioritas CAPA yang terdaftar.": "Priority distribution of registered CAPAs.",
  "CAPA lewat tenggat": "Overdue CAPA",
  "Belum ditutup padahal target penutupannya sudah lewat.": "Not yet closed although the target closure date has passed.",
  "Tingkat penutupan CAPA": "CAPA closure rate",
  "Persentase CAPA berstatus tertutup-efektif dari seluruh CAPA.":
    "Percentage of CAPAs closed as effective, out of all CAPAs.",

  // --- Inspeksi & audit ---
  "Tren inspeksi terlaksana": "Completed inspection trend",
  "Jumlah inspeksi yang benar-benar dikerjakan tiap bulan.": "Inspections actually carried out each month.",
  "Tingkat kelulusan inspeksi": "Inspection pass rate",
  "Persentase inspeksi berhasil dari yang sudah dinilai hasilnya.":
    "Percentage of passed inspections, out of those already assessed.",
  "Hasil inspeksi": "Inspection results",
  "Sebaran hasil akhir inspeksi yang sudah dilaksanakan.": "Final result distribution of completed inspections.",
  "Temuan inspeksi per keparahan": "Inspection findings by severity",
  "Sebaran keparahan temuan yang muncul dari inspeksi lapangan.":
    "Severity distribution of findings raised by field inspections.",
  "Temuan audit per klasifikasi": "Audit findings by classification",
  "Ketidaksesuaian mayor, minor, dan peluang perbaikan.": "Major and minor nonconformities, and opportunities for improvement.",
  "Temuan audit belum ditutup": "Open audit findings",
  "Temuan yang masih terbuka atau menunggu verifikasi.": "Findings still open or awaiting verification.",
  "Audit per status": "Audits by status",
  "Posisi seluruh audit dalam siklus perencanaan sampai penutupan.":
    "Where every audit sits, from planning through closure.",
  "Temuan audit tertutup": "Closed audit findings",
  "Bagian temuan audit yang sudah ditutup, dari seluruh temuan pada periode terpilih.":
    "Share of audit findings already closed, out of all findings in the selected period.",

  // --- Izin kerja & risiko ---
  "Tren izin kerja": "Work permit trend",
  "Jumlah izin kerja per bulan menurut rencana mulainya.": "Work permits per month by planned start date.",
  "Izin kerja per status": "Work permits by status",
  "Berapa yang menunggu persetujuan, berjalan, dan sudah selesai.":
    "How many are awaiting approval, active, and already closed.",
  "Izin kerja per tingkat risiko": "Work permits by risk level",
  "Sebaran tingkat risiko pekerjaan yang diizinkan.": "Risk-level distribution of permitted work.",
  "Risiko HIRA setelah kendali": "HIRA risk after controls",
  "Tingkat risiko yang tersisa setelah pengendalian diterapkan.":
    "Risk level remaining once controls are in place.",
  "Penurunan skor risiko": "Risk score reduction",
  "Rata-rata selisih skor risiko sebelum dan sesudah pengendalian.":
    "Average difference in risk score before and after controls.",

  // --- Mutu & lingkungan ---
  "Tren NCR mutu": "Quality NCR trend",
  "Ketidaksesuaian mutu per bulan menurut tanggal terdeteksi.": "Quality nonconformities per month by detection date.",
  "NCR per tingkat keparahan": "NCR by severity",
  "Sebaran keparahan ketidaksesuaian mutu.": "Severity distribution of quality nonconformities.",
  "Aspek lingkungan per tingkat penting": "Environmental aspects by significance",
  "Aspek yang dinilai penting menuntut pengendalian khusus.": "Aspects assessed as significant require dedicated controls.",

  // --- Dokumen & kepatuhan ---
  "Dokumen per status": "Documents by status",
  "Potret status seluruh dokumen terkendali saat ini.": "Current status snapshot of all controlled documents.",
  "Dokumen jatuh tempo tinjauan": "Documents due for review",
  "Tinjauan berkalanya jatuh tempo dalam 60 hari ke depan, atau sudah lewat.":
    "Periodic review falls due within the next 60 days, or has already passed.",
  "Kewajiban kepatuhan per status": "Compliance obligations by status",
  "Status pemenuhan kewajiban yang diturunkan dari peraturan.":
    "Fulfilment status of obligations derived from regulations.",

  // --- Aset & mitra kerja ---
  "Kalibrasi jatuh tempo": "Calibration due",
  "Sertifikat kalibrasi yang jatuh tempo dalam 30 hari, atau sudah lewat.":
    "Calibration certificates falling due within 30 days, or already expired.",
  "Kondisi aset": "Asset condition",
  "Sebaran kondisi aset dan peralatan yang terdaftar.": "Condition distribution of registered assets and equipment.",
  "Kontraktor per status": "Contractors by status",
  "Potret status mitra kerja saat ini.": "Current status snapshot of contractors.",
  "Biaya pemeliharaan per bulan": "Monthly maintenance cost",
  "Total biaya pemeliharaan aset menurut tanggal pengerjaan.": "Total asset maintenance cost by work date.",

  // --- Kesehatan ---
  "Penugasan kerja terbatas aktif": "Active restricted duty assignments",
  "Pekerja yang sedang menjalani pembatasan tugas karena alasan kesehatan.":
    "Workers currently on duty restrictions for health reasons.",

  // --- Eksekutif ---
  "Jam kerja": "Man-hours",
  "Total jam kerja pada periode terpilih. Pembagi bagi LTIFR dan TRIR.":
    "Total man-hours in the selected period. The denominator for LTIFR and TRIR.",
  "Tren jam kerja": "Man-hours trend",
  "Jam kerja per bulan.": "Man-hours per month.",
  "Tenaga kerja rata-rata": "Average manpower",
  "Rata-rata jumlah pekerja per bulan pada periode terpilih.":
    "Average number of workers per month in the selected period.",
  LTIFR: "LTIFR",
  "Kecelakaan hilang hari kerja per satu juta jam kerja. Kosong bila jam kerja periode itu belum diisi.":
    "Lost time injuries per one million man-hours. Empty when man-hours for that period have not been entered.",
  TRIR: "TRIR",
  "Kasus tercatat (cedera medis, kerja terbatas, hilang hari kerja, fatal) per satu juta jam kerja.":
    "Recordable cases (medical treatment, restricted work, lost time, fatality) per one million man-hours.",
  "Jam kerja aman tanpa LTI": "Safe man-hours without LTI",
  "Jam kerja sejak kecelakaan hilang hari kerja terakhir.": "Man-hours since the last lost time injury.",
  "Kecelakaan fatal": "Fatalities",
  "Jumlah kejadian fatal pada periode terpilih. Sasarannya selalu nol.":
    "Fatal events in the selected period. The target is always zero.",
  "Leading indicator": "Leading indicators",
  "Cacah kegiatan pencegahan pada periode terpilih. Jam pelatihan dihitung terpisah.":
    "Count of preventive activities in the selected period. Training hours are counted separately.",
  "Jam pelatihan": "Training hours",
  "Total jam pelatihan K3 yang terselenggara pada periode terpilih.":
    "Total OHS training hours delivered in the selected period.",
  "Tindakan vs kondisi tidak aman": "Unsafe acts vs unsafe conditions",
  "Hasil observasi keselamatan, dipisah antara perilaku dan keadaan.":
    "Safety observation results, split between behaviour and physical conditions.",
  "Tren observasi tidak aman": "Unsafe observation trend",
  "Tindakan dan kondisi tidak aman yang tercatat per bulan.": "Unsafe acts and conditions recorded per month.",
  "Tren toolbox talk": "Toolbox talk trend",
  "Jumlah toolbox talk yang terselenggara per bulan.": "Toolbox talks delivered per month.",

  // --- Pelatihan ---
  "Pencapaian program pelatihan": "Training programme achievement",
  "Sesi pelatihan yang terlaksana dibanding sesi yang direncanakan pada tahun anggaran berjalan.":
    "Training sessions delivered against sessions planned for the current fiscal year.",
  "Jam-orang pelatihan terealisasi": "Training person-hours delivered",
  "Jumlah peserta hadir dikali durasi tiap sesi yang selesai pada periode terpilih.":
    "Participants attended multiplied by duration, for each session completed in the selected period.",
  "Realisasi pelatihan per jenis": "Training delivery by type",
  "Sesi yang selesai, dipisah menurut jenis pelatihannya.": "Completed sessions, split by training type.",
  "Keefektifan pelatihan": "Training effectiveness",
  "Penilaian keefektifan sesi yang sudah dievaluasi — ISO 45001 klausul 7.2 d).":
    "Effectiveness rating of evaluated sessions — ISO 45001 clause 7.2 d).",
  "Tren jam-orang pelatihan": "Training person-hours trend",
  "Jam-orang pelatihan yang terealisasi per bulan.": "Training person-hours delivered per month.",
  "Program pelatihan per status": "Training programmes by status",
  "Posisi seluruh program pada tahun anggaran berjalan — termasuk yang ditunda dan dibatalkan.":
    "Where every programme sits in the current fiscal year — including deferred and cancelled ones.",
  "Pelatihan wajib belum terlaksana": "Mandatory training not delivered",
  "Program yang diwajibkan peraturan dan belum punya satu pun sesi selesai tahun ini.":
    "Programmes required by regulation with no completed session this year.",
  "Sertifikat pelatihan akan kedaluwarsa": "Training certificates expiring",
  "Sertifikat peserta yang masa berlakunya habis dalam 90 hari ke depan, atau sudah lewat.":
    "Participant certificates expiring within the next 90 days, or already expired.",
};

/** Menukar teks katalog ke bahasa yang sedang dipakai; yang tidak ada di
 *  kamus dikembalikan apa adanya. */
export function metrikLokal(text: string | undefined, locale: "id" | "en"): string | undefined {
  if (text === undefined || locale !== "en") return text;
  return KAMUS_METRIK[text] ?? text;
}
