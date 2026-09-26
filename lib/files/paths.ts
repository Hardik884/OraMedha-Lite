import { extensionFor } from "./rules";

/**
 * Where a file's bytes live in the private bucket:
 *   <pg_id>/<case_id>/<file_id>/original.<ext>
 *   <pg_id>/<case_id>/<file_id>/thumb.jpg
 * The PG's folder comes first so Storage policies can check ownership. The
 * phone's file name (which may carry a patient's name) is never in the path.
 */
type Ids = { pgId: string; caseId: string; fileId: string };

export function storagePathFor({ pgId, caseId, fileId, mime }: Ids & { mime: string }): string {
  return `${pgId}/${caseId}/${fileId}/original.${extensionFor(mime)}`;
}

export function thumbPathFor({ pgId, caseId, fileId }: Ids): string {
  return `${pgId}/${caseId}/${fileId}/thumb.jpg`;
}
