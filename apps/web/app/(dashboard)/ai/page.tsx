"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, StatusBadge } from "@qhse/ui-components";
import { ApiError } from "../../../lib/api-client";
import {
  cariDokumen,
  fetchAiStatus,
  pecahCuplikan,
  rekomendasiPeraturan,
  usulSusunan,
  type AiStatus,
  type HasilPencarian,
  type RekomendasiPeraturan,
  type UsulSusunan,
} from "../../../lib/ai";
import { humanizeEnum, statusTone } from "../../../lib/status-tone";
import { useLocale } from "../../../lib/locale";
import "./ai.css";

// Pencarian dan bantuan penyusunan dokumen.
//
// SATU KOTAK PENCARIAN, TIGA JAWABAN YANG BERBEDA DERAJAT KEPASTIANNYA — dan
// perbedaan itu dinyatakan di layar, bukan hanya di kode:
//
//   1. DOKUMEN & PERATURAN MILIK PERUSAHAAN — fakta. Datang dari basis data,
//      bisa diklik, bisa dibuka berkasnya. Selalu tampil, bahkan ketika
//      fitur AI mati.
//
//   2. PERATURAN DARI INTERNET — temuan pencarian, bukan nasihat hukum.
//      Setiap butir wajib membawa tautan sumber; tanpa tautan, butirnya
//      dibuang di server. Di layar pun tautannya ditampilkan, bukan
//      disembunyikan di balik teks — supaya memeriksanya lebih mudah
//      daripada memercayainya begitu saja.
//
//   3. USULAN SUSUNAN DOKUMEN — kerangka, bukan dokumen jadi. Dinyatakan
//      dengan kalimat sendiri di atas hasilnya.
//
// Ketiganya sengaja TIDAK dijalankan sekaligus saat menekan Enter. Pencarian
// internal cepat dan gratis; dua yang lain memanggil model dan memakan waktu
// serta biaya. Menjalankan semuanya otomatis berarti setiap salah ketik
// membayar tiga panggilan model.

type Muat<T> = { kind: "diam" } | { kind: "muat" } | { kind: "ok"; data: T } | { kind: "gagal"; pesan: string };

function pesanGalat(error: unknown): string {
  if (error instanceof ApiError) {
    return [error.problem?.title, error.problem?.detail].filter(Boolean).join(" ") || error.message;
  }
  return "API tidak terjangkau.";
}

