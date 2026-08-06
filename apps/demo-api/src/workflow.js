// Mesin workflow — CERMINAN apps/api/src/platform/workflow-engine.
//
// Ditulis ulang dalam SQL mentah, bukan disimulasikan. Tabelnya sama persis
// (workflow_definitions, workflow_stages, workflow_transitions,
// workflow_instances, workflow_tasks), aturannya sama, dan hasilnya baris
// basis data yang sama. Kalau apps/api kelak berjalan di lingkungan yang
// mampu menampungnya, ia membaca persetujuan yang dibuat di sini apa adanya —
// bukan menemukan struktur asing yang harus dimigrasi lebih dulu.
//
// Yang DIPERTAHANKAN dari aslinya, karena semuanya menentukan kebenaran:
//   - Satu REJECT di mana pun langsung menggagalkan tahap, terlepas dari
//     aturan penyelesaian paralel (gagal-tertutup).
//   - Transisi dipilih dengan menyaring triggerAction dulu, lalu kondisi
//     JSON Logic, urut priority menaik; yang cocok PERTAMA menang.
//   - actOnTask mengunci barisnya (SELECT ... FOR UPDATE) sebelum membaca
//     status, jadi klik ganda menghasilkan satu persetujuan, bukan dua.
//   - Mesin ini TIDAK PERNAH menyentuh tabel domain. Ia mengembalikan status
//     akhir, dan pemanggilnya yang memutuskan artinya bagi izin kerja atau
//     dokumen — persis pemisahan yang dipakai apps/api lewat event.
//
// Yang BERBEDA, dan alasannya:
//   - Tanpa pustaka json-logic-js. demo-api sengaja hanya bergantung pada pg
//     dan argon2 (lihat banner server.js), dan operator yang benar-benar
//     dipakai definisi workflow di repositori ini hanya `==` atas `var`.
//     Penilai di bawah mendukung sedikit lebih banyak dari itu dan MELEMPAR
//     galat untuk operator yang tidak dikenalnya — bukan mengembalikan false.
//     Mengembalikan false berarti sebuah transisi diam-diam tidak pernah
//     terpilih, dan gejalanya muncul jauh dari sebabnya: pengajuan yang
//     berhenti di tahap pertama tanpa satu pun pesan galat.

const TASK_PENDING = "PENDING";

// --- JSON Logic (subset) -----------------------------------------------------

function resolveVar(path, context) {
  if (path === "" || path === null || path === undefined) return context;
  return String(path)
    .split(".")
    .reduce((current, key) => (current === null || current === undefined ? undefined : current[key]), context);
}

function applyLogic(rule, context) {
  if (rule === null || typeof rule !== "object") return rule;
  if (Array.isArray(rule)) return rule.map((item) => applyLogic(item, context));

  const keys = Object.keys(rule);
  if (keys.length !== 1) {
    throw new Error(`Kondisi JSON Logic harus punya tepat satu operator, ditemukan ${keys.length}.`);
  }
  const operator = keys[0];
  const raw = rule[operator];
  const args = Array.isArray(raw) ? raw : [raw];

  switch (operator) {
    case "var":
      return resolveVar(applyLogic(args[0], context), context);
    case "==":
      // Longgar, sama seperti json-logic-js: "1" == 1 bernilai benar.
      // eslint-disable-next-line eqeqeq
      return applyLogic(args[0], context) == applyLogic(args[1], context);
    case "===":
      return applyLogic(args[0], context) === applyLogic(args[1], context);
    case "!=":
      // eslint-disable-next-line eqeqeq
      return applyLogic(args[0], context) != applyLogic(args[1], context);
    case "!==":
      return applyLogic(args[0], context) !== applyLogic(args[1], context);
    case ">":
      return applyLogic(args[0], context) > applyLogic(args[1], context);
    case ">=":
      return applyLogic(args[0], context) >= applyLogic(args[1], context);
    case "<":
      return applyLogic(args[0], context) < applyLogic(args[1], context);
    case "<=":
      return applyLogic(args[0], context) <= applyLogic(args[1], context);
    case "!":
      return !applyLogic(args[0], context);
    case "!!":
      return Boolean(applyLogic(args[0], context));
    case "and":
      return args.every((arg) => Boolean(applyLogic(arg, context)));
    case "or":
      return args.some((arg) => Boolean(applyLogic(arg, context)));
    case "in": {
      const needle = applyLogic(args[0], context);
      const haystack = applyLogic(args[1], context);
      if (Array.isArray(haystack)) return haystack.includes(needle);
      if (typeof haystack === "string") return haystack.includes(String(needle));
      return false;
    }
    default:
      throw new Error(
        `Operator JSON Logic "${operator}" tidak didukung penilai demo-api. ` +
          `Tambahkan dukungannya di workflow.js — JANGAN biarkan ia bernilai false diam-diam.`,
      );
  }
}

