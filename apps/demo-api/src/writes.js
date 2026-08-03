// Operasi tulis: buat, ubah, hapus, ajukan persetujuan, dan pindah status.
//
// SEMUA PERUBAHAN STATUS LEWAT SATU PINTU. Formulir tidak pernah bisa menulis
// kolom status (lihat NEVER_WRITABLE di fields.js); yang bisa mengubahnya
// hanya dua jalur di berkas ini, dan keduanya memeriksa state machine modul:
//
//   transition — perpindahan yang memang keputusan manusia dan tidak butuh
//                tanda tangan (izin APPROVED -> ACTIVE saat pekerjaannya
//                benar-benar dimulai, ACTIVE -> PENDING_CLOSURE saat selesai).
//
//   submit + act — perpindahan yang MENUNTUT persetujuan. `submit` memindahkan
//                barisnya ke status menunggu lalu memulai instance workflow;
//                status berikutnya baru ditulis ketika seluruh tahap
//                persetujuannya tuntas, oleh mesin workflow, bukan oleh yang
//                mengajukan.
//
// Konsekuensinya: tidak ada satu pun jalan di API ini untuk mengubah izin
// kerja dari DRAFT langsung menjadi APPROVED. Itu bukan efek samping, itu
// tujuannya — dan itulah beda antara sistem manajemen K3 dan basis data
// berkolom status.
const { withRls } = require("./db");
const { sendData, sendProblem, rowToCamel } = require("./http");
const { attachLabels } = require("./labels");
const { describeFields, coerceAndValidate, nextNumber, alignSequence } = require("./fields");
const { definitionIdForEntity } = require("./seed/workflows");
const workflow = require("./workflow");

// --- Konteks percabangan workflow --------------------------------------------
//
// Dihitung SEBELUM instance dimulai dan disimpan di workflow_instances.
// context_data. Mesin workflow tidak pernah membaca tabel domain sendiri —
// pemisahan yang sama dipakai apps/api, dan yang membuatnya bisa melayani
// modul apa pun tanpa tahu apa-apa tentang izin kerja atau HIRA.
const CONTEXT_BUILDERS = {
  /** BR-04 — tahap HSE wajib kalau risikonya HIGH atau jenis izinnya menuntut. */
  async workPermitHseStage(client, tenantId, row) {
    const { rows } = await client.query(
      `SELECT requires_hse_approval FROM work_permit_types WHERE work_permit_type_id = $1 AND tenant_id = $2`,
      [row.work_permit_type_id, tenantId],
    );
    const typeRequires = Boolean(rows[0]?.requires_hse_approval);
    return { hasHseStage: row.risk_level === "HIGH" || typeRequires };
  },

  /** Tahap ketiga HIRA hanya untuk penilaian yang memuat bahaya berisiko ekstrem. */
  async hiraExtremeHazard(client, tenantId, row) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS jumlah FROM hira_hazard_lines
        WHERE hira_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          AND upper(coalesce(risk_level_after, '')) IN ('EKSTREM', 'EXTREME')`,
      [row.hira_id, tenantId],
    );
    return { hasExtremeHazard: (rows[0]?.jumlah || 0) > 0 };
  },

  /**
   * Insiden yang wajib dilaporkan ke regulator. Daftar klasifikasinya
   * mengikuti kewajiban pelaporan kecelakaan kerja dan pencemaran: kematian,
   * hilang hari kerja, kejadian process safety, dan tumpahan ke lingkungan.
   */
  async incidentRegulatoryReport(client, tenantId, row) {
    const WAJIB_LAPOR = ["FATALITY", "LOST_TIME_INJURY", "PROCESS_SAFETY_EVENT", "ENVIRONMENTAL_SPILL"];
    return { hasRegulatoryReport: WAJIB_LAPOR.includes(row.classification) };
  },

  /** Rencana darurat di atas level lokal butuh persetujuan manajemen puncak. */
  async emergencyPlanSeverity(client, tenantId, row) {
    return { severityLevel: row.severity_level };
  },
};

async function buildContext(client, tenantId, moduleDef, row) {
  const approval = moduleDef.write?.approval;
  const context = {};
  if (approval?.context) {
    Object.assign(context, await CONTEXT_BUILDERS[approval.context](client, tenantId, row));
  }
  if (approval?.contextUserColumn) {
    const userId = row[approval.contextUserColumn];
    if (!userId) {
      throw new HttpError(
        409,
        "Approver tahap pertama belum ditentukan.",
        `Kolom ${approval.contextUserColumn} pada baris ini masih kosong, padahal tahap pertama persetujuannya ditugaskan kepada orang itu.`,
      );
    }
    context.contextUserId = userId;
  }
  return context;
}

class HttpError extends Error {
  constructor(status, title, detail) {
    super(title);
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

// --- Pembantu ----------------------------------------------------------------

async function loadRow(client, tenantId, moduleDef, id) {
  const { rows } = await client.query(
    `SELECT * FROM ${moduleDef.table} WHERE ${moduleDef.pk} = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId],
  );
  return rows[0] || null;
}