export default function AiPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [frasa, setFrasa] = useState("");
  const [jenis, setJenis] = useState("SOP");

  const [hasil, setHasil] = useState<Muat<HasilPencarian>>({ kind: "diam" });
  const [peraturan, setPeraturan] = useState<Muat<RekomendasiPeraturan>>({ kind: "diam" });
  const [susunan, setSusunan] = useState<Muat<UsulSusunan>>({ kind: "diam" });

  useEffect(() => {
    fetchAiStatus()
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, model: null, jenis: [] }));
  }, []);

  const siap = frasa.trim().length >= 2;

  async function jalankanPencarian() {
    if (!siap) return;
    setHasil({ kind: "muat" });
    // Dua panel lain dikosongkan: membiarkan hasil kata kunci LAMA terpampang
    // di bawah kata kunci BARU adalah cara paling mudah membuat orang salah
    // membaca jawaban sebagai jawaban atas pertanyaan yang baru saja diketik.
    setPeraturan({ kind: "diam" });
    setSusunan({ kind: "diam" });
    try {
      setHasil({ kind: "ok", data: await cariDokumen(frasa.trim()) });
    } catch (error) {
      setHasil({ kind: "gagal", pesan: pesanGalat(error) });
    }
  }

  async function jalankanPeraturan() {
    if (!siap) return;
    setPeraturan({ kind: "muat" });
    try {
      setPeraturan({ kind: "ok", data: await rekomendasiPeraturan(frasa.trim()) });
    } catch (error) {
      setPeraturan({ kind: "gagal", pesan: pesanGalat(error) });
    }
  }

  async function jalankanSusunan() {
    if (!siap) return;
    setSusunan({ kind: "muat" });
    try {
      setSusunan({ kind: "ok", data: await usulSusunan(frasa.trim(), jenis) });
    } catch (error) {
      setSusunan({ kind: "gagal", pesan: pesanGalat(error) });
    }
  }

  return (
    <div className="qhse-ai">
      <header className="qhse-ai__head">
        <div>
          <h1 className="qhse-ai__title">{t("Pencarian & Bantuan Dokumen", "Document Search & Assistance")}</h1>
          <p className="qhse-ai__lead">
            {t(
              "Cari kata kunci di dalam Dokumen Terkendali dan Registrasi Peraturan milik perusahaan, telusuri peraturan terkait di internet, dan mintakan usulan susunan dokumen baru.",
              "Search keywords inside the company's Controlled Documents and Regulatory Register, look up related regulations on the web, and ask for a suggested outline for a new document.",
            )}
          </p>
        </div>
        {status && (
          <span className={status.enabled ? "qhse-ai__lampu qhse-ai__lampu--nyala" : "qhse-ai__lampu"}>
            {status.enabled
              ? t(`Bantuan AI aktif · ${status.model}`, `AI assistance active · ${status.model}`)
              : t("Bantuan AI belum diaktifkan", "AI assistance is not enabled")}
          </span>
        )}
      </header>

      <form
        className="qhse-ai__kotak"
        onSubmit={(event) => {
          event.preventDefault();
          void jalankanPencarian();
        }}
      >
        <input
          className="qhse-ai__input"
          type="search"
          value={frasa}
          placeholder={t("mis. ruang terbatas, limbah B3, APD, izin kerja panas", "e.g. confined space, hazardous waste, PPE, hot work permit")}
          onChange={(event) => setFrasa(event.target.value)}
          aria-label={t("Kata kunci", "Keywords")}
        />
        <Button type="submit" variant="accent" disabled={!siap || hasil.kind === "muat"}>
          {hasil.kind === "muat" ? t("Mencari…", "Searching…") : t("Cari", "Search")}
        </Button>
      </form>

      {/* --- 1. Milik perusahaan --------------------------------------- */}
      <section className="qhse-ai__bagian">
        <h2 className="qhse-ai__judul">{t("Dokumen dan peraturan milik perusahaan", "Company documents and regulations")}</h2>
        {hasil.kind === "diam" && <p className="qhse-ai__kosong">{t("Ketik kata kunci lalu tekan Cari.", "Type a keyword and press Search.")}</p>}
        {hasil.kind === "muat" && <p className="qhse-ai__kosong">{t("Mencari…", "Searching…")}</p>}
        {hasil.kind === "gagal" && <p className="qhse-ai__bad">{hasil.pesan}</p>}
        {hasil.kind === "ok" && (
          <>
            {hasil.data.perluasan.length > 0 && (
              <p className="qhse-ai__perluasan">
                Ikut dicari sebagai:{" "}
                {hasil.data.perluasan.map((istilah) => (
                  <span key={istilah} className="qhse-ai__cip">
                    {istilah}
                  </span>
                ))}
                {hasil.data.tafsir && <span className="qhse-ai__tafsir">{hasil.data.tafsir}</span>}
              </p>
            )}
            {hasil.data.catatan && <p className="qhse-ai__catatan">{hasil.data.catatan}</p>}

            <h3 className="qhse-ai__sub">Dokumen Terkendali · {hasil.data.documents.length}</h3>
            {hasil.data.documents.length === 0 ? (
              <p className="qhse-ai__kosong">Tidak ada dokumen yang cocok.</p>
            ) : (
              <ul className="qhse-ai__daftar">
                {hasil.data.documents.map((dokumen) => (
                  <li key={dokumen.id} className="qhse-ai__baris">
                    <Link href={`/modules/documents/${dokumen.id}`} className="qhse-ai__tautan">
                      {dokumen.documentNumber} — {dokumen.title}
                    </Link>
                    {statusTone(dokumen.status) ? (
                      <StatusBadge tone={statusTone(dokumen.status)!} label={humanizeEnum(dokumen.status)} />
                    ) : (
                      <span className="qhse-ai__meta">{humanizeEnum(dokumen.status)}</span>
                    )}
                    <p className="qhse-ai__cuplikan">
                      {pecahCuplikan(dokumen.cuplikan).map((bagian, index) =>
                        bagian.tebal ? (
                          <mark key={index}>{bagian.teks}</mark>
                        ) : (
                          <span key={index}>{bagian.teks}</span>
                        ),
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="qhse-ai__sub">Registrasi Peraturan · {hasil.data.regulations.length}</h3>
            {hasil.data.regulations.length === 0 ? (
              <p className="qhse-ai__kosong">Tidak ada peraturan terdaftar yang cocok.</p>
            ) : (
              <ul className="qhse-ai__daftar">
                {hasil.data.regulations.map((aturan) => (
                  <li key={aturan.id} className="qhse-ai__baris">
                    <Link href={`/modules/regulatory-registers/${aturan.id}`} className="qhse-ai__tautan">
                      {aturan.regulationNumber} — {aturan.title}
                    </Link>
                    {statusTone(aturan.status) ? (
                      <StatusBadge tone={statusTone(aturan.status)!} label={humanizeEnum(aturan.status)} />
                    ) : (
                      <span className="qhse-ai__meta">{humanizeEnum(aturan.status)}</span>
                    )}
                    <p className="qhse-ai__cuplikan">
                      {pecahCuplikan(aturan.cuplikan).map((bagian, index) =>
                        bagian.tebal ? (
                          <mark key={index}>{bagian.teks}</mark>
                        ) : (
                          <span key={index}>{bagian.teks}</span>
                        ),
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* --- 2. Dari internet ------------------------------------------ */}
      <section className="qhse-ai__bagian">
        <div className="qhse-ai__judulBaris">
          <h2 className="qhse-ai__judul">{t("Peraturan terkait di internet", "Related regulations on the web")}</h2>
          <Button variant="accent" disabled={!siap || peraturan.kind === "muat"} onClick={() => void jalankanPeraturan()}>
            {peraturan.kind === "muat" ? t("Menelusuri…", "Searching…") : t("Telusuri", "Search the web")}
          </Button>
        </div>
        <p className="qhse-ai__peringatan">
          {t(
            "Hasil penelusuran web, bukan nasihat hukum. Setiap butir wajib membawa tautan sumber — buka dan periksa nomornya sebelum dipakai sebagai dasar hukum dokumen.",
            "Web search results, not legal advice. Every item must carry a source link — open it and check the number before using it as the legal basis of a document.",
          )}
        </p>
        {peraturan.kind === "muat" && <p className="qhse-ai__kosong">{t("Menelusuri sumber resmi…", "Searching official sources…")}</p>}
        {peraturan.kind === "gagal" && <p className="qhse-ai__bad">{peraturan.pesan}</p>}
        {peraturan.kind === "ok" && (
          <>
            {peraturan.data.peraturan.length === 0 ? (
              <p className="qhse-ai__kosong">
                {t("Tidak ada peraturan yang ditemukan dengan sumber yang bisa diperiksa.", "No regulation was found with a verifiable source.")}
              </p>
            ) : (
              <ul className="qhse-ai__daftar">
                {peraturan.data.peraturan.map((butir) => (
                  <li key={butir.url} className="qhse-ai__baris">
                    <a className="qhse-ai__tautan" href={butir.url} target="_blank" rel="noreferrer noopener">
                      {butir.nomor} — {butir.judul}
                    </a>
                    <span className="qhse-ai__meta">
                      {[butir.penerbit, butir.tahun].filter(Boolean).join(" · ")}
                    </span>
                    <p className="qhse-ai__cuplikan">{butir.relevansi}</p>
                    <span className="qhse-ai__sumber">{butir.url}</span>
                  </li>
                ))}
              </ul>
            )}
            {peraturan.data.dibuang > 0 && (
              <p className="qhse-ai__catatan">
                {t(
                  `${peraturan.data.dibuang} butir dibuang karena tidak menyertakan tautan sumber yang bisa diperiksa.`,
                  `${peraturan.data.dibuang} item(s) discarded for not carrying a verifiable source link.`,
                )}
              </p>
            )}
          </>
        )}
      </section>

      {/* --- 3. Usulan susunan ----------------------------------------- */}
      <section className="qhse-ai__bagian">
        <div className="qhse-ai__judulBaris">
          <h2 className="qhse-ai__judul">{t("Usulan susunan dokumen", "Suggested document outline")}</h2>
          <div className="qhse-ai__aksi">
            <select
              className="qhse-ai__pilih"
              value={jenis}
              onChange={(event) => setJenis(event.target.value)}
              aria-label={t("Jenis dokumen", "Document type")}
            >
              {(status?.jenis.length ? status.jenis : [{ kode: "SOP", label: "Prosedur (SOP)" }]).map((pilihan) => (
                <option key={pilihan.kode} value={pilihan.kode}>
                  {pilihan.label}
                </option>
              ))}
            </select>
            <Button variant="accent" disabled={!siap || susunan.kind === "muat"} onClick={() => void jalankanSusunan()}>
              {susunan.kind === "muat" ? t("Menyusun…", "Drafting…") : t("Susunkan", "Draft outline")}
            </Button>
          </div>
        </div>
        <p className="qhse-ai__peringatan">
          {t("Yang dihasilkan adalah", "What you get is an")} <strong>{t("kerangka", "outline")}</strong>
          {t(
            ": bagian apa saja yang perlu ada agar dokumen memenuhi klausul standar. Isi teknisnya tetap harus ditulis orang yang mengetahui prosesnya.",
            ": which sections must exist for the document to satisfy the standard's clauses. The technical content still has to be written by someone who knows the process.",
          )}
        </p>
        {susunan.kind === "muat" && <p className="qhse-ai__kosong">{t("Menyusun kerangka…", "Drafting the outline…")}</p>}
        {susunan.kind === "gagal" && <p className="qhse-ai__bad">{susunan.pesan}</p>}
        {susunan.kind === "ok" && <Susunan data={susunan.data} />}
      </section>
    </div>
  );
}

function Susunan({ data }: { data: UsulSusunan }) {
  const { t } = useLocale();
  return (
    <div className="qhse-ai__susunan">
      <p className="qhse-ai__susunanJudul">{data.judul}</p>
      <p className="qhse-ai__meta">
        {data.label} · contoh penomoran {data.nomorUsulan}
      </p>
      <p className="qhse-ai__cuplikan">{data.ringkasan}</p>

      {data.klausul.length > 0 && (
        <p className="qhse-ai__perluasan">
          Klausul yang ditopang:{" "}
          {data.klausul.map((klausul) => (
            <span key={klausul} className="qhse-ai__cip">
              {klausul}
            </span>
          ))}
        </p>
      )}

      {data.bagian.length > 0 && (
        <ol className="qhse-ai__bagianDaftar">
          {data.bagian.map((bagian) => (
            <li key={`${bagian.nomor}-${bagian.judul}`}>
              <span className="qhse-ai__bagianNomor">{bagian.nomor}</span>
              <span className="qhse-ai__bagianJudul">{bagian.judul}</span>
              <span className="qhse-ai__bagianIsi">{bagian.isi}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Langkah ditampilkan sebagai alir bernomor dengan pelakunya di depan:
          bagan alir yang tidak menyebut SIAPA yang melakukan tiap langkah
          adalah gambar yang bagus tapi tidak bisa dijalankan siapa pun. */}
      {data.langkah.length > 0 && (
        <ol className="qhse-ai__alir">
          {data.langkah.map((langkah) => (
            <li key={langkah.urutan} className={langkah.keputusan ? "qhse-ai__alirKeputusan" : undefined}>
              <span className="qhse-ai__pelaku">{langkah.pelaku}</span>
              <span className="qhse-ai__tindakan">{langkah.tindakan}</span>
              {langkah.keputusan && <span className="qhse-ai__keputusan">{t("Keputusan:", "Decision:")} {langkah.keputusan}</span>}
            </li>
          ))}
        </ol>
      )}

      {data.kolom.length > 0 && (
        <table className="qhse-ai__tabel">
          <thead>
            <tr>
              <th>{t("Kolom isian", "Field")}</th>
              <th>{t("Jenis", "Type")}</th>
              <th>{t("Wajib", "Required")}</th>
            </tr>
          </thead>
          <tbody>
            {data.kolom.map((kolom) => (
              <tr key={kolom.nama}>
                <td>{kolom.nama}</td>
                <td>{kolom.jenis}</td>
                <td>{kolom.wajib ? t("Ya", "Yes") : t("Tidak", "No")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.rekaman.length > 0 && (
        <>
          <h3 className="qhse-ai__sub">{t("Rekaman yang dihasilkan", "Records produced")}</h3>
          <ul className="qhse-ai__daftarRingkas">
            {data.rekaman.map((rekaman) => (
              <li key={rekaman}>{rekaman}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
