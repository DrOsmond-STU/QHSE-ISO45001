"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@qhse/i18n";
import { useLocale } from "../../../../lib/locale";
import { DataTable, Toggle } from "@qhse/ui-components";
import { apiFetch, ApiError } from "../../../../lib/api-client";
import { useHasAccessToken } from "../../../../lib/use-auth-token";

type ChannelCode = "IN_APP" | "EMAIL" | "WHATSAPP" | "TELEGRAM";

interface EventCategoryDto {
  code: string;
  label: string;
}

interface MatrixCellDto {
  eventCategory: string;
  categoryLabel: string;
  channelCode: ChannelCode;
  isEnabled: boolean;
  editable: boolean;
}

interface PreferencesResponseDto {
  categories: EventCategoryDto[];
  matrix: MatrixCellDto[];
}

// Baris DataTable — matriks (kategori x channel) diratakan jadi 1 baris per
// kategori, 1 kolom per channel (cell = MatrixCellDto), supaya bisa reuse
// @qhse/ui-components DataTable (pola sama tabel list lain di codebase ini)
// alih-alih tabel HTML mentah terpisah.
interface CategoryRow {
  [key: string]: unknown;
  categoryCode: string;
  categoryLabel: string;
  IN_APP: MatrixCellDto;
  EMAIL: MatrixCellDto;
  WHATSAPP: MatrixCellDto;
  TELEGRAM: MatrixCellDto;
}

const CHANNELS: ChannelCode[] = ["IN_APP", "EMAIL", "WHATSAPP", "TELEGRAM"];

function buildRows(data: PreferencesResponseDto): CategoryRow[] {
  return data.categories.map((category) => {
    const row = { categoryCode: category.code, categoryLabel: category.label } as CategoryRow;
    for (const channelCode of CHANNELS) {
      row[channelCode] = data.matrix.find((cell) => cell.eventCategory === category.code && cell.channelCode === channelCode)!;
    }
    return row;
  });
}

// Modul 25 §12 "Halaman Preferensi Notifikasi — matriks kategori event x
// channel (toggle on/off)". IN_APP TIDAK diberi Toggle sama sekali (BR-02
// — bukan cuma disabled, memang bukan aksi yang mungkin), pola sama
// StatusBadge yang TIDAK PERNAH cuma warna: cell IN_APP tetap ada teks
// "Selalu aktif" eksplisit.
export default function NotificationPreferencesPage() {
  const { locale } = useLocale();
  const hasToken = useHasAccessToken();
  const [data, setData] = useState<PreferencesResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetch<PreferencesResponseDto>("/notifications/preferences");
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : t("notifications.preferences.error", locale));
    }
  }, []);

  useEffect(() => {
    if (hasToken) void load();
  }, [hasToken, load]);

  async function handleToggle(cell: MatrixCellDto, nextChecked: boolean) {
    const key = `${cell.eventCategory}:${cell.channelCode}`;
    setSavingKey(key);
    setError(null);
    try {
      await apiFetch("/notifications/preferences", {
        method: "PUT",
        body: { eventCategory: cell.eventCategory, channelCode: cell.channelCode, isEnabled: nextChecked },
      });
      await load(); // reload penuh — sederhana & selalu konsisten dgn server, matriks tidak besar (14 kategori)
    } catch {
      setError(t("notifications.preferences.saveError", locale));
    } finally {
      setSavingKey(null);
    }
  }

  if (hasToken === null) {
    return null;
  }
  if (hasToken === false) {
    return <p>{t("notifications.preferences.unauthenticated", locale)}</p>;
  }

  return (
    <section>
      <header style={{ marginBottom: "var(--qhse-space-4)" }}>
        <Link href="/notifications" style={{ fontFamily: "var(--qhse-font-ui)", fontSize: "var(--qhse-text-body-sm-size)", color: "var(--qhse-text-secondary)" }}>
          {t("notifications.preferences.backToInbox", locale)}
        </Link>
        <h1 style={{ fontFamily: "var(--qhse-font-ui)", fontSize: "var(--qhse-text-h1-size)", margin: "var(--qhse-space-2) 0 0" }}>
          {t("notifications.preferences.title", locale)}
        </h1>
        <p style={{ fontFamily: "var(--qhse-font-ui)", color: "var(--qhse-text-secondary)", margin: "var(--qhse-space-1) 0 0" }}>
          {t("notifications.preferences.subtitle", locale)}
        </p>
      </header>

      {error && (
        <p role="alert" style={{ color: "var(--qhse-status-critical)", fontFamily: "var(--qhse-font-ui)" }}>
          {error}
        </p>
      )}

      {data === null && !error && (
        <p style={{ fontFamily: "var(--qhse-font-ui)", color: "var(--qhse-text-secondary)" }}>{t("notifications.preferences.loading", locale)}</p>
      )}

      {data && (
        <DataTable<CategoryRow>
          getRowId={(row) => row.categoryCode}
          rows={buildRows(data)}
          columns={[
            { key: "categoryLabel", header: t("notifications.preferences.column.category", locale) },
            ...CHANNELS.map((channelCode) => ({
              key: channelCode,
              header: t(`notifications.channel.${channelCode}`),
              render: (row: CategoryRow) => {
                const cell = row[channelCode];
                const key = `${cell.eventCategory}:${cell.channelCode}`;
                if (!cell.editable) {
                  return (
                    <span
                      title={t("notifications.preferences.inAppHint", locale)}
                      style={{ fontFamily: "var(--qhse-font-ui)", fontSize: "var(--qhse-text-body-sm-size)", color: "var(--qhse-text-muted)" }}
                    >
                      {t("notifications.preferences.inAppAlwaysOn", locale)}
                    </span>
                  );
                }
                return (
                  <Toggle
                    checked={cell.isEnabled}
                    disabled={savingKey === key}
                    onChange={(checked) => handleToggle(cell, checked)}
                    label={`${t(`notifications.channel.${channelCode}`)} — ${row.categoryLabel}`}
                    hideLabel
                  />
                );
              },
            })),
          ]}
        />
      )}
    </section>
  );
}
