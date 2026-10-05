import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { OraMedhaLogo } from "@/components/shared/OraMedhaLogo";
import { RetryButton } from "./RetryButton";
import { APP_NAME } from "@/lib/brand/name";

export const metadata: Metadata = { title: "Offline" };

/**
 * Shown by the service worker when a page cannot load. Static, so it can be
 * cached at install time and work with no connection at all.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 pt-safe pb-safe">
      <OraMedhaLogo size={22} withWordmark className="mb-6" />
      <EmptyState
        icon={<WifiOff />}
        title="You're offline"
        description={`${APP_NAME} needs a connection to load this page. Nothing you saved earlier is lost.`}
        action={<RetryButton />}
      />
    </main>
  );
}
