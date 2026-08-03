"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DataTable, StatusBadge } from "@qhse/ui-components";
import { ApiError, apiFetch } from "../../../../../lib/api-client";
import { displayValue, EMPTY_PLACEHOLDER, formatCell } from "../../../../../lib/format";
import { findModule, type DetailField, type ModuleChild, type ModuleColumn, type ModuleDefinition } from "../../../../../lib/modules";
import { statusTone } from "../../../../../lib/status-tone";
import { RecordActions } from "./RecordActions";
import { RecordForm } from "../RecordForm";
import "../../../records.css";

// Halaman detail generik — pasangan dari modules/[slug]/page.tsx.
//
// Yang ditampilkan adalah field yang DIPILIH registri modul, dikelompokkan
// per bagian, bukan seluruh kolom yang dikembalikan API. Versi sebelumnya
// menampilkan semuanya dengan alasan kejujuran, dan hasilnya justru halaman
// berisi UUID mentah dan belasan tanda pisah yang oleh penggunanya dibaca
// sebagai "modulnya kosong". Alasan lengkapnya ada di banner lib/modules.ts.
//
// Bagian yang SELURUH fieldnya kosong tidak dirender sama sekali. Bagian
// kosong berjudul "Notulen dan kesimpulan" pada audit yang belum
// dilaksanakan tidak memberi informasi apa pun yang tidak sudah disampaikan
// oleh statusnya, dan hanya menambah ruang kosong yang harus dilewati mata.

type Record_ = Record<string, unknown>;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesi Anda sudah berakhir. Silakan keluar lalu masuk kembali.";
    if (error.status === 403) return "Anda tidak punya izin untuk melihat data ini.";
    if (error.status === 404) return "Data tidak ditemukan.";
    return error.message;
  }
  return "Tidak bisa menghubungi server API.";
}

export default function ModuleDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const module = findModule(params.slug);

  if (!module) {
    return (
      <section>
        <h1 className="qhse-page__title">Modul tidak dikenal</h1>
        <p className="qhse-page__message">
          Tidak ada modul dengan alamat <code>{params.slug}</code>.
        </p>
      </section>
    );
  }

  return <ModuleDetail module={module} id={params.id} />;
}

function ModuleDetail({ module, id }: { module: ModuleDefinition; id: string }) {
  const [record, setRecord] = useState<Record_ | null>(null);
  const [childRows, setChildRows] = useState<Record<string, Record_[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    let loaded: Record_;
    try {
      loaded = await apiFetch<Record_>(`${module.endpoint}/${id}`);
      setRecord(loaded);
    } catch (err) {
      setRecord(null);
      setError(describeError(err));
      return;
    }

    // Daftar anak bersifat pelengkap — kalau salah satu gagal, detail
    // utamanya TETAP tampil dan yang gagal cukup ditampilkan kosong.
    // Menjatuhkan seluruh halaman karena satu tabel pendukung bermasalah
    // menghilangkan informasi yang sudah berhasil diambil.
    for (const child of module.children ?? []) {
      try {
        const rows = await apiFetch<Record_[]>(`${module.endpoint}/${id}${child.pathSuffix}`);
        setChildRows((previous) => ({ ...previous, [child.pathSuffix]: rows }));
      } catch {
        setChildRows((previous) => ({ ...previous, [child.pathSuffix]: [] }));
      }
    }
  }, [module, id]);

  useEffect(() => {
    setRecord(null);
    setChildRows({});
    void load();
  }, [load]);

  if (error) {
    return (
      <section>
        <p role="alert" className="qhse-page__error">
          {error}
        </p>
        <Link href={`/modules/${module.slug}`}>← Kembali ke {module.title}</Link>
      </section>
    );
  }

  if (!record) return <p className="qhse-page__message">Memuat…</p>;

  const subtitle = module.subtitleField ? formatCell(record[module.subtitleField]) : null;

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">
            {module.moduleNumber} · <Link href={`/modules/${module.slug}`}>{module.title}</Link>
          </p>
          <h1 className="qhse-page__title">{displayValue(record, module.labelField)}</h1>
          {subtitle && subtitle !== EMPTY_PLACEHOLDER && <p className="qhse-page__subtitle">{subtitle}</p>}
        </div>
      </header>

      <RecordActions
        slug={module.slug}
        title={module.title}
        id={id}
        record={record}
        onChanged={() => void load()}
        onEdit={() => setEditing((value) => !value)}
      />

      {editing && (
        <RecordForm
          slug={module.slug}
          title={module.title}
          recordId={id}
          initialRow={record}
          onSaved={() => {
            setEditing(false);
            void load();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {module.detailSections.map((section) => (
        <DetailCard key={section.title} title={section.title} fields={section.fields} record={record} />
      ))}

      {(module.children ?? []).map((child) => (
        <ChildTable key={child.pathSuffix} child={child} rows={childRows[child.pathSuffix]} />
      ))}
    </section>
  );
}

function DetailCard({ title, fields, record }: { title: string; fields: DetailField[]; record: Record_ }) {
  const rendered = fields.map((field) => ({ field, text: displayValue(record, field.key, field.type) }));
  if (rendered.every((entry) => entry.text === EMPTY_PLACEHOLDER)) return null;

  const narrow = rendered.filter((entry) => !entry.field.wide);
  const wide = rendered.filter((entry) => entry.field.wide && entry.text !== EMPTY_PLACEHOLDER);

  return (
    <div className="qhse-detail-card" style={{ marginBottom: "var(--qhse-space-5)" }}>
      <h2 className="qhse-detail-card__title">{title}</h2>

      {narrow.length > 0 && (
        <dl className="qhse-detail-grid">
          {narrow.map(({ field, text }) => {
            const tone = field.type === "status" ? statusTone(record[field.key]) : null;
            return (
              <div key={field.key} style={{ display: "contents" }}>
                <dt>{field.label}</dt>
                <dd>{tone ? <StatusBadge tone={tone} label={text} /> : text}</dd>
              </div>
            );
          })}
        </dl>
      )}

      {wide.map(({ field, text }) => (
        <div key={field.key} className="qhse-detail-prose">
          {narrow.length > 0 || wide.length > 1 ? <h3>{field.label}</h3> : null}
          {/* Teks panjang disemai dengan pemisah baris ganda (lihat isiDokumen()
              di penyemai), jadi dipecah jadi paragraf agar terbaca sebagai
              dokumen, bukan sebagai satu blok padat. */}
          {String(text)
            .split(/\n\n+/)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      ))}
    </div>
  );
}

function ChildTable({ child, rows }: { child: ModuleChild; rows: Record_[] | undefined }) {
  return (
    <section style={{ marginTop: "var(--qhse-space-6)" }}>
      <h2 className="qhse-page__section-title">{child.title}</h2>
      <p className="qhse-page__subtitle" style={{ marginBottom: "var(--qhse-space-4)" }}>
        {rows === undefined ? "Memuat…" : `${rows.length} data`}
      </p>
      <DataTable
        rows={rows ?? []}
        getRowId={(row) => String(row.id)}
        emptyMessage={rows === undefined ? "Memuat…" : child.emptyMessage}
        columns={child.columns.map((column: ModuleColumn) => ({
          key: column.key,
          header: column.header,
          numeric: column.type === "number" || column.type === "currency",
          render: (row: Record_) => {
            const text = displayValue(row, column.key, column.type);
            if (column.type === "status") {
              const tone = statusTone(row[column.key]);
              return tone ? <StatusBadge tone={tone} label={text} /> : <span>{text}</span>;
            }
            return <span>{text}</span>;
          },
        }))}
      />
    </section>
  );
}
