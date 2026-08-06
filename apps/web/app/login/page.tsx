"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Dua penerjemah, dan keduanya memang diperlukan:
//   kamus(kunci, locale) — teks yang dipakai bersama halaman lain, disimpan
//                          terpusat di packages/i18n
//   t("Indonesia", "English") — teks yang hanya ada di halaman ini
// Teks pemasaran di bawah tidak dimasukkan ke packages/i18n karena tidak
// dipakai di mana pun selain layar ini, dan kunci yang hanya punya satu
// pemakai membuat kamus bersama sulit dibaca tanpa memberi manfaat apa pun.
import { t as kamus } from "@qhse/i18n";
import { useLocale } from "../../lib/locale";
import { Button, FormField, IconCheck } from "@qhse/ui-components";
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
  const { locale, setLocale, t } = useLocale();
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
        setError(kamus("auth.login.mfaPrompt", locale));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(kamus("auth.login.invalidCredentials", locale));
      } else if (err instanceof ApiError && err.status === 429) {
        setError(kamus("auth.login.rateLimited", locale));
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : kamus("auth.login.networkError", locale));
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

      <div className="qhse-login__panel">
        {/* Panel penjelasan. Halaman masuk adalah SATU-SATUNYA halaman produk
            ini yang bisa dilihat orang yang belum punya akun — semua halaman
            lain berada di balik autentikasi. Sebelum ini, yang mereka lihat
            hanya kotak isian tanpa satu kalimat pun tentang apa yang ada di
            baliknya.

            Isinya sengaja berupa keterangan yang bisa DIPERIKSA, bukan janji:
            jumlah modul dan metrik cocok dengan yang benar-benar terdaftar,
            dan tiap butir menyebut perilaku yang bisa dicoba begitu masuk.
            Halaman masuk yang menjanjikan lebih daripada isinya merusak
            kepercayaan tepat pada langkah pertama. */}
        <section className="qhse-login__intro">
          <p className="qhse-login__eyebrow">
            {t("Mutu · K3 · Lingkungan", "Quality · Safety · Environment")}
          </p>
          <h2 className="qhse-login__headline">
            {t("Bukti K3 Anda, di satu layar.", "Your HSE evidence, on one screen.")}
          </h2>
          <p className="qhse-login__lead">
            {t(
              "Izin kerja, HIRA, insiden, CAPA, inspeksi, audit, sampai program pelatihan dicatat di satu aplikasi — dan dashboard direksi menghitung sendiri dari catatan yang sama. Tidak ada rekapitulasi terpisah, jadi tidak ada dua angka berbeda untuk satu kenyataan.",
              "Work permits, HIRA, incidents, CAPA, inspections, audits, and training programmes are all recorded in one application — and the board's dashboard computes itself from those same records. There is no separate recap, so there are never two different numbers for one reality.",
            )}
          </p>

          <ul className="qhse-login__fitur">
            {[
              {
                judul: t("19 modul operasional", "19 operational modules"),
                isi: t(
                  "Dari izin kerja, HIRA, dan insiden sampai audit, kalibrasi, dan pelatihan.",
                  "From work permits, HIRA, and incidents to audits, calibration, and training.",
                ),
              },
              {
                judul: t("Persetujuan berjenjang", "Multi-stage approval"),
                isi: t(
                  "Izin kerja berisiko tinggi otomatis menambah tahap HSE; transisi tidak sah ditolak.",
                  "High-risk work permits automatically add an HSE stage; invalid transitions are rejected.",
                ),
              },
              {
                judul: t("Dokumen terkendali", "Controlled documents"),
                isi: t(
                  "Riwayat versi, unduhan bertanda tangan, dan stempel SALINAN TERKENDALI.",
                  "Version history, signed downloads, and a CONTROLLED COPY stamp.",
                ),
              },
              {
                judul: t("54 metrik analitik", "54 analytics metrics"),
                isi: t(
                  "Susun dashboard Anda sendiri; susunannya tersimpan per pengguna di server.",
                  "Arrange your own dashboard; the arrangement is stored per user on the server.",
                ),
              },
              {
                judul: t("Balanced Scorecard", "Balanced Scorecard"),
                isi: t(
                  "Empat perspektif dengan sasaran yang bisa Anda ubah sendiri.",
                  "Four perspectives with objectives you can edit yourself.",
                ),
              },
              {
                judul: t("Dwibahasa & mode gelap", "Bilingual & dark mode"),
                isi: t(
                  "Indonesia dan English, terang dan gelap — dipilih per pengguna.",
                  "Indonesian and English, light and dark — chosen per user.",
                ),
              },
            ].map((fitur) => (
              <li key={fitur.judul}>
                {/* aria-hidden: centang ini hiasan yang menandai butir daftar,
                    bukan status "sudah aktif" pada fiturnya. Dibacakan pembaca
                    layar, ia akan menyisipkan kata yang tidak ada artinya di
                    depan tiap butir. */}
                <span className="qhse-login__tick" aria-hidden="true">
                  <IconCheck size={13} />
                </span>
                <span>
                  <b>{fitur.judul}</b>
                  {fitur.isi}
                </span>
              </li>
            ))}
          </ul>

          <p className="qhse-login__standar">
            {t(
              "Selaras dengan ISO 9001, ISO 45001, ISO 14001, dan PP 50/2012. Pemisahan data antar-perusahaan dipaksakan di lapisan basis data, dan sesi memakai OAuth2 Authorization Code + PKCE.",
              "Aligned with ISO 9001, ISO 45001, ISO 14001, and Indonesian Government Regulation 50/2012. Data separation between companies is enforced at the database layer, and sessions use OAuth2 Authorization Code + PKCE.",
            )}
          </p>
        </section>

        <form className="qhse-login__card" onSubmit={handleSubmit}>
          <span className="qhse-login__mark" aria-hidden="true">
            QH
          </span>
          <h1 className="qhse-login__brand">QHSE Platform</h1>
          <p className="qhse-login__tagline">{kamus("auth.login.title", locale)}</p>

          {error && (
            <p role="alert" className="qhse-login__error">
              {error}
            </p>
          )}

          <FormField label={kamus("auth.login.tenantId", locale)} htmlFor="tenantId" required hint={kamus("auth.login.tenantId.hint", locale)}>
            <input
              id="tenantId"
              className="qhse-login__input"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              autoComplete="organization"
              required
            />
          </FormField>

          <FormField label={kamus("auth.login.email", locale)} htmlFor="email" required>
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

          <FormField label={kamus("auth.login.password", locale)} htmlFor="password" required>
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
            <FormField label={kamus("auth.login.totpCode", locale)} htmlFor="totpCode" required hint={kamus("auth.login.totpCode.hint", locale)}>
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
              {submitting ? kamus("auth.login.submitting", locale) : kamus("auth.login.submit", locale)}
            </Button>
          </div>

          <p className="qhse-login__hint">{kamus("auth.login.securityNote", locale)}</p>
        </form>
      </div>
    </div>
  );
}
