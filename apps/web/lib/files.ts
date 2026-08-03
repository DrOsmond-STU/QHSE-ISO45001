import { apiFetch } from "./api-client";

// Unggah berkas dan penukaran tautan bertanda tangan.

export type FileKind = "version" | "attachment";

export interface SignedFile {
  /** Relatif terhadap base URL API; sudah memuat token berumur pendek. */
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  inlineViewable: boolean;
  documentNumber: string | null;
  title: string | null;
  version: string | null;
  status: string | null;
}

export function signFile(kind: FileKind, id: string): Promise<SignedFile> {
  return apiFetch<SignedFile>("/files/sign", { method: "POST", body: { kind, id } });
}

export interface UploadResult {
  kind: FileKind;
  id: string;
  fileName: string;
  majorVersion?: number;
  minorVersion?: number;
}

/**
 * Berkas dikirim sebagai base64 di dalam JSON, bukan multipart.
 *
 * Alasannya ada di sisi server: demo-api ditulis di atas node:http tanpa
 * framework, dan mengurai multipart dengan tangan berarti menulis parser
 * boundary sendiri — jenis kode yang salahnya halus dan baru terlihat pada
 * berkas tertentu. JSON+base64 menukar 33% ukuran muatan dengan satu jalur
 * yang tidak mungkin salah urai. Batas ukurannya 8 MB, dinyatakan server dan
 * ditolak di sana kalau dilanggar.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Berkas gagal dibaca."));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(
  slug: string,
  id: string,
  file: File,
  changeSummary?: string,
): Promise<UploadResult> {
  const contentBase64 = await readFileAsBase64(file);
  return apiFetch<UploadResult>(`/${slug}/${id}/files`, {
    method: "POST",
    body: {
      fileName: file.name,
      // Peramban kadang mengirim string kosong untuk tipe yang tidak
      // dikenalnya. Server punya daftar putih dan akan menolaknya dengan
      // pesan yang menyebut tipe apa saja yang diterima — jauh lebih berguna
      // daripada tebakan di sisi klien.
      mimeType: file.type || "application/octet-stream",
      contentBase64,
      changeSummary: changeSummary || undefined,
    },
  });
}

/** Modul yang menerima unggahan berkas. */
export const UPLOADABLE: Record<string, { kind: FileKind; childPath: string; label: string }> = {
  documents: { kind: "version", childPath: "/versions", label: "Unggah revisi baru" },
  "regulatory-registers": { kind: "attachment", childPath: "/attachments", label: "Unggah salinan peraturan" },
};

export function viewerHref(kind: FileKind, id: string, backTo: string): string {
  return `/viewer?kind=${kind}&id=${encodeURIComponent(id)}&kembali=${encodeURIComponent(backTo)}`;
}
