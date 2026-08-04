"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, DataTable, StatusBadge } from "@qhse/ui-components";
import { ApiError, apiFetchWithMeta } from "../../../../lib/api-client";
import { displayValue } from "../../../../lib/format";
import { useLocale } from "../../../../lib/locale";
import { findModule, type ModuleDefinition } from "../../../../lib/modules";
import { statusTone } from "../../../../lib/status-tone";
import { RecordForm } from "./RecordForm";
import "../../records.css";

// SATU halaman daftar untuk KELIMA BELAS modul, digerakkan lib/modules.ts —
// lihat banner comment di sana untuk alasannya.
//
// Tombol "Tambah" memakai formulir yang dibangun dari skema server
// (RecordForm), jadi halaman ini tidak tahu apa-apa tentang kolom modul mana
// pun. Status TIDAK ada di formulir itu: baris baru selalu lahir di status
// awal alur modulnya, dan perpindahan berikutnya dilakukan dari halaman
// detail lewat pengajuan persetujuan atau perpindahan status.

const PAGE_SIZE = 20;

type Row = Record<string, unknown>;

/** Pesan yang bisa dibaca manusia untuk kegagalan yang sudah kita antisipasi.
 *
 *  Pesan galat IKUT diterjemahkan, dan itu bukan kelengkapan yang berlebihan:
 *  justru pada saat gagal seseorang paling butuh membaca kalimatnya sampai
 *  selesai, dan pembaca berbahasa Inggris yang menemui kalimat Indonesia di
 *  sana akan menyimpulkan aplikasinya rusak, bukan sesinya berakhir. */
function describeError(error: unknown, t: (id: string, en: string) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return t("Sesi Anda sudah berakhir. Silakan keluar lalu masuk kembali.", "Your session has ended. Please sign out and sign in again.");
    if (error.status === 403) {
      return t(
        "Anda tidak punya izin untuk modul ini, atau modulnya tidak termasuk dalam langganan tenant ini.",
        "You do not have permission for this module, or it is not part of this tenant's subscription.",
      );
    }
    return error.message;
  }
  return t(
    "Tidak bisa menghubungi server API. Periksa NEXT_PUBLIC_API_URL dan pastikan API sedang berjalan.",
    "Cannot reach the API server. Check NEXT_PUBLIC_API_URL and make sure the API is running.",
  );
}

export default function ModuleListPage() {
  const params = useParams<{ slug: string }>();
  const { locale, t } = useLocale();
  const module = findModule(params.slug, locale);

  if (!module) {
    return (
      <section>
        <h1 className="qhse-page__title">{t("Modul tidak dikenal", "Unknown module")}</h1>
        <p className="qhse-page__message">
          {t("Tidak ada modul dengan alamat", "There is no module at")} <code>{params.slug}</code>.{" "}
          {t("Pilih salah satu modul dari menu di samping.", "Pick a module from the menu beside this page.")}
        </p>
      </section>
    );
  }

  return <ModuleList module={module} />;
}

function ModuleList({ module }: { module: ModuleDefinition }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Kembali ke halaman 1 saat berpindah modul — komponen ini dipakai ulang
  // oleh React saat slug berubah, jadi state paginasinya ikut terbawa.
  useEffect(() => {
    setPage(1);
    setRows(null);
    setCreating(false);
  }, [module.slug]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetchWithMeta<Row[]>(module.endpoint, { query: { page, limit: PAGE_SIZE } });
      setRows(result.data);
      setTotal((result.meta as { total?: number } | undefined)?.total ?? result.data.length);
    } catch (err) {
      setRows(null);
      setError(describeError(err, t));
    }
  }, [module.endpoint, page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">{module.moduleNumber}</p>
          <h1 className="qhse-page__title">{module.title}</h1>
          <p className="qhse-page__subtitle">
            {error
              ? t("Tidak ada data yang bisa ditampilkan.", "There is no data to show.")
              : rows === null
                ? t("Memuat…", "Loading…")
                : t(
                    `${total} data · menampilkan halaman ${page} dari ${totalPages}`,
                    `${total} records · showing page ${page} of ${totalPages}`,
                  )}
          </p>
        </div>
        <Button variant="accent" onClick={() => setCreating((value) => !value)}>
          {creating ? t("Tutup formulir", "Close form") : t(`Tambah ${module.title}`, `Add ${module.title}`)}
        </Button>
      </header>

      {creating && (
        <RecordForm
          slug={module.slug}
          title={module.title}
          onSaved={(id) => router.push(`/modules/${module.slug}/${id}`)}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && (
        <p role="alert" className="qhse-page__error">
          {error}
        </p>
      )}

      {rows !== null && (
        <>
          <DataTable
            rows={rows}
            getRowId={(row) => String(row.id)}
            emptyMessage={t("Belum ada data pada modul ini.", "No data in this module yet.")}
            columns={module.columns.map((column, index) => ({
              key: column.key,
              header: column.header,
              numeric: column.type === "number",
              render: (row: Row) => {
                const text = displayValue(row, column.key, column.type, locale);

                if (column.type === "status") {
                  const tone = statusTone(row[column.key]);
                  return tone ? <StatusBadge tone={tone} label={text} /> : <span>{text}</span>;
                }

                // Kolom pertama jadi pintu masuk ke halaman detail (pola
                // "List/Table Page" DESIGN.md §8) — bukan seluruh baris,
                // supaya teks di kolom lain tetap bisa diseleksi/disalin.
                if (index === 0) {
                  return <Link href={`/modules/${module.slug}/${String(row.id)}`}>{text}</Link>;
                }

                return <span>{text}</span>;
              },
            }))}
          />

          {total > PAGE_SIZE && (
            <nav className="qhse-page__pagination" aria-label={t("Paginasi", "Pagination")}>
              <Button variant="default" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("Sebelumnya", "Previous")}
              </Button>
              <span>
                {t(`Halaman ${page} dari ${totalPages}`, `Page ${page} of ${totalPages}`)}
              </span>
              <Button
                variant="default"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("Berikutnya", "Next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
