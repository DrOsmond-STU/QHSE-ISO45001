// Modul 07 Insiden, Modul 08 Inspeksi, Modul 09 Audit, Modul 10 CAPA,
// Modul 11 NCR Mutu.
//
// Kelima modul ini yang paling sering dibuka saat presentasi, karena di
// sinilah rantai sebab-akibat antar modul terlihat: temuan audit melahirkan
// CAPA, insiden melahirkan CAPA, NCR melahirkan CAPA. Nomor CAPA yang
// dirujuk di deskripsi temuan memang ada sebagai baris CAPA — bukan teks
// hiasan — sehingga presenter bisa berpindah dari satu modul ke modul lain
// dan menemukan yang dijanjikannya.
//
// Piramida keselamatan dipertahankan bentuknya: banyak nyaris-celaka,
// sedikit pertolongan pertama, satu kasus hilang hari kerja, dan tidak ada
// kematian. Data demo yang isinya sepuluh kecelakaan berat berturut-turut
// bukan gambaran perusahaan mana pun yang masih beroperasi.
const { uuidFor, upsert, seededRandom, pick, intBetween, dateOnly, daysAgo, daysFromNow } = require("./lib");
const { actor, actors } = require("./foundation");

const INCIDENTS = [
  ["NEAR_MISS", "LOW", "Kunci pas terjatuh dari lantai 2 struktur separator, tidak ada pekerja di bawah", "cepu", 0],
  ["NEAR_MISS", "LOW", "Forklift hampir menabrak pejalan kaki di jalur gudang material", "bpn", 0],
  ["NEAR_MISS", "MEDIUM", "Terdeteksi kebocoran gas kecil pada flange line 4 inci saat patroli malam", "cepu", 0],
  ["NEAR_MISS", "LOW", "Pekerja naik tangga tanpa memegang pegangan saat membawa material", "bpn", 0],
  ["NEAR_MISS", "MEDIUM", "Selang hidran ditemukan tidak tersambung saat inspeksi mendadak", "bpn", 0],
  ["NEAR_MISS", "LOW", "Kabel las melintang di jalur lalu lintas kendaraan area workshop", "cepu", 0],
  ["NEAR_MISS", "MEDIUM", "Alarm gas detector berbunyi akibat purging tidak sempurna sebelum hot work", "cepu", 0],
  ["NEAR_MISS", "LOW", "Palet material tersusun melebihi batas tinggi aman di gudang", "bpn", 0],
  ["NEAR_MISS", "LOW", "Genangan oli di lantai rumah pompa belum dibersihkan setelah pemeliharaan", "bpn", 0],
  ["NEAR_MISS", "MEDIUM", "Scaffolding tanpa tag inspeksi ditemukan sudah digunakan pekerja", "bpn", 0],
  ["NEAR_MISS", "LOW", "Tabung APAR di area wellpad ditemukan tekanan di bawah zona hijau", "cepu", 0],
  ["NEAR_MISS", "MEDIUM", "Kendaraan operasional melaju melebihi batas kecepatan area terbatas", "cepu", 0],
  ["FIRST_AID", "LOW", "Jari tangan tergores pelat saat memindahkan material di workshop", "cepu", 0],
  ["FIRST_AID", "LOW", "Mata terkena debu gerinda meski memakai safety glasses tanpa side shield", "bpn", 0],
  ["FIRST_AID", "LOW", "Terpeleset di tangga rumah pompa, memar ringan pada lutut", "bpn", 0],
  ["FIRST_AID", "MEDIUM", "Luka bakar ringan akibat percikan las pada lengan kiri", "cepu", 0],
  ["FIRST_AID", "LOW", "Kulit tangan iritasi setelah kontak dengan bahan kimia demulsifier", "cepu", 0],
  ["MEDICAL_TREATMENT", "MEDIUM", "Terkilir pergelangan kaki saat menuruni tangga platform separator", "cepu", 0],
  ["MEDICAL_TREATMENT", "MEDIUM", "Luka sobek pada lengan akibat sudut pelat tajam, memerlukan jahitan", "bpn", 0],
  ["RESTRICTED_WORK_CASE", "HIGH", "Cedera punggung saat mengangkat katup secara manual tanpa alat bantu", "bpn", 0],
  ["LOST_TIME_INJURY", "HIGH", "Jatuh dari ketinggian 2,5 meter saat pemasangan scaffolding, patah tulang lengan", "bpn", 21],
  ["PROPERTY_DAMAGE", "MEDIUM", "Benturan mobile crane pada pipa rack menyebabkan penyok pada support", "bpn", 0],
  ["PROPERTY_DAMAGE", "MEDIUM", "Pompa transfer P-201A rusak akibat kavitasi berkepanjangan", "bpn", 0],
  ["ENVIRONMENTAL_SPILL", "HIGH", "Tumpahan minyak mentah 200 liter dari flange bocor ke area berpaving", "cepu", 0],
  ["ENVIRONMENTAL_SPILL", "MEDIUM", "Ceceran oli bekas dari drum penyimpanan sementara di TPS", "bpn", 0],
  ["PROCESS_SAFETY_EVENT", "HIGH", "Katup pengaman PSV-210 membuka akibat lonjakan tekanan pada vessel", "bpn", 0],
  ["NEAR_MISS", "LOW", "Rambu peringatan area penggalian tertutup material timbunan", "cepu", 0],
  ["NEAR_MISS", "LOW", "Pintu darurat gedung kantor terhalang lemari arsip", "hq", 0],
];