function statusOf(moduleDef, row) {
  const column = moduleDef.write?.statusColumn;
  return column ? row[column] : null;
}

/**
 * Status yang berada DI DALAM pipa persetujuan — diturunkan dari tabel
 * transisinya, bukan didaftar tangan: sebuah status ada di dalam pipa kalau
 * hasil persetujuan bisa dicapai langsung darinya, ditambah status menunggu
 * pertamanya sendiri.
 *
 * Untuk izin kerja hasilnya PENDING_ISSUER_APPROVAL dan PENDING_HSE_APPROVAL.
 * Keduanya tidak boleh dicapai lewat tombol transisi: yang pertama karena
 * tugas persetujuannya harus ikut dibuat, yang kedua karena mencapainya
 * langsung berarti melompati tanda tangan tahap pertama.
 */
function approvalPipelineStatuses(moduleDef) {
  const approval = moduleDef.write?.approval;
  if (!approval) return [];
  const lifecycle = moduleDef.write.lifecycle || {};
  const inside = Object.keys(lifecycle).filter(
    (status) =>
      lifecycle[status].includes(approval.approvedStatus) || lifecycle[status].includes(approval.rejectedStatus),
  );
  return [...new Set([approval.pendingStatus, ...inside])];
}

function assertTransitionAllowed(moduleDef, from, to) {
  const lifecycle = moduleDef.write?.lifecycle;
  if (!lifecycle) throw new HttpError(409, "Modul ini tidak punya alur status.");
  const allowed = lifecycle[from];
  if (!allowed) throw new HttpError(409, `Status "${from}" tidak dikenal pada alur modul ini.`);
  if (!allowed.includes(to)) {
    throw new HttpError(
      409,
      `Perpindahan status dari ${from} ke ${to} tidak sah.`,
      allowed.length > 0
        ? `Dari ${from}, status yang bisa dituju: ${allowed.join(", ")}.`
        : `${from} adalah status akhir — tidak ada perpindahan lanjutan dari sana.`,
    );
  }
}

async function notify(client, tenantId, { userId, eventType, entityType, entityId, title, body, priority = "MEDIUM" }) {
  await client.query(
    `INSERT INTO notifications (tenant_id, recipient_user_id, event_type, entity_type, entity_id, title, body, priority, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, now())`,
    [tenantId, userId, eventType, entityType, entityId, title, body, priority],
  );
}

// --- Handler -----------------------------------------------------------------

async function handleSchema(res, claims, moduleDef) {
  const fields = await withRls(claims.tenant_id, (client) => describeFields(client, claims.tenant_id, moduleDef));
  const write = moduleDef.write || {};
  sendData(res, {
    slug: moduleDef.slug,
    fields,
    statusColumn: write.statusColumn || null,
    lifecycle: write.lifecycle || null,
    // Status awal sebuah baris baru = kunci pertama lifecycle-nya. Ditentukan
    // di satu tempat supaya formulir, server, dan basis data tidak pernah
    // berbeda pendapat soal "baris baru itu statusnya apa".
    initialStatus: write.lifecycle ? Object.keys(write.lifecycle)[0] : null,
    approval: write.approval
      ? {
          fromStatus: write.approval.fromStatus,
          pendingStatus: write.approval.pendingStatus,
          approvedStatus: write.approval.approvedStatus,
          rejectedStatus: write.approval.rejectedStatus,
          // Dikirim ke klien supaya tombol transisi yang pasti ditolak server
          // tidak pernah digambar sejak awal.
          pipelineStatuses: approvalPipelineStatuses(moduleDef),
        }
      : null,
  });
}

