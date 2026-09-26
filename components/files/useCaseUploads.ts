"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { forgetDone, onFileSaved, useUploads } from "@/lib/files/upload-store";
import type { UploadItem } from "@/lib/files/queue";

/**
 * The uploads of one case that the screen doesn't show as saved files yet.
 * When one of them is saved, the screen reloads its data; once the saved file
 * appears there, the upload tile is dropped.
 *
 * `refresh: false` for a screen mid-form (Update Visit): reloading it would
 * re-run its suggestions, so saved uploads simply stay as "Saved" tiles.
 */
export function useCaseUploads(
  caseId: string,
  savedIds: string[],
  { refresh = true, filter }: { refresh?: boolean; filter?: (u: UploadItem) => boolean } = {},
): UploadItem[] {
  const router = useRouter();
  const uploads = useUploads();

  useEffect(() => {
    if (!refresh) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onFileSaved((item) => {
      if (item.caseId !== caseId) return;
      // Several files often finish together: one refresh for all of them.
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [caseId, router, refresh]);

  const savedKey = savedIds.join(",");
  useEffect(() => {
    const saved = new Set(savedKey.split(","));
    const shown = uploads.filter((u) => u.status === "done" && saved.has(u.id)).map((u) => u.id);
    if (shown.length > 0) forgetDone(shown);
  }, [uploads, savedKey]);

  return useMemo(() => {
    const saved = new Set(savedKey.split(","));
    return uploads.filter((u) => u.caseId === caseId && !saved.has(u.id) && (!filter || filter(u)));
  }, [uploads, caseId, savedKey, filter]);
}