const INCIDENT_STATUSES = ["CLOSED", "CLOSED", "CLOSED", "CLOSED", "INVESTIGATION_COMPLETED", "UNDER_INVESTIGATION", "UNDER_VERIFICATION", "REPORTED"];

const CAPAS = [
  ["AUDIT_FINDING", "CORRECTIVE", "HIGH", "Perbaikan pengendalian dokumen kedaluwarsa di area produksi", "Ditemukan 7 salinan SOP versi lama masih beredar di ruang kontrol Cepu, sementara versi berlaku sudah direvisi delapan bulan sebelumnya."],
  ["AUDIT_FINDING", "CORRECTIVE", "CRITICAL", "Penutupan ketidaksesuaian mayor kompetensi operator ruang terbatas", "Tiga operator yang ditugaskan sebagai entry supervisor ruang terbatas tidak memiliki sertifikat kompetensi yang masih berlaku."],
  ["AUDIT_FINDING", "CORRECTIVE", "MEDIUM", "Kelengkapan rekaman inspeksi alat angkat semester pertama", "Rekaman inspeksi bulanan untuk 4 dari 11 alat angkat tidak dapat ditunjukkan saat audit internal."],
  ["AUDIT_FINDING", "PREVENTIVE", "MEDIUM", "Penguatan proses tinjauan manajemen agar terjadwal dua kali setahun", "Tinjauan manajemen hanya terlaksana satu kali dalam periode audit, sementara prosedur mensyaratkan dua kali."],
  ["INCIDENT", "CORRECTIVE", "CRITICAL", "Tindakan perbaikan pasca jatuh dari ketinggian saat pemasangan scaffolding", "Pekerja jatuh dari ketinggian 2,5 meter karena scaffolding belum lengkap dan pengait harness ditambatkan pada struktur yang tidak memenuhi syarat."],
  ["INCIDENT", "CORRECTIVE", "HIGH", "Perbaikan integritas flange jalur produksi setelah tumpahan minyak", "Tumpahan 200 liter minyak mentah akibat kegagalan gasket flange yang sudah melewati umur pakai."],
  ["INCIDENT", "CORRECTIVE", "HIGH", "Pencegahan berulangnya lonjakan tekanan pada vessel V-220", "Katup pengaman membuka akibat gangguan pengendalian tekanan hulu yang tidak terdeteksi lebih awal."],
  ["INCIDENT", "CORRECTIVE", "MEDIUM", "Penyediaan alat bantu angkat untuk penggantian katup", "Cedera punggung terjadi karena katup 60 kg diangkat manual oleh dua pekerja tanpa alat bantu."],
  ["INCIDENT", "PREVENTIVE", "MEDIUM", "Penguatan pengendalian lalu lintas forklift di area gudang", "Nyaris celaka berulang antara forklift dan pejalan kaki karena jalur pemisah belum ditandai jelas."],
  ["INSPECTION_FINDING", "CORRECTIVE", "MEDIUM", "Pemulihan tekanan APAR di seluruh area wellpad", "Inspeksi menemukan 6 APAR dengan tekanan di bawah zona hijau pada tiga wellpad berbeda."],
  ["INSPECTION_FINDING", "CORRECTIVE", "LOW", "Perbaikan housekeeping rumah pompa Terminal Balikpapan", "Genangan oli dan material tidak tertata ditemukan berulang pada tiga inspeksi berturut-turut."],
  ["INSPECTION_FINDING", "CORRECTIVE", "MEDIUM", "Pemasangan tag inspeksi scaffolding yang konsisten", "Ditemukan scaffolding yang sudah digunakan tanpa tag inspeksi yang sah."],
  ["QUALITY_NCR", "CORRECTIVE", "MEDIUM", "Perbaikan proses penerimaan material pipa dari pemasok", "Material pipa yang diterima tidak disertai sertifikat mill yang sesuai spesifikasi pengadaan."],
  ["QUALITY_NCR", "CORRECTIVE", "HIGH", "Penanganan hasil pengelasan yang gagal uji radiografi", "Dua sambungan las pada proyek perluasan tangki gagal uji radiografi dan harus dipotong ulang."],
  ["COMPLIANCE", "CORRECTIVE", "HIGH", "Pembaruan izin penyimpanan sementara limbah B3", "Izin TPS limbah B3 mendekati masa berakhir sementara proses perpanjangan belum dimulai."],
  ["COMPLIANCE", "PREVENTIVE", "MEDIUM", "Penyesuaian pemantauan emisi terhadap PermenLHK terbaru", "Parameter pemantauan emisi belum sepenuhnya mengikuti ketentuan peraturan yang berlaku sejak tahun lalu."],
  ["ENVIRONMENTAL_MONITORING", "CORRECTIVE", "HIGH", "Penurunan kadar COD air limbah sebelum titik pembuangan", "Hasil pemantauan bulanan menunjukkan COD melampaui baku mutu pada dua bulan berturut-turut."],
  ["CALIBRATION_OOT", "CORRECTIVE", "MEDIUM", "Penelusuran dampak alat ukur tekanan di luar toleransi", "Kalibrasi menunjukkan pressure gauge PG-1042 menyimpang 4,2% dari batas toleransi yang diizinkan."],
  ["RISK", "PREVENTIVE", "HIGH", "Pengendalian tambahan risiko paparan H2S di wellpad", "Penilaian risiko menunjukkan sisa risiko masih tinggi meski pengendalian administratif sudah diterapkan."],
  ["MANAGEMENT_REVIEW", "PREVENTIVE", "MEDIUM", "Peningkatan tingkat pelaporan nyaris celaka oleh pekerja lapangan", "Tinjauan manajemen menilai rasio pelaporan nyaris celaka masih di bawah sasaran tahunan."],
  ["CUSTOMER_COMPLAINT", "CORRECTIVE", "MEDIUM", "Perbaikan ketepatan waktu pengiriman produk ke pelanggan", "Pelanggan menyampaikan keluhan atas keterlambatan pengiriman dua kali dalam satu kuartal."],
  ["OTHER", "CORRECTIVE", "LOW", "Pemutakhiran papan informasi K3 seluruh area kerja", "Papan informasi K3 di tiga area memuat data statistik yang sudah tidak berlaku."],
];