async function handleCreate(res, claims, moduleDef, body) {
  const result = await withRls(claims.tenant_id, async (client) => {
    const fields = await describeFields(client, claims.tenant_id, moduleDef);
    const { values, errors, hasErrors } = coerceAndValidate(fields, body);
    if (hasErrors) return { errors };

    const write = moduleDef.write || {};
    const payload = { ...values, tenant_id: claims.tenant_id, created_by: claims.sub, updated_by: claims.sub };

    if (write.statusColumn && write.lifecycle) payload[write.statusColumn] = Object.keys(write.lifecycle)[0];
    if (write.numberColumn) {
      await alignSequence(client, claims.tenant_id, moduleDef, claims.sub);
      payload[write.numberColumn] = await nextNumber(client, claims.tenant_id, moduleDef, payload, claims.sub);
    }

    const columns = Object.keys(payload);
    const { rows } = await client.query(
      `INSERT INTO ${moduleDef.table} (${columns.map((c) => `"${c}"`).join(", ")}, created_at, updated_at)
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")}, now(), now())
       RETURNING *, ${moduleDef.pk} AS id`,
      columns.map((c) => payload[c]),
    );
    return { row: (await attachLabels(client, rows))[0] };
  });

  if (result.errors) return sendProblem(res, 422, "Data belum lengkap.", JSON.stringify(result.errors));
  sendData(res, rowToCamel(result.row));
}

async function handleUpdate(res, claims, moduleDef, id, body) {
  const result = await withRls(claims.tenant_id, async (client) => {
    const existing = await loadRow(client, claims.tenant_id, moduleDef, id);
    if (!existing) return { notFound: true };

    const fields = await describeFields(client, claims.tenant_id, moduleDef);
    const { values, errors, hasErrors } = coerceAndValidate(fields, body, { partial: true });
    if (hasErrors) return { errors };
    if (Object.keys(values).length === 0) return { row: existing };

    const columns = Object.keys(values);
    const { rows } = await client.query(
      `UPDATE ${moduleDef.table}
          SET ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(", ")}, updated_by = $${columns.length + 1}, updated_at = now()
        WHERE ${moduleDef.pk} = $${columns.length + 2} AND tenant_id = $${columns.length + 3}
        RETURNING *, ${moduleDef.pk} AS id`,
      [...columns.map((c) => values[c]), claims.sub, id, claims.tenant_id],
    );
    return { row: (await attachLabels(client, rows))[0] };
  });

  if (result.notFound) return sendProblem(res, 404, "Data tidak ditemukan.");
  if (result.errors) return sendProblem(res, 422, "Data tidak sah.", JSON.stringify(result.errors));
  sendData(res, rowToCamel(result.row));
}

/**
 * HAPUS = penghapusan lunak (deleted_at diisi), bukan DELETE fisik.
 *
 * Rekaman QHSE punya masa simpan yang diwajibkan — laporan insiden, izin
 * kerja, dan temuan audit adalah bukti kepatuhan yang harus bisa ditelusuri
 * bertahun-tahun sesudahnya. Baris yang benar-benar dihapus juga menghapus
 * jejak auditnya sendiri, dan itu justru temuan yang paling tidak diinginkan
 * saat sertifikasi.
 */
async function handleDelete(res, claims, moduleDef, id) {
  const result = await withRls(claims.tenant_id, async (client) => {
    const existing = await loadRow(client, claims.tenant_id, moduleDef, id);
    if (!existing) return { notFound: true };

    const instance = moduleDef.write?.approval
      ? await workflow.instanceForEntity(client, claims.tenant_id, moduleDef.write.approval.entityType, id)
      : null;
    if (instance && instance.instance.status === "IN_PROGRESS") {
      return {
        conflict: {
          title: "Sedang dalam proses persetujuan.",
          detail: "Batalkan atau selesaikan persetujuannya lebih dulu sebelum menghapus baris ini.",
        },
      };
    }

    await client.query(
      `UPDATE ${moduleDef.table} SET deleted_at = now(), updated_by = $1, updated_at = now()
        WHERE ${moduleDef.pk} = $2 AND tenant_id = $3`,
      [claims.sub, id, claims.tenant_id],
    );
    return { deleted: true };
  });

  if (result.notFound) return sendProblem(res, 404, "Data tidak ditemukan.");
  if (result.conflict) return sendProblem(res, 409, result.conflict.title, result.conflict.detail);
  sendData(res, { deleted: true, id });
}

