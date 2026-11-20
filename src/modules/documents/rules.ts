import { ValidationError } from "@/lib/errors";

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024; // Vercel serverless functions accept request bodies up to 4.5 MB
export const MAX_AVATAR_BYTES = 1024 * 1024;
export const MAX_DOCUMENTS_PER_EMPLOYEE = 20;

export type FileKind = "application/pdf" | "image/png" | "image/jpeg" | "image/webp";

/** Identifies the real file type from its first bytes; the browser-supplied type is never trusted. */
export function sniffType(bytes: Uint8Array): FileKind | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f"<>:*?|]/g, "").trim().slice(0, 120);
  return cleaned || "file";
}

export function validateUpload(opts: { bytes: Uint8Array; allowed: FileKind[]; maxBytes: number }): FileKind {
  if (opts.bytes.byteLength === 0) throw new ValidationError("The file is empty.", { file: ["Choose a file."] });
  if (opts.bytes.byteLength > opts.maxBytes) throw new ValidationError(`The file is too large (maximum ${Math.round(opts.maxBytes / 1024 / 1024)} MB).`, { file: ["File too large."] });
  const kind = sniffType(opts.bytes);
  if (!kind || !opts.allowed.includes(kind)) {
    const label = opts.allowed.map((k) => k.split("/")[1]!.toUpperCase()).join(", ");
    throw new ValidationError(`Only ${label} files are accepted.`, { file: ["Unsupported file type."] });
  }
  return kind;
}