/** Kondisi kosong = transisi tanpa syarat, selalu cocok. */
function evaluateCondition(condition, contextData) {
  if (condition === null || condition === undefined) return true;
  return Boolean(applyLogic(condition, contextData || {}));
}

// --- Logika murni ------------------------------------------------------------

function pickTransition(candidates, triggerAction, contextData) {
  const sorted = candidates.filter((c) => c.trigger_action === triggerAction).sort((a, b) => a.priority - b.priority);
  for (const candidate of sorted) {
    if (evaluateCondition(candidate.condition, contextData)) return candidate;
  }
  return null;
}

/**
 * Satu REJECT di mana pun menggagalkan tahap, TERLEPAS dari aturan
 * penyelesaian. Persetujuan paralel tidak pernah "menang" lewat penolakan
 * anggota lain — prinsip gagal-tertutup yang sama dipakai di seluruh
 * platform ini.
 */
function evaluateStageCompletion(taskStatuses, rule) {
  if (taskStatuses.some((status) => status === "REJECTED")) return { complete: true, outcome: "REJECT" };
  if (rule === "ANY_ONE_APPROVE") {
    if (taskStatuses.some((status) => status === "APPROVED")) return { complete: true, outcome: "APPROVE" };
    return { complete: false, outcome: null };
  }
  if (taskStatuses.length > 0 && taskStatuses.every((status) => status === "APPROVED")) {
    return { complete: true, outcome: "APPROVE" };
  }
  return { complete: false, outcome: null };
}

// --- Penyelesaian approver ---------------------------------------------------

async function resolveApprovers(client, stage, tenantId, contextData) {
  const natural = await resolveNaturalApprovers(client, stage, tenantId, contextData);
  if (!stage.allow_delegation) return natural;
  return substituteActiveDelegates(client, natural, stage.approver_role_id, tenantId);
}

async function resolveNaturalApprovers(client, stage, tenantId, contextData) {
  switch (stage.approver_type) {
    case "SPECIFIC_USER":
      if (!stage.approver_user_id) throw new Error("workflow_stages.approver_user_id kosong untuk SPECIFIC_USER.");
      return [stage.approver_user_id];

    case "ROLE_IN_SCOPE": {
      if (!stage.approver_role_id) throw new Error("workflow_stages.approver_role_id kosong untuk ROLE_IN_SCOPE.");
      // Tenant-wide, sama seperti apps/api. Mempersempit ke scope entity yang
      // sedang disetujui menuntut tahu lokasi entity itu, dan tanda tangan
      // fungsi ini belum membawanya — ditunda dengan sadar di sana, ditunda
      // dengan sadar di sini juga, bukan diam-diam berbeda.
      const { rows } = await client.query(
        `SELECT DISTINCT user_id FROM user_roles
          WHERE tenant_id = $1 AND role_id = $2 AND status = 'ACTIVE'
            AND valid_from <= CURRENT_DATE
            AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)`,
        [tenantId, stage.approver_role_id],
      );
      return rows.map((row) => row.user_id);
    }

    case "CONTEXT_USER": {
      const contextUserId = contextData?.contextUserId;
      if (typeof contextUserId !== "string" || contextUserId.length === 0) {
        throw new Error("context_data.contextUserId kosong untuk approverType CONTEXT_USER.");
      }
      return [contextUserId];
    }

    case "REPORTING_LINE":
      throw new Error("approverType REPORTING_LINE belum didukung — menunggu data garis pelaporan HRIS.");

    default:
      throw new Error(`approverType "${stage.approver_type}" tidak dikenal.`);
  }
}

/**
 * Delegasi TIDAK dikejar berantai (kalau penerima delegasi juga sedang
 * mendelegasikan ke orang lain). Alasannya sama dengan di apps/api: belum ada
 * validasi anti-siklus, dan rantai A→B→A akan berputar tanpa henti.
 */
async function substituteActiveDelegates(client, userIds, stageApproverRoleId, tenantId) {
  if (userIds.length === 0) return userIds;
  const { rows } = await client.query(
    `SELECT delegator_user_id, delegate_user_id FROM workflow_delegations
      WHERE tenant_id = $1 AND delegator_user_id = ANY($2::uuid[]) AND is_active = true
        AND date_from <= CURRENT_DATE AND date_to >= CURRENT_DATE
        AND ($3::uuid IS NULL AND role_id IS NULL OR role_id IS NULL OR role_id = $3::uuid)`,
    [tenantId, userIds, stageApproverRoleId],
  );
  const map = new Map(rows.map((row) => [row.delegator_user_id, row.delegate_user_id]));
  return [...new Set(userIds.map((id) => map.get(id) ?? id))];
}

