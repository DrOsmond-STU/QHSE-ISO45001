"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, StatusBadge } from "@qhse/ui-components";
import { ApiError } from "../../../../../lib/api-client";
import {
  actOnTask,
  deleteRecord,
  fetchApproval,
  fetchSchema,
  submitRecord,
  transitionRecord,
  type ApprovalPanel,
  type ModuleSchema,
} from "../../../../../lib/records";
import { humanizeEnum, statusTone } from "../../../../../lib/status-tone";
import { formatCell } from "../../../../../lib/format";
import { useLocale } from "../../../../../lib/locale";

// Bilah aksi + panel persetujuan pada halaman detail.
//
// TOMBOL YANG ADA DI LAYAR = TRANSISI YANG SAH DARI STATUS SEKARANG. Daftarnya
// datang dari state machine modul di server, bukan dari daftar tombol yang
// ditulis tangan. Konsekuensinya tidak ada tombol yang menghasilkan penolakan
// 409 saat ditekan — dan sebaliknya, tidak ada perpindahan sah yang tidak
// punya tombolnya. Menulis daftar tombol terpisah dari state machine berarti
// keduanya akan berbeda, dan yang salah selalu yang terlihat di layar.

export function RecordActions({
  slug,
  title,
  id,
  record,
  onChanged,
  onEdit,
}: {
  slug: string;
  title: string;
  id: string;
  record: Record<string, unknown>;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const [schema, setSchema] = useState<ModuleSchema | null>(null);
  const [panel, setPanel] = useState<ApprovalPanel | null>(null);
  const { t } = useLocale();  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comment, setComment] = useState("");

  const reload = useCallback(async () => {
    const [loadedSchema, loadedPanel] = await Promise.all([
      fetchSchema(slug).catch(() => null),
      fetchApproval(slug, id).catch(() => null),
    ]);
    setSchema(loadedSchema);
    setPanel(loadedPanel);
  }, [slug, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(action: () => Promise<unknown>, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: okText });
      await reload();
      onChanged();
    } catch (error: unknown) {
      // Detail dari server dipakai apa adanya: ia sudah menjelaskan status
      // apa saja yang bisa dituju dari status sekarang, dan itu jauh lebih
      // berguna daripada "gagal memproses permintaan".
      const text =
        error instanceof ApiError
          ? [error.problem?.title, error.problem?.detail].filter(Boolean).join(" ")
          : "API tidak terjangkau.";
      setMessage({ tone: "bad", text });
    } finally {
      setBusy(false);
    }
  }

  if (!schema || !schema.statusColumn || !schema.lifecycle) return null;

  const current = String(record[toCamel(schema.statusColumn)] ?? "");
  const allowed = schema.lifecycle[current] ?? [];
  const approval = schema.approval;
  const running = panel?.instance.status === "IN_PROGRESS";
  const canSubmit =
    Boolean(approval) && !running && (current === approval!.fromStatus || current === approval!.pendingStatus);

  // Tombol transisi manual disaring, dan server menolak hal yang sama — yang
  // di sini semata agar tidak ada tombol yang pasti gagal saat ditekan:
  //
  //   selama berjalan   tidak ada transisi manual sama sekali; status
  //                     berikutnya ditentukan hasil persetujuan
  //   pipelineStatuses  status DI DALAM alur persetujuan (menunggu issuer,
  //                     menunggu HSE) — mencapainya lewat tombol berarti
  //                     melompati tanda tangan di antaranya
  //   approved/rejected hasil tanda tangan, bukan sesuatu yang diketik
  //
  // Ketiganya ditemukan dengan membuka halamannya di peramban, bukan dengan
  // membaca kode: tabel transisi izin kerja memang membolehkan
  // PENDING_HSE_APPROVAL -> APPROVED, dan tombolnya benar-benar muncul.
  const hiddenByApproval = new Set(
    approval ? [...approval.pipelineStatuses, approval.approvedStatus, approval.rejectedStatus] : [],
  );
  const manualTargets = running ? [] : allowed.filter((target) => !hiddenByApproval.has(target));

  return (
    <div className="qhse-actions">
      <div className="qhse-actions__bar">
        <span className="qhse-actions__status">
          {t("Status saat ini:", "Current status:")}{" "}
          {statusTone(current) ? (
            <StatusBadge tone={statusTone(current)!} label={humanizeEnum(current)} />
          ) : (
            <strong>{humanizeEnum(current)}</strong>
          )}
        </span>

        <span className="qhse-actions__spacer" />

        <Button variant="default" onClick={onEdit} disabled={busy}>
          {t("Ubah", "Edit")}
        </Button>

        {canSubmit && (
          <Button
            variant="accent"
            disabled={busy}
            onClick={() => run(() => submitRecord(slug, id), t("Pengajuan terkirim ke penyetuju.", "Submitted to the approver."))}
          >
            {t("Ajukan persetujuan", "Submit for approval")}
          </Button>
        )}

        {manualTargets.map((target) => (
          <Button
            key={target}
            variant="default"
            disabled={busy}
            onClick={() => run(() => transitionRecord(slug, id, target), t(`Status menjadi ${humanizeEnum(target)}.`, `Status changed to ${humanizeEnum(target)}.`))}
          >
            {humanizeEnum(target)}
          </Button>
        ))}

        {confirmDelete ? (
          <>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => run(() => deleteRecord(slug, id), t(`${title} ditandai terhapus.`, `${title} marked as deleted.`))}
            >
              {t("Yakin hapus", "Confirm delete")}
            </Button>
            <Button variant="default" disabled={busy} onClick={() => setConfirmDelete(false)}>
              {t("Batal", "Cancel")}
            </Button>
          </>
        ) : (
          <Button variant="default" disabled={busy} onClick={() => setConfirmDelete(true)}>
            {t("Hapus", "Delete")}
          </Button>
        )}
      </div>

      {message && (
        <p className={message.tone === "ok" ? "qhse-actions__ok" : "qhse-actions__bad"} role="status">
          {message.text}
        </p>
      )}

      {running && (
        <p className="qhse-actions__note">
          {t(
            "Sedang menunggu persetujuan, jadi statusnya tidak bisa dipindahkan dari sini. Perpindahan berikutnya ditentukan oleh hasil persetujuan di bawah.",
            "An approval is in progress, so the status cannot be moved from here. The next transition is decided by the approval outcome below.",
          )}
        </p>
      )}

      {panel && (
        <ApprovalTrail
          panel={panel}
          busy={busy}
          comment={comment}
          onComment={setComment}
          onAct={(action) =>
            run(
              () => actOnTask(panel.myPendingTaskId!, action, comment),
              action === "APPROVE" ? t("Persetujuan Anda tercatat.", "Your approval has been recorded.") : t("Penolakan Anda tercatat.", "Your rejection has been recorded."),
            ).then(() => setComment(""))
          }
        />
      )}
    </div>
  );
}