async function handleTransition(res, claims, moduleDef, id, body) {
  const to = body?.status;
  if (!to) return sendProblem(res, 400, "Status tujuan wajib diisi.");

  try {
    const result = await withRls(claims.tenant_id, async (client) => {
      const existing = await loadRow(client, claims.tenant_id, moduleDef, id);
      if (!existing) return { notFound: true };

      const from = statusOf(moduleDef, existing);
      assertTransitionAllowed(moduleDef, from, to);

      // DUA PENJAGAAN, dan keduanya menutup lubang yang sama dari sisi
      // berlawanan.
      const approval = moduleDef.write?.approval;
      if (approval) {
        // (1) Status menunggu-persetujuan tidak boleh dicapai lewat pintu ini.
        // Tanpa ini, sebuah baris bisa terlihat "menunggu persetujuan" padahal
        // tidak ada satu pun tugas persetujuan yang pernah dibuat.
        if (approvalPipelineStatuses(moduleDef).includes(to)) {
          return {
            conflict: {
              title: "Gunakan pengajuan persetujuan.",
              detail: `${to} adalah status di dalam alur persetujuan. Mencapainya lewat tombol transisi berarti melompati tanda tangan yang seharusnya ada di antaranya.`,
            },
          };
        }

        // Selama persetujuannya BERJALAN, status tidak boleh dipindahkan sama
        // sekali dari pintu ini. Tanpa ini, sebuah izin yang sedang menunggu
        // supervisor bisa dibatalkan atau digeser manual sementara tugas
        // persetujuannya tetap hidup di kotak masuk orang lain — dua sumber
        // kebenaran tentang berkas yang sama.
        const berjalan = await workflow.instanceForEntity(client, claims.tenant_id, approval.entityType, id);
        if (berjalan && berjalan.instance.status === "IN_PROGRESS") {
          return {
            conflict: {
              title: "Sedang menunggu persetujuan.",
              detail: "Status berikutnya ditentukan oleh hasil persetujuan yang sedang berjalan, bukan dari halaman ini.",
            },
          };
        }
        // (2) Hasil persetujuan tidak boleh DITULIS TANGAN.
        //
        // Ini penjagaan terpenting di berkas ini. Tabel transisi izin kerja
        // memang membolehkan PENDING_HSE_APPROVAL -> APPROVED — perpindahan
        // itu sah, tapi HANYA sebagai hasil tanda tangan. Tanpa penjagaan ini
        // halaman detail menampilkan tombol "Approved" pada izin yang sedang
        // menunggu HSE, dan siapa pun yang bisa membuka halamannya bisa
        // menyetujui izin kerja tanpa satu pun persetujuan — persis hal yang
        // seluruh modul ini dibangun untuk mencegahnya. Ditemukan saat
        // memeriksa halaman detail di peramban, bukan lewat pembacaan kode.
        //
        // Status hasil hanya ditulis handleAct(), setelah mesin workflow
        // menyatakan instance-nya tuntas.
        if (to === approval.approvedStatus || to === approval.rejectedStatus) {
          return {
            conflict: {
              title: "Hanya bisa lewat persetujuan.",
              detail: `Status ${to} adalah hasil proses persetujuan dan tidak bisa ditetapkan langsung. Ajukan persetujuan, lalu penyetujunya yang memutuskan.`,
            },
          };
        }
      }

      const { rows } = await client.query(
        `UPDATE ${moduleDef.table} SET "${moduleDef.write.statusColumn}" = $1, updated_by = $2, updated_at = now()
          WHERE ${moduleDef.pk} = $3 AND tenant_id = $4 RETURNING *, ${moduleDef.pk} AS id`,
        [to, claims.sub, id, claims.tenant_id],
      );
      return { row: (await attachLabels(client, rows))[0], from };
    });

    if (result.notFound) return sendProblem(res, 404, "Data tidak ditemukan.");
    if (result.conflict) return sendProblem(res, 409, result.conflict.title, result.conflict.detail);
    sendData(res, rowToCamel(result.row));
  } catch (error) {
    if (error instanceof HttpError) return sendProblem(res, error.status, error.title, error.detail);
    throw error;
  }
}