const CAPA_STATUSES = [
  "EFFECTIVE_CLOSED",
  "EFFECTIVE_CLOSED",
  "IN_PROGRESS",
  "PENDING_EFFECTIVENESS_VERIFICATION",
  "ACTION_PLAN_DEFINED",
  "ROOT_CAUSE_ANALYSIS",
  "PENDING_APPROVAL",
  "DRAFT",
  "NOT_EFFECTIVE_REOPENED",
];

const NCRS = [
  ["INTERNAL", "MAJOR", "Sambungan las gagal uji radiografi pada proyek perluasan tangki", "IN_PROCESS", "REWORK", 2, "sambungan"],
  ["SUPPLIER", "MAJOR", "Material pipa diterima tanpa sertifikat mill sesuai spesifikasi", "INCOMING", "RETURN_TO_SUPPLIER", 48, "batang"],
  ["INTERNAL", "MINOR", "Ketidaksesuaian dimensi flange pada fabrikasi spool", "IN_PROCESS", "REWORK", 4, "unit"],
  ["CUSTOMER", "MAJOR", "Keluhan pelanggan atas kadar air produk melebihi spesifikasi", "POST_DELIVERY", "REGRADE", 120, "kiloliter"],
  ["SUPPLIER", "MINOR", "Kemasan bahan kimia demulsifier rusak saat penerimaan", "INCOMING", "RETURN_TO_SUPPLIER", 6, "drum"],
  ["INTERNAL", "MINOR", "Penyimpangan hasil uji tekanan hidrostatik di bawah ambang", "FINAL", "REPAIR", 1, "unit"],
  ["INTERNAL", "CRITICAL", "Ketidaksesuaian ketebalan dinding pipa hasil pemeriksaan ultrasonik", "IN_PROCESS", "SCRAP", 3, "batang"],
  ["AUDIT_FINDING", "MAJOR", "Rekaman kalibrasi alat uji tidak lengkap saat audit mutu", "AUDIT_FINDING", "USE_AS_IS", 1, "lot"],
  ["INTERNAL", "MINOR", "Label identifikasi material tidak terpasang pada rak penyimpanan", "IN_PROCESS", "USE_AS_IS", 15, "batang"],
  ["SUPPLIER", "MINOR", "Keterlambatan pengiriman katup mengakibatkan penundaan pekerjaan", "INCOMING", "USE_AS_IS", 8, "unit"],
  ["INTERNAL", "MAJOR", "Hasil uji kekerasan material di luar rentang yang dipersyaratkan", "IN_PROCESS", "SCRAP", 2, "unit"],
  ["CUSTOMER", "MINOR", "Dokumen pengiriman tidak lengkap saat serah terima produk", "POST_DELIVERY", "USE_AS_IS", 1, "lot"],
  ["INTERNAL", "MINOR", "Cat pelindung struktur tidak mencapai ketebalan minimum", "FINAL", "REWORK", 30, "meter persegi"],
  ["SUPPLIER", "MAJOR", "Gasket yang dikirim tidak sesuai kelas tekanan pesanan", "INCOMING", "RETURN_TO_SUPPLIER", 24, "unit"],
  ["INTERNAL", "MINOR", "Penyimpangan torsi pengencangan baut flange dari nilai standar", "IN_PROCESS", "REPAIR", 12, "sambungan"],
  ["INTERNAL", "MINOR", "Hasil kalibrasi flow meter menyimpang tipis dari batas toleransi", "FINAL", "REPAIR", 1, "unit"],
  ["CUSTOMER", "CRITICAL", "Klaim pelanggan atas kontaminasi produk pada satu kompartemen", "POST_DELIVERY", "SCRAP", 45, "kiloliter"],
  ["INTERNAL", "MINOR", "Ketidaksesuaian penandaan arah aliran pada perpipaan baru", "FINAL", "REWORK", 20, "titik"],
];

