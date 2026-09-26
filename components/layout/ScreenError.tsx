"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shown when a screen could not load (usually a weak connection). Offers a
 * retry and a way home instead of the framework's bare error page. Nothing
 * about the patient or the error details is shown or logged.
 */
export function ScreenError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Screen failed to load");
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 pt-10 pb-nav">
      <Card>
        <EmptyState
          icon={<CloudOff />}
          title="Couldn't load this screen"
          description="Check your internet connection and try again. Nothing you saved is lost."
          action={
            <div className="space-y-2">
              <Button size="xl" block onClick={reset}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </Button>
              <Button asChild variant="ghost" size="lg" block>
                <Link href="/today">Go to Today</Link>
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
