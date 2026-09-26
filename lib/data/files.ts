import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { CASE_FILES_BUCKET, displayName, isFileKind, isImageMime, type FileKind } from "@/lib/files/rules";

/**
 * A case's files as the screens show them. Thumbnails come as short-lived
 * signed links (15 minutes); the full file is opened through
 * /api/files/<id>, which signs a fresh 2-minute link on every tap. The bucket
 * is private, so there are no public links.
 */
export type CaseFile = {
  id: string;
  kind: FileKind;
  label: string | null;
  /** What to call it on screen (label, else the document's name, else the type). */
  name: string;
  originalName: string | null;
  mime: string;
  sizeBytes: number;
  /** The day it was captured (IST). */
  date: string;
  createdAt: string;
  visitId: string | null;
  stageName: string | null;
  isImage: boolean;
  thumbUrl: string | null;
};

export const THUMB_LINK_SECONDS = 15 * 60;

/** Browsers can show these directly when there's no separate thumbnail. */
const VIEWABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function getCaseFiles(caseId: string): Promise<CaseFile[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("file")
    .select(
      "id, kind, label, original_name, mime_type, size_bytes, captured_on, created_at, visit_id, storage_path, thumb_path, stage:stage_id (name)",
    )
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load files: ${error.code}`);

  const thumbPathOf = (f: (typeof data)[number]) =>
    f.thumb_path ?? (VIEWABLE.has(f.mime_type) ? f.storage_path : null);
  const paths = data.map(thumbPathOf).filter((p): p is string => p !== null);

  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage.from(CASE_FILES_BUCKET).createSignedUrls(paths, THUMB_LINK_SECONDS);
    // A missing thumbnail just shows the type's icon; it never fails the page.
    for (const s of signed.data ?? []) {
      if (s.path && s.signedUrl && !s.error) urls.set(s.path, s.signedUrl);
    }
  }

  return data
    .filter((f) => isFileKind(f.kind))
    .map((f) => {
      const kind = f.kind as FileKind;
      const thumbPath = thumbPathOf(f);
      return {
        id: f.id,
        kind,
        label: f.label,
        name: displayName({ label: f.label, originalName: f.original_name, kind }),
        originalName: f.original_name,
        mime: f.mime_type,
        sizeBytes: f.size_bytes,
        date: f.captured_on,
        createdAt: f.created_at,
        visitId: f.visit_id,
        stageName: f.stage?.name ?? null,
        isImage: isImageMime(f.mime_type),
        thumbUrl: thumbPath ? (urls.get(thumbPath) ?? null) : null,
      };
    });
}

/** Ids of the files filed under one visit (for Visit Updated). */
export async function getVisitFileIds(visitId: string): Promise<string[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("file").select("id").eq("visit_id", visitId).is("deleted_at", null);
  if (error) throw new Error(`Could not load files: ${error.code}`);
  return data.map((f) => f.id);
}