const AUDITS = [
  ["IA-SMK3", "iso45001", "cepu", "CLOSED", -300, 4],
  ["IA-SMK3", "iso45001", "bpn", "CLOSED", -240, 4],
  ["IA-9001", "iso9001", "hq", "CLOSED", -200, 3],
  ["IA-14001", "iso14001", "cepu", "CLOSED", -170, 3],
  ["EA-CERT", "iso45001", "bpn", "CLOSED", -130, 5],
  ["VEND", "pp50", "cepu", "CLOSED", -95, 2],
  ["IA-SMK3", "pp50", "cepu", "PENDING_CAPA_CLOSURE", -45, 4],
  ["IA-9001", "iso9001", "bpn", "REPORT_DRAFTED", -20, 3],
  ["IA-14001", "iso14001", "bpn", "IN_PROGRESS", -2, 3],
  ["EA-CERT", "iso45001", "hq", "PLANNED", 35, 5],
];

const FINDING_TEXTS = [
  ["MAJOR_NC", "Tiga operator entry supervisor ruang terbatas tidak memiliki sertifikat kompetensi yang masih berlaku, sementara prosedur mensyaratkan sertifikasi diperbarui setiap dua tahun."],
  ["MAJOR_NC", "Salinan SOP versi lama masih beredar dan digunakan di ruang kontrol, sementara versi berlaku sudah direvisi delapan bulan sebelumnya."],
  ["MINOR_NC", "Rekaman inspeksi bulanan alat angkat tidak lengkap untuk periode empat bulan terakhir."],
  ["MINOR_NC", "Bukti komunikasi hasil tinjauan manajemen kepada seluruh lini belum terdokumentasi."],
  ["MINOR_NC", "Sebagian pekerja belum menandatangani bukti sosialisasi kebijakan K3 versi terbaru."],
  ["MINOR_NC", "Jadwal pemantauan lingkungan tidak seluruhnya sesuai frekuensi yang dipersyaratkan izin."],
  ["OBSERVATION", "Papan informasi K3 memuat statistik kecelakaan yang belum dimutakhirkan pada dua area kerja."],
  ["OBSERVATION", "Penataan bahan kimia di gudang belum sepenuhnya mengikuti matriks inkompatibilitas."],
  ["OBSERVATION", "Beberapa rambu evakuasi memudar dan sulit dibaca dari jarak lebih dari lima meter."],
  ["OFI", "Pelaporan nyaris celaka dapat ditingkatkan dengan menyediakan kanal pelaporan lewat telepon genggam."],
  ["OFI", "Analisis tren temuan inspeksi dapat dijadwalkan bulanan agar pola berulang lebih cepat terlihat."],
  ["OFI", "Pelatihan penyegaran tanggap darurat dapat ditambah simulasi malam hari."],
];