// --- Operasi inti ------------------------------------------------------------

async function createTasksForStage(client, tenantId, instanceId, stageId, contextData) {
  const { rows: stages } = await client.query(`SELECT * FROM workflow_stages WHERE stage_id = $1 AND tenant_id = $2`, [
    stageId,
    tenantId,
  ]);
  const stage = stages[0];
  if (!stage) throw new Error(`workflow_stages ${stageId} tidak ditemukan.`);

  const approverIds = await resolveApprovers(client, stage, tenantId, contextData);
  if (approverIds.length === 0) {
    throw new Error(
      `Tidak ada approver untuk tahap "${stage.stage_name}". ` +
        `Periksa user_roles: peran approver tahap ini belum dipegang siapa pun.`,
    );
  }
  for (const userId of approverIds) {
    await client.query(
      `INSERT INTO workflow_tasks (tenant_id, instance_id, stage_id, assigned_to, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PENDING', now(), now())`,
      [tenantId, instanceId, stageId, userId],
    );
  }
  return approverIds;
}

async function startInstance(client, { tenantId, entityType, entityId, definitionId, contextData = {} }) {
  const { rows: stages } = await client.query(
    `SELECT * FROM workflow_stages WHERE workflow_definition_id = $1 AND tenant_id = $2 ORDER BY sequence_no ASC LIMIT 1`,
    [definitionId, tenantId],
  );
  const firstStage = stages[0];
  if (!firstStage) throw new Error(`Definisi workflow ${definitionId} tidak punya satu pun tahap.`);

  const { rows } = await client.query(
    `INSERT INTO workflow_instances
       (tenant_id, workflow_definition_id, entity_type, entity_id, current_stage_id, context_data, status, started_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'IN_PROGRESS', now())
     RETURNING *`,
    [tenantId, definitionId, entityType, entityId, firstStage.stage_id, JSON.stringify(contextData)],
  );
  const instance = rows[0];
  await createTasksForStage(client, tenantId, instance.instance_id, firstStage.stage_id, contextData);
  return instance;
}

async function evaluateTransition(client, tenantId, instanceId) {
  const { rows: instances } = await client.query(
    `SELECT * FROM workflow_instances WHERE instance_id = $1 AND tenant_id = $2`,
    [instanceId, tenantId],
  );
  const instance = instances[0];
  if (!instance) throw new Error(`workflow_instances ${instanceId} tidak ditemukan.`);
  if (instance.status !== "IN_PROGRESS" || !instance.current_stage_id) {
    return { stageComplete: false, completed: null };
  }

  const { rows: stages } = await client.query(`SELECT * FROM workflow_stages WHERE stage_id = $1`, [
    instance.current_stage_id,
  ]);
  const stage = stages[0];

  const { rows: siblings } = await client.query(
    `SELECT status FROM workflow_tasks WHERE instance_id = $1 AND stage_id = $2`,
    [instanceId, stage.stage_id],
  );
  const completion = evaluateStageCompletion(
    siblings.map((row) => row.status),
    stage.parallel_completion_rule || "ALL_APPROVE",
  );
  if (!completion.complete || completion.outcome === null) return { stageComplete: false, completed: null };

  const triggerAction = completion.outcome === "APPROVE" ? "APPROVE" : "REJECT";
  const { rows: candidates } = await client.query(`SELECT * FROM workflow_transitions WHERE from_stage_id = $1`, [
    stage.stage_id,
  ]);
  const picked = pickTransition(candidates, triggerAction, instance.context_data || {});
  if (!picked) {
    throw new Error(
      `Tidak ada workflow_transitions yang cocok dari tahap "${stage.stage_name}" untuk aksi ${triggerAction} — konfigurasi workflow tidak lengkap.`,
    );
  }

  if (picked.to_stage_id) {
    await client.query(`UPDATE workflow_instances SET current_stage_id = $1 WHERE instance_id = $2`, [
      picked.to_stage_id,
      instanceId,
    ]);
    await createTasksForStage(client, tenantId, instanceId, picked.to_stage_id, instance.context_data || {});
    return { stageComplete: true, completed: null };
  }

  const finalStatus = picked.result_status || (triggerAction === "APPROVE" ? "APPROVED" : "REJECTED");
  await client.query(
    `UPDATE workflow_instances SET status = $1, completed_at = now(), current_stage_id = NULL
      WHERE instance_id = $2`,
    [finalStatus, instanceId],
  );
  return {
    stageComplete: true,
    completed: { instanceId, status: finalStatus, entityType: instance.entity_type, entityId: instance.entity_id },
  };
}

