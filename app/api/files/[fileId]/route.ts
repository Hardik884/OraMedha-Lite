import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import { CASE_FILES_BUCKET, displayName, extensionFor, isFileKind } from "@/lib/files/rules";

/** Long enough to start loading or downloading; too short to pass around. */
const LINK_SECONDS = 120;

/**
 * GET /api/files/<id>[?download=1]
 *
 * Opens one of the signed-in PG's files: looks the file up (Row Level
 * Security: only their own, not deleted) and redirects to a fresh 2-minute
 * signed link. Used for the full-screen image and for opening documents, so
 * a link on screen never goes stale.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!isUuid(fileId)) return notFound();

  const supabase = await createServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Sign in", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { data: file } = await supabase
    .from("file")
    .select("storage_path, original_name, label, kind, mime_type")
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!file || !isFileKind(file.kind)) return notFound();

  const download = request.nextUrl.searchParams.get("download") === "1";
  const name = file.original_name ?? `${displayName({ label: file.label, originalName: null, kind: file.kind })}.${extensionFor(file.mime_type)}`;
  const { data: signed } = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .createSignedUrl(file.storage_path, LINK_SECONDS, download ? { download: name } : undefined);
  if (!signed?.signedUrl) return notFound();

  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
