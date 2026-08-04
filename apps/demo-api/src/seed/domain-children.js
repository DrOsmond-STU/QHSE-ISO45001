// Isi halaman detail: baris anak untuk setiap modul.
//
// Berkas ini lahir dari keluhan yang tepat sasaran saat data demo pertama
// dicoba: "temuan audit tidak ada, tindak lanjut audit tidak ada, semua menu
// isinya penjelasan simpel tanpa data". Penyebabnya bukan modulnya kosong —
// tabel induknya penuh — melainkan bahwa pekerjaan QHSE yang sesungguhnya
// tidak tinggal di tabel induk sama sekali.
//
// Sebuah audit, dilihat dari tabel `audits`, hanyalah tanggal dan status.
// Yang membuatnya berarti adalah temuannya, timnya, notulen rapat penutupan,
// dan CAPA yang lahir darinya. Hal yang sama berlaku di setiap modul: izin
// kerja panas tanpa hasil uji gas bukan izin kerja panas, CAPA tanpa analisis
// akar masalah dan rencana tindakan bukan CAPA. Baris-baris itulah yang
// disemai di sini.
//
// Rantai antar modul dibuat NYATA, bukan disebut di teks: baris
// incident_corrective_actions benar-benar menunjuk capa_register_id yang ada,
// jadi penonton yang membuka insiden lalu mengikuti nomor CAPA-nya akan
// menemukan CAPA itu betul-betul ada beserta akar masalah dan rencana
// tindakannya.
const { uuidFor, upsert, seededRandom, pick, intBetween, dateOnly, daysAgo, daysFromNow, NOW } = require("./lib");
const { actor, actors } = require("./foundation");

// --- Modul 03: versi dokumen -------------------------------------------------

const CHANGE_SUMMARIES = [
  "Terbitan pertama.",
  "Penambahan langkah verifikasi gas sebelum pekerjaan dimulai.",
  "Penyesuaian dengan Permenaker No. 5 Tahun 2018 dan penambahan matriks APD.",
  "Perbaikan alur persetujuan dan penambahan formulir serah terima area.",
  "Pemutakhiran daftar acuan peraturan dan penyelarasan istilah dengan Manual SMT QHSE.",
];

async function seedDocumentVersions(client, ctx, random) {
  const controller = actor(ctx, "DOCUMENT_CONTROLLER");
  const hseManager = actor(ctx, "HSE_MANAGER");

  // deleted_at IS NULL, dan itu bukan kerapian.
  //
  // Pemeriksaan otomatis membuat dokumen sekali pakai, mengunggah satu revisi
  // ke dalamnya, lalu menghapus dokumennya (lunak). Tanpa saringan ini,
  // penyemaian berikutnya ikut membuatkan versi untuk dokumen-dokumen bekas
  // itu — dan menabrak revisi 1.0 yang sudah ada di sana:
  //
  //     duplicate key value violates unique constraint
  //     "document_versions_document_id_major_version_minor_version_key"
  //
  // Penghapusan LUNAK tidak melepaskan batasan unik: barisnya tetap ada dan
  // tetap memegang nomor versinya. Jadi menyemai ulang — operasi yang
  // seharusnya aman diulang kapan saja — akan gagal di tengah jalan setelah
  // pemeriksaan otomatis berjalan beberapa kali.
  const { rows: documents } = await client.query(
    `SELECT document_id, document_number, title, status, effective_date
       FROM documents
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY document_number`,
    [ctx.tenantId],
  );

  let created = 0;
  for (const document of documents) {
    // Jumlah versi mengikuti status dokumennya, bukan diacak: dokumen yang
    // masih DRAFT memang belum pernah punya versi terbit, dan dokumen yang
    // sudah beberapa kali direvisi harus memperlihatkan jejak revisinya.
    const revisions = document.status === "DRAFT" ? 1 : document.status === "UNDER_REVISION" ? 3 : intBetween(random, 1, 3);
    // Umur versi TERBARU diundi sekali, lalu versi yang lebih lama dihitung
    // mundur darinya. Mengundi tanggal tiap versi secara terpisah
    // menghasilkan versi 1 yang terbit setelah versi 2 — mustahil, dan
    // langsung terlihat oleh siapa pun yang membaca tabel riwayat versi.
    const latestAgeDays = intBetween(random, 30, 420);

    for (let major = 1; major <= revisions; major++) {
      const isLatest = major === revisions;
      const status =
        document.status === "DRAFT"
          ? "DRAFT"
          : document.status === "IN_REVIEW" && isLatest
            ? "PENDING_APPROVAL"
            : document.status === "UNDER_REVISION" && isLatest
              ? "DRAFT"
              : isLatest
                ? "PUBLISHED"
                : "SUPERSEDED";

      const ageDays = latestAgeDays + (revisions - major) * 220;
      const publishedAt = status === "PUBLISHED" || status === "SUPERSEDED" ? daysAgo(ageDays) : null;
      const key = `${document.document_number}/v${major}`;
      created += 1;

      await upsert(
        client,
        "document_versions",
        "document_version_id",
        {
          document_version_id: uuidFor("document-version", key),
          document_id: document.document_id,
          major_version: major,
          minor_version: 0,
          file_name: `${document.document_number.replace(/\//g, "-")}-v${major}.0.pdf`,
          // Berkas sungguhannya TIDAK ada — tidak ada satu pun lampiran
          // yang diunggah oleh data demo ini, dan menyimpan URL yang
          // mengarah ke berkas fiktif akan menghasilkan tombol unduh yang
          // gagal di depan penonton. URL-nya sengaja menunjuk halaman
          // detail dokumen itu sendiri, dan isi dokumennya dibaca dari
          // ringkasan pada `documents.description`.
          file_url: `/modules/documents/${document.document_id}`,
          file_size: intBetween(random, 180_000, 2_400_000),
          mime_type: "application/pdf",
          change_summary: major === 1 ? CHANGE_SUMMARIES[0] : pick(random, CHANGE_SUMMARIES.slice(1)),
          status,
          approved_at: publishedAt ? daysAgo(ageDays + 7) : null,
          published_at: publishedAt,
          created_by: controller.id,
          updated_by: status === "PUBLISHED" ? hseManager.id : controller.id,
        },
        { tenant_id: ctx.tenantId },
      );
    }
  }
  return created;
}

