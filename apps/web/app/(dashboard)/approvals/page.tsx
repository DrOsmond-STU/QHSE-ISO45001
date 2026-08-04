"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@qhse/ui-components";
import { ApiError } from "../../../lib/api-client";
import { fetchInbox, type InboxTask } from "../../../lib/records";
import { useLocale, type Locale } from "../../../lib/locale";
import { findModule } from "../../../lib/modules";
import { formatCell } from "../../../lib/format";
import "../records.css";

// Kotak persetujuan — tugas yang menunggu tanda tangan pengguna ini.
//
// Isinya datang dari workflow_tasks, disaring ke tahap yang SEDANG berjalan.
// Tugas milik rekan pada tahap yang sudah lewat tetap berstatus PENDING di
// basis data (enum statusnya tidak punya nilai "terlewati"), dan tanpa
// saringan itu ia akan menggantung di sini selamanya — mengundang orang
// menyetujui sesuatu yang keputusannya sudah diambil.

/** entity_type dari mesin workflow -> modul yang halamannya harus dibuka. */
const SLUG_BY_ENTITY: Record<string, string> = {
  work_permit: "work-permits",
  document: "documents",
  hira_assessment: "hira-assessments",
  incident_report: "incident-reports",
  capa_register: "capa-registers",
  audit: "audits",
  ncr_record: "ncr-records",
  environmental_aspect_impact: "environmental-aspect-impacts",
  emergency_response_plan: "emergency-response-plans",
  contractor: "contractors",
  inspection_record: "inspection-records",
};

function titleForSlug(slug: string, locale: Locale): string {
  return findModule(slug, locale)?.title ?? slug;
}

/**
 * Sisa waktu terhadap SLA tahap. Dihitung dari saat tugasnya dibuat, bukan
 * dari saat pengajuannya dimulai: SLA melekat pada tahap, dan tahap kedua
 * baru mulai berdetak ketika tahap pertama selesai.
 */
function slaState(
  createdAt: string,
  slaHours: number,
  t: (id: string, en: string) => string,
): { text: string; tone: "good" | "warning" | "critical" } {
  const deadline = new Date(createdAt).getTime() + slaHours * 3600_000;
  const remainingHours = (deadline - Date.now()) / 3600_000;
  const lewat = Math.abs(Math.round(remainingHours));
  const sisa = Math.round(remainingHours);
  if (remainingHours < 0) return { text: t(`Lewat ${lewat} jam`, `${lewat} h overdue`), tone: "critical" };
  if (remainingHours < slaHours * 0.25) return { text: t(`Sisa ${sisa} jam`, `${sisa} h left`), tone: "warning" };
  return { text: t(`Sisa ${sisa} jam`, `${sisa} h left`), tone: "good" };
}

export default function ApprovalsPage() {
  const { locale, t } = useLocale();
  const [tasks, setTasks] = useState<InboxTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInbox()
      .then((loaded) => {
        if (!cancelled) setTasks(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : t("API tidak terjangkau.", "API unreachable."));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">{t("Persetujuan", "Approvals")}</p>
          <h1 className="qhse-page__title">{t("Kotak Persetujuan", "Approval Inbox")}</h1>
          <p className="qhse-page__subtitle">
            {error
              ? t("Tidak ada data yang bisa ditampilkan.", "There is no data to show.")
              : tasks === null
                ? t("Memuat…", "Loading…")
                : tasks.length === 0
                  ? t("Tidak ada yang menunggu persetujuan Anda.", "Nothing is waiting for your approval.")
                  : t(`${tasks.length} tugas menunggu tanda tangan Anda.`, `${tasks.length} task(s) awaiting your sign-off.`)}
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="qhse-page__error">
          {error}
        </p>
      )}

      {tasks !== null && tasks.length === 0 && (
        <p className="qhse-dash__muted">
          {t(
            "Kotak persetujuan hanya menampilkan tugas yang ditugaskan kepada Anda berdasarkan peran. Kalau Anda menunggu sesuatu yang tidak muncul di sini, kemungkinan besar ia sedang berada di tahap yang penyetujunya orang lain.",
            "The inbox only shows tasks assigned to you by role. If something you are waiting on does not appear here, it is most likely sitting at a stage whose approver is someone else.",
          )}
        </p>
      )}

      <div className="qhse-inbox">
        {(tasks ?? []).map((task) => {
          const slug = SLUG_BY_ENTITY[task.entityType];
          const sla = slaState(task.createdAt, task.slaHours, t);
          return (
            <article key={task.taskId} className="qhse-inbox__item">
              <div className="qhse-inbox__main">
                <p className="qhse-inbox__module">{slug ? titleForSlug(slug, locale) : task.moduleCode}</p>
                <h2 className="qhse-inbox__stage">
                  {t("Tahap", "Stage")} {task.sequenceNo}: {task.stageName}
                </h2>
                <p className="qhse-inbox__flow">{task.definitionName}</p>
              </div>
              <div className="qhse-inbox__meta">
                <StatusBadge tone={sla.tone} label={sla.text} />
                <span className="qhse-inbox__since">
                  {t("Ditugaskan", "Assigned")} {formatCell(task.createdAt, "datetime")}
                </span>
                {slug ? (
                  <Link className="qhse-inbox__open" href={`/modules/${slug}/${task.entityId}`}>
                    {t("Buka & putuskan", "Open & decide")} →
                  </Link>
                ) : (
                  <span className="qhse-inbox__since">
                    {t(`Modul ${task.moduleCode} belum punya halaman detail.`, `Module ${task.moduleCode} has no detail page yet.`)}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
