"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, UploadCloud } from "lucide-react";
import { hasUnfinishedUploads, retryAllFailed, useUploads } from "@/lib/files/upload-store";
import { summarizeUploads } from "@/lib/files/queue";
import { filesPath } from "@/lib/navigation/paths";
import { cn } from "@/lib/utils";

/**
 * Mounted once for the whole app:
 *  - warns before the page is closed or reloaded while files are unsaved
 *  - retries failed uploads when the phone comes back online
 *  - shows a small "Uploading…" pill on screens that don't already show the
 *    uploads (the patient's own screens do), so the PG can carry on elsewhere
 */
export function UploadWatcher() {
  const uploads = useUploads();
  const pathname = usePathname();

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnfinishedUploads()) return;
      e.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", retryAllFailed);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", retryAllFailed);
    };
  }, []);

  const visible = uploads.filter((u) => !pathname.startsWith(`/patients/${u.patientId}`));
  const summary = summarizeUploads(visible);
  if (summary.active === 0 && summary.failed === 0) return null;

  // Tap goes to the files of the first case that needs attention.
  const target = visible.find((u) => u.status === "failed") ?? visible.find((u) => u.status !== "done")!;
  const failed = summary.failed > 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-40 flex justify-center px-4">
      <Link
        href={filesPath(target.patientId, target.caseId)}
        className={cn(
          "pointer-events-auto flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium shadow-lg",
          failed
            ? "border-warning-border bg-warning-bg text-warning"
            : "border-border bg-surface text-text-primary",
        )}
        role="status"
      >
        {failed ? (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {summary.failed === 1 ? "1 upload didn't finish" : `${summary.failed} uploads didn't finish`} · Open
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            Uploading {summary.active === 1 ? "1 file" : `${summary.active} files`} ·{" "}
            <span className="tabular-nums">{Math.round(summary.progress * 100)}%</span>
          </>
        )}
      </Link>
    </div>
  );
}