// --- Modul 04: kewajiban kepatuhan -------------------------------------------

const OBLIGATIONS = [
  ["Menyampaikan laporan pelaksanaan SMK3 kepada Dinas Ketenagakerjaan", "REPORTING", "ANNUAL"],
  ["Melaksanakan audit internal SMK3 dan mendokumentasikan hasilnya", "INSPECTION", "ANNUAL"],
  ["Membentuk dan memelihara keaktifan P2K3 beserta laporan triwulanannya", "ORGANIZATIONAL", "QUARTERLY"],
  ["Menyampaikan laporan pemantauan lingkungan (RKL-RPL) kepada instansi terkait", "REPORTING", "SEMI_ANNUAL"],
  ["Memastikan operator pesawat angkat memiliki lisensi yang masih berlaku", "LICENSING", "ANNUAL"],
  ["Melaksanakan pemeriksaan riksa uji peralatan bertekanan oleh pihak berwenang", "INSPECTION", "ANNUAL"],
  ["Menyelenggarakan pelatihan tanggap darurat bagi seluruh pekerja", "TRAINING", "ANNUAL"],
  ["Memelihara logbook pengelolaan limbah B3 dan neraca limbah", "DOCUMENTATION", "MONTHLY"],
  ["Melakukan pengukuran kualitas lingkungan kerja (kebisingan, pencahayaan, kimia)", "TECHNICAL_CONTROL", "SEMI_ANNUAL"],
  ["Memastikan izin penyimpanan sementara limbah B3 diperpanjang sebelum berakhir", "LICENSING", "ONE_TIME"],
];