async function seedEvents(client, ctx, ref) {
  const random = seededRandom("events");
  const hseManager = actor(ctx, "HSE_MANAGER");
  const qualityManager = actor(ctx, "QUALITY_MANAGER");
  const qcInspector = actor(ctx, "QC_INSPECTOR");
  const internalAuditor = actor(ctx, "AUDITOR_INTERNAL");
  const externalAuditor = actor(ctx, "AUDITOR_EXTERNAL");
  const hseOfficers = actors(ctx, "HSE_OFFICER");
  const supervisors = actors(ctx, "SUPERVISOR");
  const workers = actors(ctx, "WORKER_EMPLOYEE");
  const siteOf = (key) => ctx.siteIds[key];
  const deptOf = (key) => (key === "cepu" ? ctx.deptIds.ops : key === "bpn" ? ctx.deptIds.mtc : ctx.deptIds.hse);

  // --- Modul 07: insiden ---
  let incidentSequence = 0;
  for (const [classification, severity, description, siteKey, daysLost] of INCIDENTS) {
    incidentSequence += 1;
    const number = `INC/2026/${String(incidentSequence).padStart(4, "0")}`;
    const occurredDaysAgo = intBetween(random, 3, 330);
    const status = INCIDENT_STATUSES[incidentSequence % INCIDENT_STATUSES.length];
    const when = daysAgo(occurredDaysAgo);
    when.setHours(intBetween(random, 6, 22), intBetween(random, 0, 59), 0, 0);

    await upsert(
      client,
      "incident_reports",
      "incident_report_id",
      {
        incident_report_id: uuidFor("incident", number),
        incident_number: number,
        company_id: ctx.companyId,
        site_id: siteOf(siteKey),
        department_id: deptOf(siteKey),
        classification,
        initial_classification: classification === "LOST_TIME_INJURY" ? "MEDICAL_TREATMENT" : classification,
        severity_level: severity,
        incident_datetime: when,
        description,
        location_detail: siteKey === "cepu" ? "Stasiun Pengumpul Menggung" : siteKey === "bpn" ? "Area Tangki Timbun Terminal" : "Gedung Kantor Pusat",
        reported_by: pick(random, [...workers, ...supervisors]).id,
        status,
        days_lost: daysLost || null,
      },
      ctx.audit,
    );
  }

  // --- Modul 10: CAPA ---
  let capaSequence = 0;
  const capaNumbers = [];
  for (const [sourceType, category, priority, title, problem] of CAPAS) {
    capaSequence += 1;
    const number = `CAPA/2026/${String(capaSequence).padStart(4, "0")}`;
    capaNumbers.push(number);
    const status = CAPA_STATUSES[capaSequence % CAPA_STATUSES.length];
    const initiatedDaysAgo = intBetween(random, 10, 300);
    // Target penutupan dihitung dari tanggal mulai, jadi sebagian CAPA yang
    // masih terbuka memang sudah lewat targetnya — itu yang membuat modul ini
    // ada gunanya untuk ditampilkan.
    const targetClosure = daysFromNow(intBetween(random, 20, 90) - initiatedDaysAgo);
    const closed = status === "EFFECTIVE_CLOSED";

    await upsert(
      client,
      "capa_register",
      "capa_register_id",
      {
        capa_register_id: uuidFor("capa", number),
        capa_number: number,
        source_type: sourceType,
        category,
        priority,
        title,
        problem_statement: problem,
        company_id: ctx.companyId,
        site_id: siteOf(capaSequence % 3 === 0 ? "bpn" : capaSequence % 3 === 1 ? "cepu" : "hq"),
        department_id: deptOf(capaSequence % 2 === 0 ? "cepu" : "bpn"),
        initiated_by: pick(random, [hseManager, qualityManager, ...hseOfficers]).id,
        initiated_at: daysAgo(initiatedDaysAgo),
        status,
        target_closure_date: dateOnly(targetClosure),
        actual_closure_date: closed ? dateOnly(daysAgo(intBetween(random, 1, 40))) : null,
        assigned_to: pick(random, [...supervisors, ...hseOfficers]).id,
      },
      ctx.audit,
    );
  }

  // --- Modul 08: catatan inspeksi ---
  const INSPECTION_TYPE_CODES = ["HKP", "APD", "FIR", "LIF", "ENV"];
  const INSPECTION_SITES = ["cepu", "bpn", "cepu", "bpn", "hq"];
  let inspectionSequence = 0;
  for (let week = 0; week < 9; week++) {
    for (let index = 0; index < 5; index++) {
      inspectionSequence += 1;
      const typeCode = INSPECTION_TYPE_CODES[index];
      const siteKey = INSPECTION_SITES[index];
      const number = `INS/${typeCode}/2026/${String(inspectionSequence).padStart(4, "0")}`;
      const plannedDaysAgo = week * 14 + index - 6;

      // Yang jadwalnya belum tiba tetap SCHEDULED; yang sudah lewat lebih
      // dari sepekan tanpa dikerjakan menjadi OVERDUE. Aturan sederhana ini
      // membuat kolom status konsisten dengan kolom tanggal — ketidakcocokan
      // di antara keduanya adalah hal pertama yang ditangkap penonton yang
      // paham pekerjaannya.
      let status;
      let overallResult = null;
      let overallScore = null;
      if (plannedDaysAgo < 0) status = "SCHEDULED";
      else if (plannedDaysAgo <= 7 && inspectionSequence % 7 === 0) status = "IN_PROGRESS";
      else if (inspectionSequence % 11 === 0) status = "OVERDUE";
      else {
        status = "COMPLETED";
        overallScore = intBetween(random, 62, 99);
        overallResult = overallScore >= 75 ? "PASS" : "FAIL";
      }

      await upsert(
        client,
        "inspection_records",
        "inspection_record_id",
        {
          inspection_record_id: uuidFor("inspection", number),
          inspection_record_number: number,
          inspection_checklist_template_id: ref.checklistTemplates[typeCode],
          company_id: ctx.companyId,
          site_id: siteOf(siteKey),
          department_id: deptOf(siteKey),
          inspector_id: pick(random, [...hseOfficers, qcInspector]).id,
          status,
          planned_date: dateOnly(daysAgo(plannedDaysAgo)),
          actual_date: status === "COMPLETED" ? daysAgo(plannedDaysAgo - 0.2) : null,
          overall_result: overallResult,
          overall_score: overallScore,
        },
        ctx.audit,
      );
    }
  }

  // --- Modul 09: audit dan temuannya ---
  let auditSequence = 0;
  let findingSequence = 0;
  for (const [typeCode, checklistKey, siteKey, status, startOffset, durationDays] of AUDITS) {
    auditSequence += 1;
    const number = `AUD/2026/${String(auditSequence).padStart(3, "0")}`;
    const plannedStart = daysAgo(-startOffset);
    const plannedEnd = daysAgo(-startOffset - durationDays);
    const isExternal = typeCode === "EA-CERT";
    const started = status !== "PLANNED";
    const finished = ["CLOSED", "REPORT_APPROVED", "REPORT_DRAFTED", "PENDING_CAPA_CLOSURE"].includes(status);

    const auditId = await upsert(
      client,
      "audits",
      "audit_id",
      {
        audit_id: uuidFor("audit", number),
        audit_number: number,
        audit_type_id: ref.auditTypes[typeCode],
        audit_checklist_id: ref.auditChecklists[checklistKey],
        company_id: ctx.companyId,
        site_id: siteOf(siteKey),
        lead_auditor_id: isExternal ? externalAuditor.id : internalAuditor.id,
        status,
        planned_start_date: dateOnly(plannedStart),
        planned_end_date: dateOnly(plannedEnd),
        actual_start_date: started ? dateOnly(plannedStart) : null,
        actual_end_date: finished ? dateOnly(plannedEnd) : null,
      },
      ctx.audit,
    );

    if (!started) continue;

    // Temuan per audit: cukup untuk menunjukkan sebaran klasifikasi tanpa
    // membuat halaman detail jadi dinding teks.
    const findingCount = status === "IN_PROGRESS" ? 2 : intBetween(random, 3, 5);
    for (let index = 0; index < findingCount; index++) {
      findingSequence += 1;
      const [classification, description] = FINDING_TEXTS[(findingSequence + index) % FINDING_TEXTS.length];
      const requiresCapa = classification === "MAJOR_NC" || classification === "MINOR_NC";
      const findingNumber = `${number}/F${String(index + 1).padStart(2, "0")}`;
      const findingStatus = status === "CLOSED" ? "CLOSED" : requiresCapa ? (status === "PENDING_CAPA_CLOSURE" ? "CAPA_LINKED" : "OPEN") : "OPEN";

      await upsert(
        client,
        "audit_findings",
        "audit_finding_id",
        {
          audit_finding_id: uuidFor("audit-finding", findingNumber),
          audit_id: auditId,
          finding_number: findingNumber,
          classification,
          description: requiresCapa
            ? `${description} Ditindaklanjuti melalui ${capaNumbers[findingSequence % capaNumbers.length]}.`
            : description,
          identified_by: isExternal ? externalAuditor.id : internalAuditor.id,
          identified_at: daysAgo(-startOffset - 1),
          status: findingStatus,
          requires_capa: requiresCapa,
          target_closure_date: dateOnly(daysAgo(-startOffset - 45)),
        },
        ctx.audit,
      );
    }
  }

  // --- Modul 11: NCR mutu ---
  let ncrSequence = 0;
  for (const [source, severity, title, stage, disposition, quantity, unit] of NCRS) {
    ncrSequence += 1;
    const number = `NCR/2026/${String(ncrSequence).padStart(4, "0")}`;
    const detectedDaysAgo = intBetween(random, 5, 300);
    const status = ["CLOSED", "CLOSED", "DISPOSITIONED", "CAPA_LINKED", "CONTAINMENT", "OPEN"][ncrSequence % 6];

    await upsert(
      client,
      "ncr_records",
      "ncr_id",
      {
        ncr_id: uuidFor("ncr", number),
        ncr_number: number,
        company_id: ctx.companyId,
        site_id: siteOf(ncrSequence % 2 === 0 ? "bpn" : "cepu"),
        ncr_source: source === "AUDIT_FINDING" ? "INTERNAL" : source,
        title,
        description: `${title}. Ketidaksesuaian ditemukan pada tahap ${stage.toLowerCase().replace(/_/g, " ")} dan telah dikarantina menunggu keputusan disposisi.`,
        severity,
        detection_stage: stage,
        detected_date: dateOnly(daysAgo(detectedDaysAgo)),
        detected_by: pick(random, [qcInspector, qualityManager]).id,
        quantity_nonconforming: quantity,
        unit_of_measure: unit,
        disposition,
        status,
        re_inspection_result: status === "CLOSED" ? "PASS" : "NOT_YET",
      },
      ctx.audit,
    );
  }

  return {
    incidents: INCIDENTS.length,
    capas: CAPAS.length,
    inspections: inspectionSequence,
    audits: AUDITS.length,
    auditFindings: findingSequence,
    ncrs: NCRS.length,
  };
}

module.exports = { seedEvents };