function ApprovalTrail({
  panel,
  busy,
  comment,
  onComment,
  onAct,
}: {
  panel: ApprovalPanel;
  busy: boolean;
  comment: string;
  onComment: (value: string) => void;
  onAct: (action: "APPROVE" | "REJECT") => void;
}) {
  const { t } = useLocale();
  const instanceTone =
    panel.instance.status === "APPROVED" ? "good" : panel.instance.status === "REJECTED" ? "critical" : "warning";

  return (
    <div className="qhse-approval">
      <header className="qhse-approval__head">
        <div>
          <h2 className="qhse-approval__title">{t("Jejak persetujuan", "Approval trail")}</h2>
          <p className="qhse-approval__caption">{panel.instance.definitionName}</p>
        </div>
        <StatusBadge tone={instanceTone} label={humanizeEnum(panel.instance.status)} />
      </header>

      <ol className="qhse-approval__stages">
        {panel.stages.map((stage) => {
          const tasks = panel.tasks.filter((task) => task.sequenceNo === stage.sequenceNo);
          const isCurrent = panel.instance.currentStageId === stage.stageId;
          const decided = tasks.find((task) => task.status === "APPROVED" || task.status === "REJECTED");
          return (
            <li
              key={stage.stageId}
              className={`qhse-approval__stage${isCurrent ? " qhse-approval__stage--current" : ""}${
                decided ? " qhse-approval__stage--done" : ""
              }`}
            >
              <div className="qhse-approval__stagehead">
                <span className="qhse-approval__seq">{stage.sequenceNo}</span>
                <span className="qhse-approval__stagename">{stage.stageName}</span>
                <span className="qhse-approval__sla">SLA {stage.slaHours} {t("jam", "h")}</span>
              </div>

              {tasks.length === 0 ? (
                <p className="qhse-approval__pending">{t("Belum dijalankan.", "Not started yet.")}</p>
              ) : (
                <ul className="qhse-approval__tasks">
                  {tasks.map((task) => (
                    <li key={task.taskId}>
                      <span className="qhse-approval__who">{task.assigneeName ?? "—"}</span>
                      {task.status === "PENDING" ? (
                        <span className="qhse-approval__waiting">{t("menunggu", "waiting")}</span>
                      ) : (
                        <>
                          <StatusBadge
                            tone={task.status === "APPROVED" ? "good" : "critical"}
                            label={task.status === "APPROVED" ? t("Setuju", "Approved") : t("Tolak", "Rejected")}
                          />
                          <span className="qhse-approval__when">{formatCell(task.actedAt, "datetime")}</span>
                        </>
                      )}
                      {task.comment && <span className="qhse-approval__comment">“{task.comment}”</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/* Tombol Setuju/Tolak HANYA muncul kalau server menyatakan ada tugas
          tertunda milik pengguna ini. Pemeriksaan sesungguhnya tetap di server
          (yang menolak 403 kalau bukan assignee-nya); yang di sini semata agar
          orang tidak ditawari tombol yang pasti gagal. */}
      {panel.myPendingTaskId && (
        <div className="qhse-approval__act">
          <label htmlFor="komentar">{t("Komentar (opsional)", "Comment (optional)")}</label>
          <textarea
            id="komentar"
            rows={2}
            value={comment}
            onChange={(event) => onComment(event.target.value)}
            placeholder={t("Catatan pemeriksaan, syarat tambahan, atau alasan penolakan.", "Review notes, additional conditions, or the reason for rejection.")}
          />
          <div className="qhse-approval__buttons">
            <Button variant="accent" disabled={busy} onClick={() => onAct("APPROVE")}>
              {t("Setujui", "Approve")}
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => onAct("REJECT")}>
              {t("Tolak", "Reject")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function toCamel(column: string): string {
  return column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
