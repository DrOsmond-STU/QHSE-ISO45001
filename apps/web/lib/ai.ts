import { apiFetch } from "./api-client";

// Tipe dan pemuat untuk pencarian dan bantuan AI.
//
// Perhatikan pemisahannya: `cariDokumen` TIDAK melempar ketika fitur AI mati.
// Ia tetap mengembalikan hasil dari basis data dan hanya menyertakan
// `catatan` yang menjelaskan kenapa perluasan kata kuncinya tidak ada.
// `rekomendasiPeraturan` dan `usulSusunan` memang melempar — keduanya tidak
// punya wujud tanpa model, dan berpura-pura punya akan lebih buruk.

export interface AiStatus {
  enabled: boolean;
  model: string | null;
  jenis: Array<{ kode: string; label: string }>;
}

export interface DokumenTemuan {
  id: string;
  documentNumber: string;
  title: string;
  description: string | null;
  status: string;
  documentType: string;
  skor: number;
  cuplikan: string;
}

export interface PeraturanTemuan {
  id: string;
  regulationNumber: string;
  title: string;
  issuingAuthority: string | null;
  summary: string | null;
  status: string;
  sourceUrl: string | null;
  effectiveDate: string | null;
  skor: number;
  cuplikan: string;
}

export interface HasilPencarian {
  frasa: string;
  /** Istilah yang ditambahkan model. Kosong bila fitur AI mati. */
  perluasan: string[];
  /** Satu kalimat: apa yang dipahami model dari kata kuncinya. */
  tafsir: string | null;
  /** Terisi bila perluasan dilewati — beserta alasannya. */
  catatan: string | null;
  documents: DokumenTemuan[];
  regulations: PeraturanTemuan[];
}

export interface PeraturanLuar {
  nomor: string;
  judul: string;
  penerbit: string;
  tahun: number | null;
  url: string;
  relevansi: string;
}

export interface RekomendasiPeraturan {
  peraturan: PeraturanLuar[];
  /** Butir yang dibuang karena tidak membawa tautan sumber. */
  dibuang: number;
}

export interface UsulSusunan {
  jenis: string;
  label: string;
  judul: string;
  nomorUsulan: string;
  ringkasan: string;
  klausul: string[];
  bagian: Array<{ nomor: string; judul: string; isi: string }>;
  langkah: Array<{ urutan: number; pelaku: string; tindakan: string; keputusan: string }>;
  kolom: Array<{ nama: string; jenis: string; wajib: boolean }>;
  rekaman: string[];
}

export function fetchAiStatus(): Promise<AiStatus> {
  return apiFetch<AiStatus>("/ai/status");
}

export function cariDokumen(q: string): Promise<HasilPencarian> {
  return apiFetch<HasilPencarian>("/ai/search", { method: "POST", body: { q } });
}

export function rekomendasiPeraturan(q: string): Promise<RekomendasiPeraturan> {
  return apiFetch<RekomendasiPeraturan>("/ai/regulations", { method: "POST", body: { q } });
}

export function usulSusunan(q: string, jenis: string): Promise<UsulSusunan> {
  return apiFetch<UsulSusunan>("/ai/structure", { method: "POST", body: { q, jenis } });
}

/** Cuplikan hasil pencarian datang dengan penanda « » di sekitar kata yang
 *  cocok. Dipecah di sini menjadi potongan biasa dan potongan bertanda, supaya
 *  komponen bisa menyorotnya tanpa menyisipkan HTML mentah — highlight tidak
 *  sepadan dengan membuka pintu injeksi di halaman yang menampilkan teks
 *  dokumen. */
export function pecahCuplikan(cuplikan: string): Array<{ teks: string; tebal: boolean }> {
  if (!cuplikan) return [];
  return cuplikan
    .split(/(«[^»]*»)/g)
    .filter((bagian) => bagian.length > 0)
    .map((bagian) =>
      bagian.startsWith("«") && bagian.endsWith("»")
        ? { teks: bagian.slice(1, -1), tebal: true }
        : { teks: bagian, tebal: false },
    );
}
