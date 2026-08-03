"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@qhse/ui-components";
import { ApiError } from "../../../lib/api-client";
import { fetchInbox, type InboxTask } from "../../../lib/records";
import { MODULES } from "../../../lib/modules";
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

function titleForSlug(slug: string): string {
  return MODULES.find((module) => module.slug === slug)?.title ?? slug;
}

/**
 * Sisa waktu terhadap SLA tahap. Dihitung dari saat tugasnya dibuat, bukan
 * dari saat pengajuannya dimulai: SLA melekat pada tahap, dan tahap kedua
 * baru mulai berdetak ketika tahap pertama selesai.
 */
function slaState(createdAt: string, slaHours: number): { text: string; tone: "good" | "warning" | "critical" } {
  const deadline = new Date(createdAt).getTime() + slaHours * 3600_000;
  const remainingHours = (deadline - Date.now()) / 3600_000;
  if (remainingHours < 0) return { text: `Lewat ${Math.abs(Math.round(remainingHours))} jam`, tone: "critical" };
  if (remainingHours < slaHours * 0.25) return { text: `Sisa ${Math.round(remainingHours)} jam`, tone: "warning" };
  return { text: `Sisa ${Math.round(remainingHours)} jam`, tone: "good" };
}

export default function ApprovalsPage() {
  const [tasks, setTasks] = useState<InboxTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInbox()
      .then((loaded) => {
        if (!cancelled) setTasks(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : "API tidak terjangkau.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">Persetujuan</p>
          <h1 className="qhse-page__title">Kotak Persetujuan</h1>
          <p className="qhse-page__subtitle">
            {error
              ? "Tidak ada data yang bisa ditampilkan."
              : tasks === null
                ? "Memuat…"
                : tasks.length === 0
                  ? "Tidak ada yang menunggu persetujuan Anda."
                  : `${tasks.length} tugas menunggu tanda tangan Anda.`}
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
          Kotak persetujuan hanya menampilkan tugas yang ditugaskan kepada Anda berdasarkan peran. Kalau Anda menunggu
          sesuatu yang tidak muncul di sini, kemungkinan besar ia sedang berada di tahap yang penyetujunya orang lain.
        </p>
      )}

      <div className="qhse-inbox">
        {(tasks ?? []).map((task) => {
          const slug = SLUG_BY_ENTITY[task.entityType];
          const sla = slaState(task.createdAt, task.slaHours);
          return (
            <article key={task.taskId} className="qhse-inbox__item">
              <div className="qhse-inbox__main">
                <p className="qhse-inbox__module">{slug ? titleForSlug(slug) : task.moduleCode}</p>
                <h2 className="qhse-inbox__stage">
                  Tahap {task.sequenceNo}: {task.stageName}
                </h2>
                <p className="qhse-inbox__flow">{task.definitionName}</p>
              </div>
              <div className="qhse-inbox__meta">
                <StatusBadge tone={sla.tone} label={sla.text} />
                <span className="qhse-inbox__since">Ditugaskan {formatCell(task.createdAt, "datetime")}</span>
                {slug ? (
                  <Link className="qhse-inbox__open" href={`/modules/${slug}/${task.entityId}`}>
                    Buka & putuskan →
                  </Link>
                ) : (
                  <span className="qhse-inbox__since">Modul {task.moduleCode} belum punya halaman detail.</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