async function actOnTask(client, { tenantId, taskId, action, comment, actingUserId }) {
  // Kunci barisnya SEBELUM membaca statusnya. Panggilan kedua yang bersamaan
  // menunggu di kunci ini, lalu membaca status yang sudah berubah dan berhenti
  // dengan aman — bukan menyetujui dua kali.
  await client.query(`SELECT task_id FROM workflow_tasks WHERE task_id = $1 AND tenant_id = $2 FOR UPDATE`, [
    taskId,
    tenantId,
  ]);
  const { rows } = await client.query(`SELECT * FROM workflow_tasks WHERE task_id = $1 AND tenant_id = $2`, [
    taskId,
    tenantId,
  ]);
  const task = rows[0];
  if (!task) return { notFound: true };
  if (task.status !== TASK_PENDING) return { alreadyProcessed: true, task, completed: null };
  if (task.assigned_to !== actingUserId) return { forbidden: true, task };

  const { rows: updatedRows } = await client.query(
    `UPDATE workflow_tasks SET status = $1, acted_at = now(), acted_by = $2, comment = $3, updated_at = now()
      WHERE task_id = $4 RETURNING *`,
    [action === "APPROVE" ? "APPROVED" : "REJECTED", actingUserId, comment || null, taskId],
  );

  const result = await evaluateTransition(client, tenantId, task.instance_id);
  return { alreadyProcessed: false, task: updatedRows[0], completed: result.completed };
}

// --- Pembacaan untuk layar ---------------------------------------------------

/** Instance terbaru untuk sebuah entitas, lengkap dengan tahap dan tugasnya. */
async function instanceForEntity(client, tenantId, entityType, entityId) {
  const { rows: instances } = await client.query(
    `SELECT i.*, d.name AS definition_name, s.stage_name AS current_stage_name, s.sequence_no AS current_stage_no
       FROM workflow_instances i
       JOIN workflow_definitions d ON d.workflow_definition_id = i.workflow_definition_id
       LEFT JOIN workflow_stages s ON s.stage_id = i.current_stage_id
      WHERE i.tenant_id = $1 AND i.entity_type = $2 AND i.entity_id = $3
      ORDER BY i.started_at DESC NULLS LAST
      LIMIT 1`,
    [tenantId, entityType, entityId],
  );
  const instance = instances[0];
  if (!instance) return null;

  const [{ rows: stages }, { rows: tasks }] = await Promise.all([
    client.query(`SELECT * FROM workflow_stages WHERE workflow_definition_id = $1 ORDER BY sequence_no ASC`, [
      instance.workflow_definition_id,
    ]),
    client.query(
      `SELECT t.*, u.full_name AS assignee_name, a.full_name AS actor_name, s.stage_name, s.sequence_no
         FROM workflow_tasks t
         JOIN workflow_stages s ON s.stage_id = t.stage_id
         LEFT JOIN users u ON u.user_id = t.assigned_to
         LEFT JOIN users a ON a.user_id = t.acted_by
        WHERE t.instance_id = $1
        ORDER BY s.sequence_no ASC, t.created_at ASC`,
      [instance.instance_id],
    ),
  ]);

  return { instance, stages, tasks };
}

/** Tugas persetujuan yang menunggu pengguna ini. */
async function pendingTasksFor(client, tenantId, userId) {
  const { rows } = await client.query(
    `SELECT t.task_id, t.instance_id, t.status, t.created_at,
            s.stage_name, s.sequence_no, s.sla_hours,
            i.entity_type, i.entity_id, i.started_at,
            d.name AS definition_name, d.module_code
       FROM workflow_tasks t
       JOIN workflow_stages s ON s.stage_id = t.stage_id
       JOIN workflow_instances i ON i.instance_id = t.instance_id
       JOIN workflow_definitions d ON d.workflow_definition_id = i.workflow_definition_id
      WHERE t.tenant_id = $1 AND t.assigned_to = $2 AND t.status = 'PENDING'
        AND i.status = 'IN_PROGRESS'
        -- HANYA tugas pada tahap yang sedang berjalan. Ketika satu rekan
        -- menyetujui lebih dulu pada tahap ANY_ONE_APPROVE, tugas milik yang
        -- lain tetap berstatus PENDING di basis data (enumnya tidak punya
        -- nilai "terlewati"), dan tanpa saringan ini ia akan menggantung di
        -- kotak masuk selamanya — mengundang orang menyetujui sesuatu yang
        -- sudah lewat.
        AND t.stage_id = i.current_stage_id
      ORDER BY t.created_at ASC`,
    [tenantId, userId],
  );
  return rows;
}

module.exports = {
  startInstance,
  actOnTask,
  evaluateTransition,
  instanceForEntity,
  pendingTasksFor,
  // Diekspor untuk diuji tanpa basis data.
  evaluateCondition,
  pickTransition,
  evaluateStageCompletion,
};
