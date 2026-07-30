"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@qhse/i18n";
import { Button, DataTable, StatusBadge, StatusTone } from "@qhse/ui-components";
import { apiFetch, apiFetchWithMeta, ApiError } from "../../../lib/api-client";
import { useHasAccessToken } from "../../../lib/use-auth-token";

interface NotificationDto {
  // Index signature — DataTable<T> (packages/ui-components) mensyaratkan
  // `T extends Record<string, unknown>` (butuh row[col.key] dinamis di
  // implementasinya). TIDAK melemahkan type-safety akses properti
  // BERNAMA di bawah (row.title dst. tetap typed benar) — cuma
  // memuaskan constraint generic component.
  [key: string]: unknown;
  id: string;
  title: string;
  body: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const PRIORITY_TONE: Record<NotificationDto["priority"], StatusTone> = {
  LOW: "good",
  MEDIUM: "warning",
  HIGH: "serious",
  CRITICAL: "critical",
};

const PAGE_SIZE = 20;
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

// Modul 25 §12 "Bell Icon In-App" / dropdown daftar notifikasi — di sini
// direalisasikan sbg HALAMAN penuh (bukan dropdown topbar, krn topbar itu
// sendiri belum ada — task 0.14, lihat banner comment dashboard-shell.css),
// mengikuti template "List/Table Page" DESIGN.md §8: filter/CTA bar ->
// tabel -> pagination.
export default function NotificationsInboxPage() {
  const hasToken = useHasAccessToken();
  const [notifications, setNotifications] = useState<NotificationDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [listResult, countResult] = await Promise.all([
        apiFetchWithMeta<NotificationDto[]>("/notifications", { query: { page, limit: PAGE_SIZE } }),
        apiFetch<{ count: number }>("/notifications/unread-count"),
      ]);
      setNotifications(listResult.data);
      setTotal((listResult.meta as { total?: number } | undefined)?.total ?? listResult.data.length);
      setUnreadCount(countResult.count);
    } catch (err) {
      setNotifications(null);
      setError(err instanceof ApiError ? err.message : t("notifications.inbox.error"));
    }
  }, [page]);

  useEffect(() => {
    if (hasToken) void load();
  }, [hasToken, load]);

  async function handleMarkAsRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" });
      await load();
    } catch {
      setError(t("notifications.inbox.error"));
    }
  }

  async function handleMarkAllAsRead() {
    setMarkingAllRead(true);
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      await load();
    } catch {
      setError(t("notifications.inbox.error"));
    } finally {
      setMarkingAllRead(false);
    }
  }

  if (hasToken === null) {
    return null; // SSR/hydration sekejap — belum tahu status login (lihat use-auth-token.ts)
  }

  if (hasToken === false) {
    return <p>{t("notifications.inbox.unauthenticated")}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--qhse-space-4)", flexWrap: "wrap", gap: "var(--qhse-space-3)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--qhse-font-ui)", fontSize: "var(--qhse-text-h1-size)", margin: 0 }}>{t("notifications.inbox.title")}</h1>
          {unreadCount !== null && unreadCount > 0 && (
            <p style={{ fontFamily: "var(--qhse-font-ui)", color: "var(--qhse-text-secondary)", margin: "var(--qhse-space-1) 0 0" }}>
              {t("notifications.inbox.unreadCount", "id", { count: unreadCount })}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--qhse-space-2)" }}>
          <Link href="/notifications/preferences">
            <Button variant="default">{t("notifications.inbox.viewPreferences")}</Button>
          </Link>
          <Button variant="default" onClick={handleMarkAllAsRead} disabled={markingAllRead || !unreadCount}>
            {t("notifications.inbox.markAllRead")}
          </Button>
        </div>
      </header>

      {error && (
        <p role="alert" style={{ color: "var(--qhse-status-critical)", fontFamily: "var(--qhse-font-ui)" }}>
          {error}
        </p>
      )}

      {notifications === null && !error && (
        <p style={{ fontFamily: "var(--qhse-font-ui)", color: "var(--qhse-text-secondary)" }}>{t("notifications.inbox.loading")}</p>
      )}

      {notifications !== null && (
        <>
          <DataTable
            getRowId={(row) => row.id}
            emptyMessage={t("notifications.inbox.empty.title")}
            rows={notifications}
            columns={[
              {
                key: "priority",
                header: "",
                render: (row) => <StatusBadge tone={PRIORITY_TONE[row.priority]} label={t(`notifications.priority.${row.priority}`)} />,
              },
              {
                key: "title",
                header: t("notifications.preferences.column.category"),
                render: (row) => (
                  <div>
                    <strong style={{ fontWeight: row.isRead ? 400 : 700 }}>{row.title}</strong>
                    <div style={{ color: "var(--qhse-text-secondary)", fontSize: "var(--qhse-text-body-sm-size)" }}>{row.body}</div>
                  </div>
                ),
              },
              {
                key: "createdAt",
                header: "",
                render: (row) => (
                  <span style={{ color: "var(--qhse-text-muted)", fontSize: "var(--qhse-text-body-sm-size)", whiteSpace: "nowrap" }}>
                    {dateFormatter.format(new Date(row.createdAt))}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (row) =>
                  row.isRead ? null : (
                    <Button variant="default" onClick={() => handleMarkAsRead(row.id)}>
                      {t("notifications.inbox.markRead")}
                    </Button>
                  ),
              },
            ]}
          />

          {notifications.length === 0 && (
            <p style={{ fontFamily: "var(--qhse-font-ui)", color: "var(--qhse-text-secondary)", marginTop: "var(--qhse-space-2)" }}>
              {t("notifications.inbox.empty.description")}
            </p>
          )}

          {total > PAGE_SIZE && (
            <nav style={{ display: "flex", alignItems: "center", gap: "var(--qhse-space-3)", marginTop: "var(--qhse-space-4)" }}>
              <Button variant="default" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("notifications.inbox.pagination.prev")}
              </Button>
              <span style={{ fontFamily: "var(--qhse-font-ui)", fontSize: "var(--qhse-text-body-sm-size)", color: "var(--qhse-text-secondary)" }}>
                {t("notifications.inbox.pagination.summary", "id", { page, totalPages })}
              </span>
              <Button variant="default" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                {t("notifications.inbox.pagination.next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