async function seedComplianceObligations(client, ctx, random) {
  const compliance = actor(ctx, "COMPLIANCE_OFFICER");
  const environmental = actor(ctx, "ENVIRONMENTAL_OFFICER");
  const hseManager = actor(ctx, "HSE_MANAGER");

  const { rows: regulations } = await client.query(
    `SELECT regulatory_register_id, regulation_number FROM regulatory_register WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY regulation_number`,
    [ctx.tenantId],
  );

  let created = 0;
  let index = 0;
  for (const regulation of regulations) {
    // Dua sampai tiga kewajiban per peraturan — cukup untuk memperlihatkan
    // bahwa register peraturan bukan sekadar daftar judul, melainkan daftar
    // hal yang harus benar-benar dikerjakan seseorang pada tanggal tertentu.
    const count = intBetween(random, 2, 3);
    for (let n = 0; n < count; n++) {
      index += 1;
      created += 1;
      const [description, type, frequency] = OBLIGATIONS[index % OBLIGATIONS.length];
      const overdue = index % 7 === 0;
      await upsert(
        client,
        "compliance_obligations",
        "obligation_id",
        {
          obligation_id: uuidFor("obligation", `${regulation.regulation_number}#${n}`),
          regulatory_register_id: regulation.regulatory_register_id,
          obligation_code: `OBL-${String(index).padStart(3, "0")}`,
          clause_reference: `Pasal ${intBetween(random, 2, 45)} ayat (${intBetween(random, 1, 4)})`,
          obligation_description: description,
          obligation_type: type,
          frequency,
          responsible_user_id: pick(random, [compliance, environmental, hseManager]).id,
          responsible_department_id: ctx.deptIds.hse,
          applicable_site_id: pick(random, [ctx.siteIds.hq, ctx.siteIds.cepu, ctx.siteIds.bpn]),
          next_due_date: dateOnly(daysFromNow(overdue ? -intBetween(random, 5, 40) : intBetween(random, 10, 300))),
          status: "ACTIVE",
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 05: baris bahaya HIRA ---------------------------------------------

const HAZARD_LINES = [
  ["Paparan gas H2S saat pembukaan sistem proses", "Detektor gas tetap terpasang, prosedur purging, APD dasar", "Penambahan detektor personal wajib dan pelatihan penyegaran H2S", "ENGINEERING"],
  ["Kebakaran akibat percikan las di area yang mengandung uap hidrokarbon", "Izin kerja panas, fire watcher, pemeriksaan gas awal", "Pemeriksaan gas berkala tiap 2 jam selama pekerjaan berlangsung", "ADMINISTRATIVE"],
  ["Jatuh dari ketinggian saat naik ke platform peralatan", "Tangga permanen berpagar, full body harness", "Pemasangan lifeline permanen pada jalur akses utama", "ENGINEERING"],
  ["Terjepit bagian berputar pompa saat pemeliharaan", "Prosedur LOTO, pelindung kopling", "Audit kepatuhan LOTO bulanan oleh supervisor", "ADMINISTRATIVE"],
  ["Terpapar kebisingan di atas 85 dBA di area kompresor", "Rambu wajib pelindung telinga, ear muff", "Pemasangan penutup akustik pada kompresor K-101", "ENGINEERING"],
  ["Tumpahan minyak mencemari tanah dan saluran drainase", "Bund wall, oil trap, prosedur penanganan tumpahan", "Penambahan kit tanggap tumpahan di tiap area proses", "ENGINEERING"],
  ["Tertimpa beban saat pengangkatan dengan crane", "Rigging plan, operator berlisensi, area steril", "Penerapan lifting permit terpisah untuk beban kritis", "ADMINISTRATIVE"],
  ["Terpapar bahan kimia demulsifier pada kulit dan mata", "MSDS tersedia, sarung tangan nitril, eye wash station", "Penggantian kemasan menjadi sistem tertutup", "SUBSTITUTION"],
  ["Kelelahan pengemudi pada perjalanan dinas jarak jauh", "Batas jam mengemudi, journey management plan", "Pemasangan pemantau perilaku mengemudi pada kendaraan operasional", "ENGINEERING"],
  ["Sengatan listrik saat pemeliharaan panel bertegangan", "Prosedur kerja listrik, APD listrik, pengujian tegangan nol", "Pemasangan sistem interlock pada panel utama", "ENGINEERING"],
];

function levelOf(score) {
  if (score >= 15) return "EKSTREM";
  if (score >= 10) return "TINGGI";
  if (score >= 5) return "SEDANG";
  return "RENDAH";
}

async function seedHiraLines(client, ctx, random) {
  const supervisors = actors(ctx, "SUPERVISOR");
  const { rows: assessments } = await client.query(
    `SELECT hira_id, hira_number FROM hira_assessments WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY hira_number`,
    [ctx.tenantId],
  );

  let created = 0;
  let index = 0;
  for (const assessment of assessments) {
    const count = intBetween(random, 3, 5);
    for (let n = 0; n < count; n++) {
      index += 1;
      created += 1;
      const [hazard, existing, additional, hierarchy] = HAZARD_LINES[index % HAZARD_LINES.length];
      const likelihoodBefore = intBetween(random, 3, 5);
      const severityBefore = intBetween(random, 3, 5);
      const scoreBefore = likelihoodBefore * severityBefore;
      // Risiko sesudah pengendalian SELALU lebih kecil, tidak pernah lebih
      // besar — matriks yang memperlihatkan risiko naik setelah dikendalikan
      // adalah hal pertama yang ditangkap auditor yang paham pekerjaannya.
      const likelihoodAfter = Math.max(1, likelihoodBefore - intBetween(random, 1, 2));
      const severityAfter = Math.max(1, severityBefore - intBetween(random, 0, 1));
      const scoreAfter = likelihoodAfter * severityAfter;

      await upsert(
        client,
        "hira_hazard_lines",
        "hira_line_id",
        {
          hira_line_id: uuidFor("hira-line", `${assessment.hira_number}#${n}`),
          hira_id: assessment.hira_id,
          hazard_description_freetext: hazard,
          existing_controls: existing,
          likelihood_before: likelihoodBefore,
          severity_before: severityBefore,
          risk_score_before: scoreBefore,
          risk_level_before: levelOf(scoreBefore),
          additional_controls_required: scoreAfter >= 10 ? additional : null,
          control_hierarchy: hierarchy,
          likelihood_after: likelihoodAfter,
          severity_after: severityAfter,
          risk_score_after: scoreAfter,
          risk_level_after: levelOf(scoreAfter),
          requires_escalation: scoreAfter >= 15,
          responsible_user_id: pick(random, supervisors).id,
          target_completion_date: scoreAfter >= 10 ? dateOnly(daysFromNow(intBetween(random, 15, 120))) : null,
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 06: hasil uji gas -------------------------------------------------

const GAS_SPECS = [
  ["OXYGEN", "% vol", 19.5, 23.5, () => 20.6 + Math.random() * 0.3],
  ["LEL_FLAMMABLE", "% LEL", 0, 10, () => 0],
  ["H2S", "ppm", 0, 10, () => 0],
  ["CO", "ppm", 0, 35, () => 0],
];

async function seedGasTests(client, ctx, random) {
  const hseOfficers = actors(ctx, "HSE_OFFICER");

  // Hanya izin berisiko tinggi yang wajib uji gas — kerja umum di taman
  // kantor tidak, dan menyemainya di sana justru memperlihatkan sistem yang
  // tidak mengerti bedanya.
  const { rows: permits } = await client.query(
    `SELECT p.work_permit_id, p.permit_number, p.planned_start_datetime, t.code
       FROM work_permits p JOIN work_permit_types t ON t.work_permit_type_id = p.work_permit_type_id
      WHERE p.tenant_id = $1 AND t.code IN ('HOT', 'CSE') AND p.status <> 'DRAFT'
      ORDER BY p.permit_number`,
    [ctx.tenantId],
  );

  let created = 0;
  for (const permit of permits) {
    const tester = pick(random, hseOfficers);
    const base = new Date(permit.planned_start_datetime);
    for (const [gasType, unit, min, max, ,] of GAS_SPECS) {
      created += 1;
      const reading =
        gasType === "OXYGEN"
          ? Number((20.5 + intBetween(random, 0, 6) / 10).toFixed(1))
          : gasType === "LEL_FLAMMABLE"
            ? intBetween(random, 0, 3)
            : gasType === "H2S"
              ? intBetween(random, 0, 2)
              : intBetween(random, 0, 8);
      const testAt = new Date(base.getTime() - 30 * 60 * 1000);

      await upsert(
        client,
        "gas_test_results",
        "gas_test_result_id",
        {
          gas_test_result_id: uuidFor("gas-test", `${permit.permit_number}/${gasType}`),
          work_permit_id: permit.work_permit_id,
          gas_type: gasType,
          reading_value: reading,
          unit,
          acceptable_min: min,
          acceptable_max: max,
          result: reading >= min && reading <= max ? "PASS" : "FAIL",
          test_datetime: testAt,
          // Uji ulang wajib tiap 2 jam untuk ruang terbatas — angka ini yang
          // dipakai scan gas-retest-due di apps/api.
          retest_due_at: new Date(testAt.getTime() + 2 * 60 * 60 * 1000),
          instrument_name: pick(random, ["Draeger X-am 5000", "Honeywell BW MaxXT II", "MSA Altair 4XR"]),
          tested_by: tester.id,
          location_detail: permit.code === "CSE" ? "Titik masuk manhole, kedalaman 1 m" : "Radius 3 m dari titik pengelasan",
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 07: investigasi, akar masalah, tindak lanjut ----------------------

const ROOT_CAUSES = [
  ["IMMEDIATE_CAUSE", "PEOPLE", "Pekerja menaiki struktur scaffolding yang belum selesai dipasang tanpa menunggu tag hijau."],
  ["IMMEDIATE_CAUSE", "EQUIPMENT_MATERIAL", "Pengait harness ditambatkan pada pipa instrumen, bukan pada titik angkur yang ditentukan."],
  ["ROOT_CAUSE", "PROCESS_PROCEDURE", "Prosedur pemasangan scaffolding tidak mensyaratkan penutupan akses fisik selama pemasangan berlangsung."],
  ["ROOT_CAUSE", "MANAGEMENT_SYSTEM", "Pengawasan lapangan tidak menjangkau area pemasangan karena supervisor menangani tiga area sekaligus pada shift itu."],
  ["CONTRIBUTING_FACTOR", "ENVIRONMENT", "Pekerjaan dilakukan menjelang pergantian shift ketika penerangan area mulai berkurang."],
  ["CONTRIBUTING_FACTOR", "PEOPLE", "Toolbox meeting pagi itu tidak membahas bahaya spesifik pekerjaan di ketinggian."],
];

async function seedIncidentDepth(client, ctx, random) {
  const hseManager = actor(ctx, "HSE_MANAGER");
  const hseOfficers = actors(ctx, "HSE_OFFICER");

  const { rows: incidents } = await client.query(
    `SELECT incident_report_id, incident_number, incident_datetime, status, classification
       FROM incident_reports WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY incident_number`,
    [ctx.tenantId],
  );
  const { rows: capas } = await client.query(
    `SELECT capa_register_id, capa_number FROM capa_register WHERE tenant_id = $1 AND deleted_at IS NULL AND source_type = 'INCIDENT' ORDER BY capa_number`,
    [ctx.tenantId],
  );

  let investigations = 0;
  let causes = 0;
  let links = 0;
  let capaIndex = 0;

  for (const incident of incidents) {
    // Nyaris celaka yang sudah ditutup tidak selalu melewati investigasi
    // formal, dan memaksakannya justru membuat sebarannya tidak realistis.
    const needsInvestigation = ["UNDER_INVESTIGATION", "INVESTIGATION_COMPLETED", "CLOSED", "PENDING_REGULATORY_REPORT"].includes(incident.status);
    if (!needsInvestigation) continue;

    const startedAt = new Date(new Date(incident.incident_datetime).getTime() + 6 * 60 * 60 * 1000);
    const completed = incident.status !== "UNDER_INVESTIGATION";
    const investigationId = uuidFor("incident-investigation", incident.incident_number);
    investigations += 1;

    await upsert(
      client,
      "incident_investigations",
      "incident_investigation_id",
      {
        incident_investigation_id: investigationId,
        incident_report_id: incident.incident_report_id,
        method: incident.classification === "NEAR_MISS" ? "FIVE_WHY" : pick(random, ["FIVE_WHY", "FISHBONE", "BOWTIE"]),
        lead_investigator_id: pick(random, [hseManager, ...hseOfficers]).id,
        started_at: startedAt,
        // Batas 14 hari kerja mengikuti SOP investigasi insiden yang ada di
        // modul dokumen — angkanya sengaja sama supaya keduanya konsisten
        // kalau penonton membuka SOP-nya.
        target_completion_at: new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
        completed_at: completed ? new Date(startedAt.getTime() + intBetween(random, 5, 13) * 24 * 60 * 60 * 1000) : null,
        findings_summary: completed
          ? "Investigasi menyimpulkan kejadian bersumber dari kombinasi penyimpangan prosedur di lapangan dan pengendalian pengawasan yang belum memadai. Rekomendasi ditindaklanjuti melalui CAPA terkait."
          : null,
        status: completed ? "APPROVED" : "IN_PROGRESS",
      },
      ctx.audit,
    );

    const causeCount = incident.classification === "NEAR_MISS" ? 2 : intBetween(random, 3, 5);
    for (let n = 0; n < causeCount; n++) {
      causes += 1;
      const [causeType, category, description] = ROOT_CAUSES[(causes + n) % ROOT_CAUSES.length];
      await upsert(
        client,
        "incident_root_causes",
        "incident_root_cause_id",
        {
          incident_root_cause_id: uuidFor("incident-root-cause", `${incident.incident_number}#${n}`),
          incident_investigation_id: investigationId,
          cause_type: causeType,
          category,
          description,
          method_reference: `Why ${n + 1}`,
          sequence_no: n + 1,
        },
        ctx.audit,
      );
    }

    // Insiden yang serius menghasilkan CAPA — dan CAPA-nya BENAR-BENAR ada
    // di modul CAPA, bukan sekadar nomor yang ditulis di deskripsi.
    if (capas.length > 0 && incident.classification !== "NEAR_MISS") {
      const capa = capas[capaIndex % capas.length];
      capaIndex += 1;
      links += 1;
      await upsert(
        client,
        "incident_corrective_actions",
        "incident_corrective_action_link_id",
        {
          incident_corrective_action_link_id: uuidFor("incident-capa-link", incident.incident_number),
          incident_report_id: incident.incident_report_id,
          incident_investigation_id: investigationId,
          capa_register_id: capa.capa_register_id,
          linked_by: hseManager.id,
          linked_at: new Date(startedAt.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
        ctx.audit,
      );
    }
  }
  return { investigations, causes, links };
}

// --- Modul 10: analisis akar masalah + rencana tindakan CAPA -----------------

const ACTION_TEMPLATES = [
  ["INTERIM_CONTAINMENT", "Menghentikan sementara pekerjaan sejenis di seluruh area sampai pengendalian tambahan terpasang.", "Mencegah kejadian berulang selama perbaikan sistemik masih berjalan."],
  ["CORRECTIVE", "Merevisi prosedur terkait dan mensosialisasikannya kepada seluruh pekerja yang terdampak.", "Menghilangkan celah prosedur yang teridentifikasi sebagai akar masalah."],
  ["CORRECTIVE", "Melaksanakan pelatihan penyegaran dan verifikasi kompetensi bagi pekerja terkait.", "Memastikan pelaksana memahami pengendalian yang baru ditetapkan."],
  ["PREVENTIVE", "Menambahkan butir pemeriksaan pada checklist inspeksi bulanan area terkait.", "Membuat penyimpangan yang sama terdeteksi lebih awal pada siklus berikutnya."],
  ["PREVENTIVE", "Memasukkan skenario kejadian ini ke dalam materi toolbox meeting triwulanan.", "Menjaga kesadaran risiko tetap hidup setelah tindakan perbaikan selesai."],
];

const ROOT_CAUSE_SUMMARIES = [
  "Prosedur yang berlaku tidak mengatur tahap verifikasi independen sebelum pekerjaan dimulai, sehingga penyimpangan di lapangan tidak tertangkap oleh siapa pun.",
  "Pengendalian bertumpu sepenuhnya pada kepatuhan individu tanpa penghalang fisik maupun rekayasa yang membuat kesalahan menjadi sulit dilakukan.",
  "Frekuensi pemeriksaan yang ditetapkan tidak sebanding dengan laju penurunan kondisi peralatan di lingkungan operasi yang sebenarnya.",
  "Tanggung jawab pemantauan tersebar di beberapa peran tanpa satu pemilik yang jelas, sehingga tidak ada yang merasa wajib menindaklanjuti.",
];

async function seedCapaDepth(client, ctx, random) {
  const hseManager = actor(ctx, "HSE_MANAGER");
  const qualityManager = actor(ctx, "QUALITY_MANAGER");
  const supervisors = actors(ctx, "SUPERVISOR");
  const hseOfficers = actors(ctx, "HSE_OFFICER");

  const { rows: capas } = await client.query(
    `SELECT capa_register_id, capa_number, status, initiated_at, target_closure_date FROM capa_register WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY capa_number`,
    [ctx.tenantId],
  );

  let analyses = 0;
  let plans = 0;
  for (const capa of capas) {
    // CAPA yang masih DRAFT memang belum punya analisis akar masalah —
    // itulah yang membuat SLA akar masalah bisa terlambat, dan modulnya
    // kehilangan artinya kalau semua CAPA sudah lengkap sejak awal.
    if (capa.status === "DRAFT") continue;

    const analysisId = uuidFor("capa-rca", capa.capa_number);
    analyses += 1;
    const method = pick(random, ["FIVE_WHY", "FISHBONE", "FAULT_TREE"]);
    await upsert(
      client,
      "capa_root_cause_analysis",
      "root_cause_analysis_id",
      {
        root_cause_analysis_id: analysisId,
        capa_register_id: capa.capa_register_id,
        method,
        method_detail:
          method === "FIVE_WHY"
            ? JSON.stringify({
                why1: "Kenapa kejadian ini terjadi? Pengendalian yang ditetapkan tidak dijalankan sepenuhnya di lapangan.",
                why2: "Kenapa tidak dijalankan? Pelaksana menilai langkah tersebut memperlambat pekerjaan.",
                why3: "Kenapa dinilai memperlambat? Tidak tersedia alat bantu yang membuat langkah itu praktis dikerjakan.",
                why4: "Kenapa alat bantunya tidak tersedia? Kebutuhan itu tidak pernah masuk ke daftar pengadaan tahunan.",
                why5: "Kenapa tidak masuk? Tinjauan kebutuhan pengendalian tidak dilakukan setelah prosedur direvisi.",
              })
            : JSON.stringify({
                manusia: "Kompetensi dan pengawasan lapangan",
                metode: "Prosedur belum mengatur verifikasi independen",
                mesin: "Tidak ada penghalang rekayasa",
                material: "Spesifikasi material sesuai",
                lingkungan: "Pekerjaan menjelang pergantian shift",
              }),
        root_cause_summary: pick(random, ROOT_CAUSE_SUMMARIES),
        contributing_factors: "Tekanan jadwal penyelesaian pekerjaan dan rentang kendali pengawas yang terlalu lebar pada shift tersebut.",
        analyzed_by: pick(random, [hseManager, qualityManager, ...hseOfficers]).id,
        analyzed_at: new Date(new Date(capa.initiated_at).getTime() + 3 * 24 * 60 * 60 * 1000),
      },
      ctx.audit,
    );

    const closed = capa.status === "EFFECTIVE_CLOSED";
    const planCount = intBetween(random, 2, 4);
    for (let n = 0; n < planCount; n++) {
      plans += 1;
      const [actionType, description, justification] = ACTION_TEMPLATES[(plans + n) % ACTION_TEMPLATES.length];
      const dueDate = capa.target_closure_date ? new Date(capa.target_closure_date) : daysFromNow(30);
      dueDate.setDate(dueDate.getDate() - (planCount - n) * 5);
      const overdue = !closed && dueDate.getTime() < NOW.getTime();

      await upsert(
        client,
        "capa_action_plans",
        "capa_action_plan_id",
        {
          capa_action_plan_id: uuidFor("capa-action", `${capa.capa_number}#${n}`),
          capa_register_id: capa.capa_register_id,
          root_cause_analysis_id: analysisId,
          action_description: description,
          justification,
          action_type: actionType,
          pic_user_id: pick(random, [...supervisors, ...hseOfficers]).id,
          due_date: dateOnly(dueDate),
          status_cache: closed ? "COMPLETED" : overdue ? "OVERDUE" : n === 0 ? "IN_PROGRESS" : "OPEN",
          completed_date_cache: closed ? dateOnly(dueDate) : null,
        },
        ctx.audit,
      );
    }
  }
  return { analyses, plans };
}

// --- Modul 08: temuan inspeksi -----------------------------------------------

const INSPECTION_FINDINGS = [
  ["Housekeeping area rumah pompa belum tertata", "Ditemukan genangan oli bekas dan material tidak tertata di jalur lintasan pekerja.", "MEDIUM"],
  ["APAR bertekanan di bawah zona hijau", "Dua unit APAR pada wellpad B menunjukkan tekanan di bawah zona hijau dan belum ditandai untuk pengisian ulang.", "HIGH"],
  ["Rambu evakuasi memudar", "Rambu arah evakuasi di koridor utama sudah memudar dan sulit dibaca dari jarak lima meter.", "LOW"],
  ["Pekerja tidak memakai pelindung telinga di area kompresor", "Dua pekerja teramati berada di area kebisingan tinggi tanpa ear muff.", "MEDIUM"],
  ["Tag inspeksi scaffolding tidak terpasang", "Scaffolding di area tangki sudah digunakan meski tag inspeksi belum terpasang.", "HIGH"],
  ["Penyimpanan bahan kimia tidak sesuai matriks inkompatibilitas", "Oksidator disimpan berdekatan dengan bahan mudah terbakar di gudang bahan kimia.", "HIGH"],
  ["Eye wash station tidak berfungsi optimal", "Tekanan air pada eye wash station area laboratorium di bawah standar.", "MEDIUM"],
  ["Jalur akses alat pemadam terhalang", "Palet material menutup akses ke hidran nomor 4.", "MEDIUM"],
];

async function seedInspectionFindings(client, ctx, random) {
  const hseOfficers = actors(ctx, "HSE_OFFICER");
  const qcInspector = actor(ctx, "QC_INSPECTOR");

  const { rows: records } = await client.query(
    `SELECT inspection_record_id, inspection_record_number, actual_date, overall_result
       FROM inspection_records WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'COMPLETED' ORDER BY inspection_record_number`,
    [ctx.tenantId],
  );

  let created = 0;
  let index = 0;
  for (const record of records) {
    // Inspeksi yang lulus pun boleh punya temuan minor; yang gagal pasti
    // punya beberapa. Inspeksi lulus tanpa satu pun catatan memang ada, dan
    // itu bagian dari gambaran yang jujur.
    const count = record.overall_result === "FAIL" ? intBetween(random, 2, 4) : intBetween(random, 0, 2);
    for (let n = 0; n < count; n++) {
      index += 1;
      created += 1;
      const [title, description, severity] = INSPECTION_FINDINGS[index % INSPECTION_FINDINGS.length];
      const identifiedAt = record.actual_date ? new Date(record.actual_date) : daysAgo(30);
      const closed = index % 3 !== 0;
      await upsert(
        client,
        "inspection_findings",
        "inspection_finding_id",
        {
          inspection_finding_id: uuidFor("inspection-finding", `${record.inspection_record_number}#${n}`),
          inspection_record_id: record.inspection_record_id,
          title,
          description,
          severity,
          area_location: pick(random, ["Rumah pompa", "Wellpad B", "Area tangki timbun", "Gudang material", "Koridor kantor", "Area kompresor"]),
          status: closed ? "CLOSED" : severity === "HIGH" ? "ESCALATED_TO_CAPA" : "ACTION_ASSIGNED",
          identified_by: pick(random, [...hseOfficers, qcInspector]).id,
          identified_at: identifiedAt,
          target_close_date: dateOnly(new Date(identifiedAt.getTime() + 14 * 24 * 60 * 60 * 1000)),
          closed_at: closed ? new Date(identifiedAt.getTime() + intBetween(random, 3, 20) * 24 * 60 * 60 * 1000) : null,
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 09: tim audit -----------------------------------------------------

async function seedAuditTeams(client, ctx) {
  const internalAuditor = actor(ctx, "AUDITOR_INTERNAL");
  const externalAuditor = actor(ctx, "AUDITOR_EXTERNAL");
  const hseManager = actor(ctx, "HSE_MANAGER");
  const qualityManager = actor(ctx, "QUALITY_MANAGER");
  const hseOfficers = actors(ctx, "HSE_OFFICER");

  const { rows: audits } = await client.query(
    `SELECT a.audit_id, a.audit_number, t.code
       FROM audits a JOIN audit_types t ON t.audit_type_id = a.audit_type_id
      WHERE a.tenant_id = $1 ORDER BY a.audit_number`,
    [ctx.tenantId],
  );

  let created = 0;
  for (const audit of audits) {
    const external = audit.code === "EA-CERT";
    const members = [
      [external ? externalAuditor : internalAuditor, "LEAD_AUDITOR"],
      [external ? internalAuditor : hseOfficers[0], "AUDITOR"],
      [hseOfficers[1] || hseOfficers[0], "AUDITOR"],
      [audit.code === "IA-9001" ? qualityManager : hseManager, "TECHNICAL_EXPERT"],
    ];
    for (const [user, role] of members) {
      created += 1;
      await upsert(
        client,
        "audit_team_members",
        "audit_team_member_id",
        {
          audit_team_member_id: uuidFor("audit-team", `${audit.audit_number}/${user.key}/${role}`),
          audit_id: audit.audit_id,
          user_id: user.id,
          role_in_team: role,
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 14: langkah rencana tanggap darurat -------------------------------

const PLAN_STEPS = [
  ["Orang pertama yang mendeteksi kejadian membunyikan alarm terdekat dan melaporkan ke ruang kontrol melalui radio kanal darurat.", "OTHER", 2],
  ["Ruang kontrol mengaktifkan sirene sitewide dan menghubungi Incident Commander.", "COMMUNICATION_OFFICER", 3],
  ["Incident Commander tiba di pos komando dan menetapkan tingkat keadaan darurat.", "INCIDENT_COMMANDER", 10],
  ["Seluruh pekerja yang tidak terlibat penanganan bergerak ke titik kumpul terdekat mengikuti arahan marshal.", "EVACUATION_MARSHAL", 15],
  ["Assembly point coordinator melakukan penghitungan kepala dan melaporkan hasilnya ke pos komando.", "ASSEMBLY_POINT_COORDINATOR", 20],
  ["Tim pemadam melakukan penanganan awal sesuai taktik yang ditetapkan Incident Commander.", "FIRE_WARDEN", 20],
  ["Tim medis menyiapkan area triase dan menangani korban bila ada.", "FIRST_AIDER", 20],
  ["Communication officer menghubungi instansi eksternal bila kejadian dinyatakan Level 3.", "COMMUNICATION_OFFICER", 30],
  ["Incident Commander menyatakan keadaan aman dan mengizinkan pekerja kembali ke area kerja.", "INCIDENT_COMMANDER", 120],
];

async function seedPlanSteps(client, ctx) {
  const { rows: plans } = await client.query(
    `SELECT emergency_response_plan_id, plan_number FROM emergency_response_plans WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY plan_number`,
    [ctx.tenantId],
  );

  let created = 0;
  for (const plan of plans) {
    for (let index = 0; index < PLAN_STEPS.length; index++) {
      const [description, role, minutes] = PLAN_STEPS[index];
      created += 1;
      await upsert(
        client,
        "emergency_response_plan_steps",
        "plan_step_id",
        {
          plan_step_id: uuidFor("plan-step", `${plan.plan_number}#${index}`),
          emergency_response_plan_id: plan.emergency_response_plan_id,
          sequence_no: index + 1,
          step_description: description,
          responsible_ert_role: role,
          max_time_target_minutes: minutes,
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 15: riwayat pemeliharaan aset -------------------------------------

const MAINTENANCE_FINDINGS = [
  "Pemeliharaan preventif terjadwal selesai; seluruh parameter dalam batas normal.",
  "Penggantian bearing sisi non-drive end. Getaran turun dari 4,8 mm/s menjadi 1,9 mm/s setelah penggantian.",
  "Pembersihan filter dan penggantian oli pelumas. Ditemukan kebocoran ringan pada seal, dijadwalkan penggantian berikutnya.",
  "Kalibrasi ulang setelan proteksi dan pengujian fungsi trip. Hasil sesuai setelan desain.",
  "Perbaikan kebocoran pada sambungan flange dan pengencangan ulang baut sesuai nilai torsi standar.",
  "Pemeriksaan termografi menunjukkan titik panas pada terminal; dilakukan pengencangan dan pembersihan kontak.",
];

async function seedMaintenance(client, ctx, random) {
  const technicians = actors(ctx, "WORKER_EMPLOYEE");
  const { rows: assets } = await client.query(
    `SELECT asset_id, asset_code, condition_status FROM assets WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY asset_code`,
    [ctx.tenantId],
  );

  let created = 0;
  for (const asset of assets) {
    const count = intBetween(random, 1, 3);
    for (let n = 0; n < count; n++) {
      created += 1;
      await upsert(
        client,
        "maintenance_records",
        "maintenance_record_id",
        {
          maintenance_record_id: uuidFor("maintenance", `${asset.asset_code}#${n}`),
          asset_id: asset.asset_id,
          performed_date: dateOnly(daysAgo(intBetween(random, 10, 400) + n * 120)),
          performed_by: pick(random, technicians).id,
          findings: pick(random, MAINTENANCE_FINDINGS),
          // Kondisi hasil pemeliharaan TERAKHIR harus sama dengan kondisi
          // aset yang tercatat sekarang, kalau tidak dua layar yang bicara
          // tentang aset yang sama akan saling bertentangan.
          result_condition: n === 0 ? asset.condition_status : pick(random, ["GOOD", "FAIR"]),
          cost: intBetween(random, 2, 180) * 500_000,
        },
        { tenant_id: ctx.tenantId, created_by: ctx.audit.created_by },
      );
    }
  }
  return created;
}

// --- Modul 16: sertifikat kalibrasi ------------------------------------------

async function seedCalibrationCertificates(client, ctx, random) {
  const providerId = uuidFor("calibration-provider", "SUCOFINDO");
  await upsert(
    client,
    "calibration_providers",
    "calibration_provider_id",
    {
      calibration_provider_id: providerId,
      provider_name: "PT Sucofindo — Laboratorium Kalibrasi",
      provider_type: "EXTERNAL_LAB",
      accreditation_body: "Komite Akreditasi Nasional (KAN)",
      accreditation_number: "LK-042-IDN",
      accreditation_valid_until: dateOnly(daysFromNow(420)),
      address: "Jl. Raya Pasar Minggu Kav. 34, Jakarta Selatan",
      contact_person_name: "Ir. Setyo Nugroho",
      contact_person_phone: "021-7983666",
      contact_person_email: "kalibrasi@sucofindo.demo",
      is_active: true,
    },
    ctx.audit,
  );

  const internalProviderId = uuidFor("calibration-provider", "INTERNAL");
  await upsert(
    client,
    "calibration_providers",
    "calibration_provider_id",
    {
      calibration_provider_id: internalProviderId,
      provider_name: "Laboratorium Instrumentasi Internal — Balikpapan",
      provider_type: "INTERNAL_LAB",
      is_active: true,
    },
    ctx.audit,
  );

  const inspector = actor(ctx, "QC_INSPECTOR");
  const { rows: items } = await client.query(
    `SELECT calibration_item_id, equipment_tag_no, calibration_interval_months, is_critical_measurement
       FROM calibration_items WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY equipment_tag_no`,
    [ctx.tenantId],
  );

  let created = 0;
  let index = 0;
  for (const item of items) {
    index += 1;
    const rounds = intBetween(random, 1, 2);
    for (let n = 0; n < rounds; n++) {
      created += 1;
      const monthsBack = item.calibration_interval_months * n;
      const calibrationDate = daysAgo(intBetween(random, 20, 150) + monthsBack * 30);
      const nextDue = new Date(calibrationDate);
      nextDue.setMonth(nextDue.getMonth() + item.calibration_interval_months);
      // Satu dari sekian alat sengaja gagal — itulah pemicu rantai
      // kalibrasi di luar toleransi -> CAPA yang diceritakan modul CAPA.
      const result = index % 12 === 0 && n === 0 ? "FAIL" : index % 7 === 0 && n === 0 ? "CONDITIONAL_PASS" : "PASS";

      await upsert(
        client,
        "calibration_certificates",
        "calibration_certificate_id",
        {
          calibration_certificate_id: uuidFor("calibration-cert", `${item.equipment_tag_no}#${n}`),
          calibration_item_id: item.calibration_item_id,
          internal_reference_no: `KAL/2026/${String(index * 10 + n).padStart(4, "0")}`,
          certificate_no: `SUC/KAL/${intBetween(random, 10000, 99999)}/${2026 - n}`,
          calibration_provider_id: item.is_critical_measurement ? providerId : internalProviderId,
          calibration_date: dateOnly(calibrationDate),
          next_due_date: dateOnly(nextDue),
          calibration_result: result,
          as_found_condition:
            result === "PASS"
              ? "Alat ditemukan dalam kondisi baik, seluruh titik ukur dalam batas toleransi."
              : result === "CONDITIONAL_PASS"
                ? "Penyimpangan mendekati batas toleransi pada titik ukur tengah; masih dapat digunakan dengan faktor koreksi."
                : "Penyimpangan 4,2% melampaui batas toleransi yang diizinkan pada dua titik ukur.",
          as_left_condition:
            result === "FAIL"
              ? "Alat ditarik dari pemakaian dan dikirim untuk perbaikan; penelusuran dampak dibuka lewat CAPA."
              : "Alat disetel ulang dan diverifikasi; seluruh titik ukur kembali dalam batas toleransi.",
          measurement_uncertainty: `±${(intBetween(random, 5, 45) / 100).toFixed(2)}%`,
          reference_standard_used: pick(random, ["Fluke 754 Documenting Process Calibrator", "Beamex MC6", "Standar massa kelas E2 tertelusur SI"]),
          is_reviewed: result !== "FAIL",
          reviewed_by: result !== "FAIL" ? inspector.id : null,
          reviewed_at: result !== "FAIL" ? daysAgo(intBetween(random, 5, 30)) : null,
          status: result === "FAIL" ? "ISSUED" : "REVIEWED",
        },
        ctx.audit,
      );
    }
  }
  return created;
}

// --- Modul 17: evaluasi kinerja kontraktor -----------------------------------

const RECOMMENDATIONS = {
  EXCELLENT: "Kinerja HSE sangat baik sepanjang periode. Direkomendasikan untuk dipertahankan sebagai mitra utama dan dipertimbangkan pada paket pekerjaan berisiko tinggi.",
  GOOD: "Kinerja secara umum baik. Perlu peningkatan pada ketepatan pelaporan man-hours bulanan.",
  SATISFACTORY: "Kinerja memenuhi persyaratan minimum. Diperlukan perbaikan pada kedisiplinan penggunaan APD dan kelengkapan dokumen induksi pekerja baru.",
  POOR: "Kinerja di bawah harapan. Diwajibkan menyerahkan rencana perbaikan dalam 30 hari dan mengikuti pembinaan HSE sebelum penugasan berikutnya.",
  UNACCEPTABLE: "Kinerja tidak dapat diterima. Direkomendasikan penghentian penugasan baru sampai seluruh temuan ditutup dan diverifikasi.",
};

async function seedContractorEvaluations(client, ctx, random) {
  const hseManager = actor(ctx, "HSE_MANAGER");
  const { rows: contractors } = await client.query(
    `SELECT contractor_id, contractor_name, status, overall_risk_rating FROM contractors WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY contractor_name`,
    [ctx.tenantId],
  );

  let created = 0;
  let index = 0;
  for (const contractor of contractors) {
    index += 1;
    if (contractor.status === "REGISTERED") continue; // belum pernah bekerja, belum ada yang bisa dinilai

    const rounds = contractor.status === "BLACKLISTED" || contractor.status === "SUSPENDED" ? 2 : intBetween(random, 2, 3);
    for (let n = 0; n < rounds; n++) {
      created += 1;
      const periodEnd = daysAgo(n * 90 + intBetween(random, 5, 30));
      const periodStart = new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
      // Kontraktor yang di-blacklist punya riwayat penilaian yang menjelaskan
      // KENAPA — dua periode UNACCEPTABLE berturut-turut, persis pemicu BR-07
      // di apps/api. Status tanpa riwayat yang menjelaskannya adalah data yang
      // terlihat benar tapi tidak bisa dipertanggungjawabkan.
      const rating =
        contractor.status === "BLACKLISTED"
          ? "UNACCEPTABLE"
          : contractor.status === "SUSPENDED"
            ? n === 0
              ? "POOR"
              : "UNACCEPTABLE"
            : pick(random, ["EXCELLENT", "GOOD", "GOOD", "SATISFACTORY"]);

      const hseScore = { EXCELLENT: 95, GOOD: 85, SATISFACTORY: 74, POOR: 58, UNACCEPTABLE: 41 }[rating];

      await upsert(
        client,
        "contractor_performance_evaluations",
        "evaluation_id",
        {
          evaluation_id: uuidFor("contractor-eval", `${contractor.contractor_name}#${n}`),
          contractor_id: contractor.contractor_id,
          evaluation_period: "QUARTERLY",
          period_start_date: dateOnly(periodStart),
          period_end_date: dateOnly(periodEnd),
          hse_compliance_score: hseScore + intBetween(random, -3, 3),
          incident_count: rating === "UNACCEPTABLE" ? intBetween(random, 2, 4) : rating === "POOR" ? 1 : 0,
          near_miss_count: intBetween(random, 0, 6),
          man_hours_worked: intBetween(random, 4, 48) * 1000,
          document_compliance_score: hseScore + intBetween(random, -8, 5),
          overall_rating: rating,
          evaluated_by: hseManager.id,
          evaluation_date: dateOnly(new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000)),
          recommendation: RECOMMENDATIONS[rating],
          status: "APPROVED",
        },
        ctx.audit,
      );
    }
  }
  return created;
}

async function seedChildren(client, ctx) {
  const random = seededRandom("children");
  const documentVersions = await seedDocumentVersions(client, ctx, random);
  const obligations = await seedComplianceObligations(client, ctx, random);
  const hiraLines = await seedHiraLines(client, ctx, random);
  const gasTests = await seedGasTests(client, ctx, random);
  const incident = await seedIncidentDepth(client, ctx, random);
  const capa = await seedCapaDepth(client, ctx, random);
  const inspectionFindings = await seedInspectionFindings(client, ctx, random);
  const auditTeam = await seedAuditTeams(client, ctx);
  const planSteps = await seedPlanSteps(client, ctx);
  const maintenance = await seedMaintenance(client, ctx, random);
  const certificates = await seedCalibrationCertificates(client, ctx, random);
  const evaluations = await seedContractorEvaluations(client, ctx, random);

  return {
    documentVersions,
    complianceObligations: obligations,
    hiraHazardLines: hiraLines,
    gasTests,
    incidentInvestigations: incident.investigations,
    incidentRootCauses: incident.causes,
    incidentCapaLinks: incident.links,
    capaRootCauseAnalyses: capa.analyses,
    capaActionPlans: capa.plans,
    inspectionFindings,
    auditTeamMembers: auditTeam,
    emergencyPlanSteps: planSteps,
    maintenanceRecords: maintenance,
    calibrationCertificates: certificates,
    contractorEvaluations: evaluations,
  };
}

module.exports = { seedChildren };
