// Modul 25 — kotak masuk notifikasi.
//
// Notifikasi dibuat untuk BEBERAPA pengguna, bukan hanya akun yang dipakai
// saat presentasi. Kotak masuk hanya menampilkan milik pengguna yang sedang
// masuk, jadi kalau semuanya ditujukan ke satu akun, berpindah identitas
// saat demo akan memperlihatkan halaman kosong dan terbaca sebagai kerusakan.
//
// Sebagian besar yang lama sudah dibaca dan yang baru belum — itulah yang
// membuat lencana jumlah belum-dibaca berisi angka yang masuk akal alih-alih
// nol atau seluruh isi kotak masuk.
const { uuidFor, upsert, seededRandom, intBetween, daysAgo } = require("./lib");
const { actor } = require("./foundation");

const TEMPLATES = [
  ["WORK_PERMIT_PENDING_APPROVAL", "work_permits", "HIGH", "Izin kerja menunggu persetujuan Anda", "PTW/HOT/2026/0037 — Pengelasan sambungan pipa 6\" jalur inlet separator V-101 menunggu persetujuan HSE sebelum pekerjaan dimulai besok pagi."],
  ["WORK_PERMIT_EXPIRING", "work_permits", "MEDIUM", "Izin kerja akan berakhir dalam 2 jam", "PTW/CSE/2026/0041 — Pembersihan endapan lumpur dalam tangki T-101 akan berakhir pukul 17.00. Ajukan perpanjangan bila pekerjaan belum selesai."],
  ["INCIDENT_REPORTED", "incident_reports", "CRITICAL", "Insiden baru dilaporkan di Terminal Balikpapan", "INC/2026/0021 — Jatuh dari ketinggian 2,5 meter saat pemasangan scaffolding. Klasifikasi awal: Lost Time Injury. Investigasi wajib dimulai dalam 24 jam."],
  ["INCIDENT_INVESTIGATION_DUE", "incident_reports", "HIGH", "Batas waktu investigasi insiden tinggal 2 hari", "INC/2026/0024 — Tumpahan minyak mentah 200 liter. Laporan investigasi harus diserahkan paling lambat akhir pekan ini."],
  ["CAPA_OVERDUE", "capa_register", "HIGH", "CAPA melewati target penutupan", "CAPA/2026/0005 — Tindakan perbaikan pasca jatuh dari ketinggian sudah melewati target penutupan. Mohon perbarui status pelaksanaan."],
  ["CAPA_EFFECTIVENESS_DUE", "capa_register", "MEDIUM", "Verifikasi efektivitas CAPA jatuh tempo", "CAPA/2026/0002 — Penutupan ketidaksesuaian mayor kompetensi operator ruang terbatas siap diverifikasi efektivitasnya."],
  ["AUDIT_FINDING_ASSIGNED", "audit_findings", "HIGH", "Temuan audit ditugaskan kepada Anda", "AUD/2026/007/F01 — Ketidaksesuaian mayor terkait kompetensi operator ruang terbatas memerlukan CAPA dalam 7 hari kerja."],
  ["AUDIT_SCHEDULED", "audits", "LOW", "Audit internal dijadwalkan bulan depan", "AUD/2026/010 — Audit eksternal sertifikasi ISO 45001 dijadwalkan di kantor pusat. Siapkan dokumen sistem manajemen."],
  ["INSPECTION_OVERDUE", "inspection_records", "MEDIUM", "Inspeksi terjadwal terlambat dikerjakan", "INS/FIR/2026/0033 — Inspeksi sarana proteksi kebakaran melewati tanggal rencana dan belum ada realisasi."],
  ["INSPECTION_FAILED", "inspection_records", "HIGH", "Hasil inspeksi tidak memenuhi ambang", "INS/HKP/2026/0026 — Inspeksi housekeeping mendapat skor 68 dari ambang minimum 75. Tindak lanjut diperlukan."],
  ["DOCUMENT_REVIEW_DUE", "documents", "MEDIUM", "Dokumen mendekati jatuh tempo tinjauan", "DOC/SOP/2026/009 — SOP Pengelolaan Limbah B3 di TPS akan jatuh tempo tinjauan dalam 30 hari."],
  ["DOCUMENT_PUBLISHED", "documents", "LOW", "Dokumen baru diterbitkan dan wajib dibaca", "DOC/POL/2026/020 — Kebijakan Stop Work Authority telah diterbitkan. Konfirmasi pembacaan diperlukan dalam 14 hari."],
  ["CALIBRATION_DUE", "calibration_items", "MEDIUM", "Kalibrasi alat ukur jatuh tempo", "CAL-0002/LAJ-2 — Flow meter custody transfer jatuh tempo kalibrasi bulan ini. Jadwalkan dengan penyedia terakreditasi."],
  ["CALIBRATION_OUT_OF_TOLERANCE", "calibration_items", "HIGH", "Hasil kalibrasi di luar toleransi", "CAL-0001/TEK-1 — Pressure transmitter menyimpang 4,2% dari batas toleransi. CAPA otomatis dibuat."],
  ["LICENSE_EXPIRING", "regulatory_register", "HIGH", "Izin lingkungan mendekati masa berakhir", "Izin penyimpanan sementara limbah B3 akan berakhir dalam 45 hari. Proses perpanjangan perlu segera dimulai."],
  ["EMERGENCY_PLAN_REVIEW_OVERDUE", "emergency_response_plans", "MEDIUM", "Rencana tanggap darurat lewat jatuh tempo tinjauan", "ERP/2026/003 — Rencana Tanggap Darurat Tumpahan Minyak ke Perairan sudah melewati jadwal tinjauan berkala."],
  ["CONTRACTOR_DOCUMENT_EXPIRED", "contractors", "HIGH", "Dokumen kepatuhan kontraktor kedaluwarsa", "PT Baja Perkasa Enjiniring — Sertifikat CSMS telah kedaluwarsa. Penerbitan izin kerja baru untuk kontraktor ini diblokir."],
  ["CONTRACTOR_EVALUATION_DUE", "contractors", "LOW", "Evaluasi kinerja kontraktor jatuh tempo", "PT Andalan Logistik Samudra — Evaluasi kinerja periode berjalan belum diisi oleh pemilik kontrak."],
  ["ENVIRONMENTAL_LIMIT_EXCEEDED", "environmental_aspects_impacts", "CRITICAL", "Hasil pemantauan melampaui baku mutu", "Kadar COD air limbah pada titik pembuangan melampaui baku mutu dua bulan berturut-turut. Tindakan segera diperlukan."],
  ["RESTRICTED_DUTY_ENDING", "restricted_duty_assignments", "LOW", "Masa penugasan kerja terbatas segera berakhir", "Penugasan kerja terbatas atas nama Eko Prasetyo berakhir pekan depan. Penilaian ulang kelayakan kerja diperlukan."],
  ["NCR_DISPOSITION_PENDING", "ncr_records", "MEDIUM", "NCR menunggu keputusan disposisi", "NCR/2026/0007 — Ketidaksesuaian ketebalan dinding pipa menunggu keputusan disposisi dari Quality Manager."],
  ["HIRA_REVIEW_DUE", "hira_assessments", "MEDIUM", "HIRA jatuh tempo peninjauan", "HIRA/CEPU/2026/006 — Penilaian risiko pemeliharaan berkala pompa transfer jatuh tempo ditinjau ulang."],
];

