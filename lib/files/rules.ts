/**
 * What can be added to a case, and how files are named on screen.
 *
 * The same list is enforced by the Storage bucket (see the case_files
 * migration); checking here first means the PG gets a friendly message
 * before anything is sent over weak Wi-Fi.
 */
export type FileKind = "xray" | "photo" | "document";

export const FILE_KINDS: { value: FileKind; label: string; plural: string }[] = [
  { value: "xray", label: "X-ray", plural: "X-rays" },
  { value: "photo", label: "Photo", plural: "Photos" },
  { value: "document", label: "Document", plural: "Documents" },
];

export function kindLabel(kind: FileKind): string {
  return FILE_KINDS.find((k) => k.value === kind)!.label;
}

export function isFileKind(value: unknown): value is FileKind {
  return value === "xray" || value === "photo" || value === "document";
}

/** Private bucket holding every case file. */
export const CASE_FILES_BUCKET = "case-files";

/** Per file, after images are shrunk. Matches the bucket's limit. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Most files picked in one go. */
export const MAX_FILES_PER_PICK = 20;

const IMAGE_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
};

const DOCUMENT_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
};

const ALL_TYPES: Record<string, string[]> = { ...IMAGE_TYPES, ...DOCUMENT_TYPES };

/** For the gallery/camera picker. */
export const ACCEPT_IMAGES = "image/*";

/** For the document picker: extensions AND types, as phones honour one or the other. */
export const ACCEPT_DOCUMENTS = [
  ...Object.values(DOCUMENT_TYPES).flat().map((e) => `.${e}`),
  ...Object.keys(DOCUMENT_TYPES),
].join(",");

export const ALLOWED_DESCRIPTION = "photos (JPG, PNG, HEIC) and documents (PDF, PowerPoint, Word)";

export function isImageMime(mime: string): boolean {
  return mime in IMAGE_TYPES;
}

export function extensionFor(mime: string): string {
  return ALL_TYPES[mime]?.[0] ?? "bin";
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * The file's real type: what the phone reports if it's on the list, else
 * worked out from the extension (phones often report nothing for PowerPoint,
 * or a generic type for HEIC). NULL = not allowed.
 */
export function resolveMime(name: string, reported: string): string | null {
  const type = reported === "image/jpg" ? "image/jpeg" : reported.toLowerCase();
  if (type in ALL_TYPES) return type;
  const ext = extensionOf(name);
  if (!ext) return null;
  for (const [mime, exts] of Object.entries(ALL_TYPES)) {
    if (exts.includes(ext)) return mime;
  }
  return null;
}

export type FileCheck = { ok: true; mime: string; isImage: boolean } | { ok: false; reason: string };

export function checkFile(file: { name: string; type: string; size: number }): FileCheck {
  const mime = resolveMime(file.name, file.type);
  if (!mime) {
    return { ok: false, reason: `${file.name} can't be added. You can add ${ALLOWED_DESCRIPTION}.` };
  }
  if (file.size <= 0) {
    return { ok: false, reason: `${file.name} is empty.` };
  }
  const isImage = isImageMime(mime);
  // Images are shrunk on the phone first; their final size is checked then.
  if (!isImage && file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `${file.name} is ${formatBytes(file.size)}. Files can be up to ${formatBytes(MAX_FILE_BYTES)}.`,
    };
  }
  return { ok: true, mime, isImage };
}

/** Documents are documents; images follow the button tapped (X-ray or Photo). */
export function defaultKind(mime: string, chosen?: FileKind): FileKind {
  if (!isImageMime(mime)) return "document";
  return chosen === "xray" ? "xray" : "photo";
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${Math.round(mb * 10) / 10} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** What a file is called on screen. */
export function displayName(file: { label: string | null; originalName: string | null; kind: FileKind }): string {
  if (file.label?.trim()) return file.label.trim();
  if (file.kind === "document" && file.originalName) {
    const dot = file.originalName.lastIndexOf(".");
    return dot > 0 ? file.originalName.slice(0, dot) : file.originalName;
  }
  return kindLabel(file.kind);
}