async function handleSubmit(res, claims, moduleDef, id) {
  const approval = moduleDef.write?.approval;
  if (!approval) return sendProblem(res, 409, "Modul ini tidak punya alur persetujuan.");
  const definitionId = definitionIdForEntity(approval.entityType);
  if (!definitionId) return sendProblem(res, 500, "Definisi workflow untuk modul ini belum disemai.");

  try {
    const result = await withRls(claims.tenant_id, async (client) => {
      const existing = await loadRow(client, claims.tenant_id, moduleDef, id);
      if (!existing) return { notFound: true };

      const from = statusOf(moduleDef, existing);
      const running = await workflow.instanceForEntity(client, claims.tenant_id, approval.entityType, id);
      if (running && running.instance.status === "IN_PROGRESS") {
        return { conflict: { title: "Sudah diajukan.", detail: "Persetujuannya masih berjalan." } };
      }

      // Yang boleh diajukan: baris di status awal alurnya, ATAU baris yang
      // SUDAH berada di dalam pipa persetujuan tapi tidak punya satu pun
      // instance.
      //
      // Yang kedua ada karena data yang ditulis langsung lewat SQL (data demo
      // disemai begitu) bisa lahir di tengah pipa. Tanpa jalur ini baris
      // semacam itu buntu selamanya: tidak bisa diajukan karena statusnya
      // bukan status awal, dan — setelah penjagaan (2) di handleTransition —
      // tidak bisa disetujui manual juga. Buntu diam-diam lebih buruk daripada
      // salah: tidak ada pesan apa pun yang memberitahu jalan keluarnya.
      //
      // "Di dalam pipa" DITURUNKAN dari tabel transisinya, bukan didaftar
      // tangan: sebuah status ada di dalam pipa kalau hasil persetujuan bisa
      // dicapai langsung darinya. Untuk izin kerja itu berarti
      // PENDING_ISSUER_APPROVAL dan PENDING_HSE_APPROVAL, keduanya tanpa perlu
      // disebutkan — dan kalau tabel transisinya berubah, daftar ini ikut.
      const bolehDiajukan = from === approval.fromStatus || (!running && approvalPipelineStatuses(moduleDef).includes(from));
      if (!bolehDiajukan) {
        return {
          conflict: {
            title: "Belum siap diajukan.",
            detail: `Hanya baris berstatus ${approval.fromStatus} yang bisa diajukan; yang ini berstatus ${from}.`,
          },
        };
      }

      const contextData = await buildContext(client, claims.tenant_id, moduleDef, existing);
      const instance = await workflow.startInstance(client, {
        tenantId: claims.tenant_id,
        entityType: approval.entityType,
        entityId: id,
        definitionId,
        contextData,
      });

      if (approval.pendingStatus !== from) {
        await client.query(
          `UPDATE ${moduleDef.table} SET "${moduleDef.write.statusColumn}" = $1, updated_by = $2, updated_at = now()
            WHERE ${moduleDef.pk} = $3 AND tenant_id = $4`,
          [approval.pendingStatus, claims.sub, id, claims.tenant_id],
        );
      }

      const { rows: tasks } = await client.query(
        `SELECT assigned_to FROM workflow_tasks WHERE instance_id = $1 AND status = 'PENDING'`,
        [instance.instance_id],
      );
      for (const task of tasks) {
        await notify(client, claims.tenant_id, {
          userId: task.assigned_to,
          eventType: "WORKFLOW_TASK_ASSIGNED",
          entityType: approval.entityType,
          entityId: id,
          title: "Tugas persetujuan baru",
          body: `Ada ${moduleDef.slug} yang menunggu persetujuan Anda.`,
          priority: "HIGH",
        });
      }
      return { submitted: true, instanceId: instance.instance_id, approvers: tasks.length };
    });

    if (result.notFound) return sendProblem(res, 404, "Data tidak ditemukan.");
    if (result.conflict) return sendProblem(res, 409, result.conflict.title, result.conflict.detail);
    sendData(res, result);
  } catch (error) {
    if (error instanceof HttpError) return sendProblem(res, error.status, error.title, error.detail);
    // Galat "tidak ada approver" adalah salah konfigurasi, bukan kesalahan
    // pemakai — tapi ia HARUS terbaca di layar, bukan jadi 500 tanpa isi.
    if (String(error.message).includes("Tidak ada approver")) {
      return sendProblem(res, 409, "Tidak ada approver.", error.message);
    }
    throw error;
  }
}

async function handleApprovalPanel(res, claims, moduleDef, id) {
  const approval = moduleDef.write?.approval;
  if (!approval) return sendData(res, null);
  const data = await withRls(claims.tenant_id, (client) =>
    workflow.instanceForEntity(client, claims.tenant_id, approval.entityType, id),
  );
  if (!data) return sendData(res, null);
  sendData(res, {
    instance: rowToCamel(data.instance),
    stages: data.stages.map(rowToCamel),
    tasks: data.tasks.map(rowToCamel),
    // Supaya tombol Setuju/Tolak hanya muncul bagi orang yang memang
    // ditugaskan — bukan bagi siapa pun yang kebetulan membuka halamannya.
    // Tahap yang sedang berjalan saja — alasan sama dengan saringan di
    // pendingTasksFor(): tugas rekan pada tahap yang sudah lewat tetap
    // berstatus PENDING dan tidak boleh memunculkan tombol Setuju.
    myPendingTaskId:
      data.tasks.find(
        (task) =>
          task.status === "PENDING" &&
          task.assigned_to === claims.sub &&
          task.stage_id === data.instance.current_stage_id,
      )?.task_id || null,
  });
}