async function seedNotifications(client, ctx) {
  const random = seededRandom("notifications");
  // Empat penerima yang paling mungkin dipakai saat demo. Akun admin tenant
  // menerima seluruh jenis notifikasi karena itulah akun yang dipakai untuk
  // berkeliling seluruh modul.
  const recipients = [
    actor(ctx, "TENANT_ADMIN"),
    actor(ctx, "HSE_MANAGER"),
    actor(ctx, "HSE_OFFICER"),
    actor(ctx, "QUALITY_MANAGER"),
  ];

  let created = 0;
  for (const recipient of recipients) {
    const isAdmin = recipient.roleCode === "TENANT_ADMIN";
    const templates = isAdmin ? TEMPLATES : TEMPLATES.filter((_, index) => index % 3 === recipients.indexOf(recipient) % 3);

    let index = 0;
    for (const [eventType, entityType, priority, title, body] of templates) {
      index += 1;
      created += 1;
      const key = `${recipient.key}:${eventType}:${index}`;
      const ageDays = intBetween(random, 0, 45);
      // Yang berumur lebih dari sepekan dianggap sudah dibaca, kecuali yang
      // berprioritas kritis — pola yang sama dengan kotak masuk sungguhan.
      const isRead = ageDays > 7 && priority !== "CRITICAL";
      const createdAt = daysAgo(ageDays);

      await upsert(
        client,
        "notifications",
        "notification_id",
        {
          notification_id: uuidFor("notification", key),
          recipient_user_id: recipient.id,
          event_type: eventType,
          entity_type: entityType,
          entity_id: uuidFor("notification-entity", key),
          title,
          body,
          priority,
          is_read: isRead,
          read_at: isRead ? daysAgo(ageDays - 1) : null,
          created_at: createdAt,
        },
        { tenant_id: ctx.tenantId },
      );
    }
  }

  return { notifications: created };
}

module.exports = { seedNotifications };
