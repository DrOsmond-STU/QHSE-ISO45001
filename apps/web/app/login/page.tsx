"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@qhse/i18n";
import { useLocale } from "../../lib/locale";
import { Button, FormField } from "@qhse/ui-components";
import { ApiError } from "../../lib/api-client";
import { getRememberedEmail, getRememberedTenantId, login, MfaRequiredError } from "../../lib/auth-session";
import { useHasAccessToken } from "../../lib/use-auth-token";
import "./login.css";

// Halaman login internal — memakai alur Authorization Code + PKCE yang SAMA
// dengan SSO eksternal (TDD §8.1), bukan jalur pintas "username+password
// tukar JWT". Detail alurnya ada di lib/auth-session.ts.
//
// Kolom "Tenant ID" tampil apa adanya karena POST /auth/login pre-auth: server
// belum bisa menyimpulkan tenant dari JWT (JWT-nya justru hasil dari langkah
// ini), jadi tenant harus datang dari klien lewat header x-tenant-id. Di
// deployment satu-tenant, isi NEXT_PUBLIC_DEFAULT_TENANT_ID supaya kolom ini
// terisi otomatis dan user tinggal mengetik email + password.
export default function LoginPage() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const hasToken = useHasAccessToken();

  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaNeeded, setMfaNeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Nilai yang diingat baru bisa dibaca setelah mount — localStorage tidak ada
  // di server, dan mengisinya saat render pertama memicu hydration mismatch
  // (pola sama use-auth-token.ts).
  useEffect(() => {
    setTenantId(getRememberedTenantId());
    setEmail(getRememberedEmail());
  }, []);

  useEffect(() => {
    if (hasToken) router.replace("/dashboard");
  }, [hasToken, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ tenantId: tenantId.trim(), email: email.trim(), password, totpCode: totpCode || undefined });
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfaNeeded(true);
        setError(t("auth.login.mfaPrompt", locale));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(t("auth.login.invalidCredentials", locale));
      } else if (err instanceof ApiError && err.status === 429) {
        setError(t("auth.login.rateLimited", locale));
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : t("auth.login.networkError", locale));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="qhse-login">
      {/* Pemilih bahasa ada SEBELUM masuk, dan itu bukan kelengkapan yang
          berlebihan: layar ini adalah hal pertama yang dilihat pengguna
          berbahasa Inggris, dan pemilih yang baru muncul setelah berhasil
          masuk datang terlambat bagi orang yang belum bisa membaca
          petunjuk kolom Tenant ID. */}
      <div className="qhse-login__lang" role="group" aria-label="Language / Bahasa">
        {(["id", "en"] as const).map((kode) => (
          <button
            key={kode}
            type="button"
            lang={kode}
            className={`qhse-login__lang-option${locale === kode ? " qhse-login__lang-option--on" : ""}`}
            aria-pressed={locale === kode}
            onClick={() => setLocale(kode)}
          >
            {kode === "id" ? "ID" : "EN"}
          </button>
        ))}
      </div>
      <form className="qhse-login__card" onSubmit={handleSubmit}>
        <span className="qhse-login__mark" aria-hidden="true">
          QH
        </span>
        <h1 className="qhse-login__brand">QHSE Platform</h1>
        <p className="qhse-login__tagline">{t("auth.login.title", locale)}</p>

        {error && (
          <p role="alert" className="qhse-login__error">
            {error}
          </p>
        )}

        <FormField label={t("auth.login.tenantId", locale)} htmlFor="tenantId" required hint={t("auth.login.tenantId.hint", locale)}>
          <input
            id="tenantId"
            className="qhse-login__input"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            autoComplete="organization"
            required
          />
        </FormField>

        <FormField label={t("auth.login.email", locale)} htmlFor="email" required>
          <input
            id="email"
            type="email"
            className="qhse-login__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </FormField>

        <FormField label={t("auth.login.password", locale)} htmlFor="password" required>
          <input
            id="password"
            type="password"
            className="qhse-login__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </FormField>

        {mfaNeeded && (
          <FormField label={t("auth.login.totpCode", locale)} htmlFor="totpCode" required hint={t("auth.login.totpCode.hint", locale)}>
            <input
              id="totpCode"
              className="qhse-login__input"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </FormField>
        )}

        <div className="qhse-login__actions">
          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? t("auth.login.submitting", locale) : t("auth.login.submit", locale)}
          </Button>
        </div>

        <p className="qhse-login__hint">{t("auth.login.securityNote", locale)}</p>
      </form>
    </div>
  );
}