async function handleMyApprovals(res, claims) {
  const tasks = await withRls(claims.tenant_id, (client) => workflow.pendingTasksFor(client, claims.tenant_id, claims.sub));
  sendData(res, tasks.map(rowToCamel));
}

/** Modul mana yang memiliki entityType ini — dipakai untuk menulis status
 *  domainnya setelah persetujuan tuntas, dan untuk menautkan kotak
 *  persetujuan ke halaman detail yang benar. */
function moduleForEntityType(modules, entityType) {
  return modules.find((moduleDef) => moduleDef.write?.approval?.entityType === entityType) || null;
}

async function handleAct(res, claims, modules, taskId, body) {
  const action = body?.action;
  if (action !== "APPROVE" && action !== "REJECT") {
    return sendProblem(res, 400, "Aksi harus APPROVE atau REJECT.");
  }

  const result = await withRls(claims.tenant_id, async (client) => {
    const acted = await workflow.actOnTask(client, {
      tenantId: claims.tenant_id,
      taskId,
      action,
      comment: body?.comment,
      actingUserId: claims.sub,
    });
    if (acted.notFound || acted.forbidden || acted.alreadyProcessed) return acted;

    // Instance tuntas -> tulis status domainnya. Inilah yang di apps/api
    // dikerjakan listener atas WORKFLOW_INSTANCE_COMPLETED_EVENT; di sini
    // dikerjakan langsung karena tidak ada event bus, tapi pembagian
    // tanggung jawabnya sama: mesin memutuskan hasil, modul memutuskan
    // artinya bagi barisnya.
    if (acted.completed) {
      const moduleDef = moduleForEntityType(modules, acted.completed.entityType);
      if (moduleDef) {
        const approval = moduleDef.write.approval;
        const nextStatus = acted.completed.status === "APPROVED" ? approval.approvedStatus : approval.rejectedStatus;
        await client.query(
          `UPDATE ${moduleDef.table} SET "${moduleDef.write.statusColumn}" = $1, updated_by = $2, updated_at = now()
            WHERE ${moduleDef.pk} = $3 AND tenant_id = $4`,
          [nextStatus, claims.sub, acted.completed.entityId, claims.tenant_id],
        );
        acted.domainStatus = nextStatus;
        acted.slug = moduleDef.slug;
      }
    }

    // Tahap berikutnya sudah dibuat -> beri tahu approver barunya.
    if (!acted.completed) {
      const { rows: fresh } = await client.query(
        `SELECT assigned_to, i.entity_type, i.entity_id FROM workflow_tasks t
           JOIN workflow_instances i ON i.instance_id = t.instance_id
          WHERE t.instance_id = $1 AND t.status = 'PENDING'`,
        [acted.task.instance_id],
      );
      for (const task of fresh) {
        await notify(client, claims.tenant_id, {
          userId: task.assigned_to,
          eventType: "WORKFLOW_TASK_ASSIGNED",
          entityType: task.entity_type,
          entityId: task.entity_id,
          title: "Tugas persetujuan baru",
          body: "Tahap sebelumnya sudah disetujui; giliran Anda.",
          priority: "HIGH",
        });
      }
    }
    return acted;
  });

  if (result.notFound) return sendProblem(res, 404, "Tugas persetujuan tidak ditemukan.");
  if (result.forbidden) {
    return sendProblem(res, 403, "Bukan tugas Anda.", "Tugas persetujuan ini ditugaskan kepada orang lain.");
  }
  if (result.alreadyProcessed) {
    return sendProblem(res, 409, "Sudah diproses.", "Tugas ini sudah disetujui atau ditolak sebelumnya.");
  }
  sendData(res, {
    task: rowToCamel(result.task),
    completed: result.completed || null,
    domainStatus: result.domainStatus || null,
    slug: result.slug || null,
  });
}

module.exports = {
  handleSchema,
  handleCreate,
  handleUpdate,
  handleDelete,
  handleTransition,
  handleSubmit,
  handleApprovalPanel,
  handleMyApprovals,
  handleAct,
};
