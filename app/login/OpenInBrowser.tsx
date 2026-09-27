"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chromeIntentUrl, type InAppBrowser } from "@/lib/auth/in-app-browser";
import { loginPath } from "@/lib/auth/routes";
import { GoogleSignIn } from "./GoogleSignIn";

/**
 * Shown instead of the Google button inside WhatsApp, Instagram, Facebook and
 * other in-app browsers: how to reach Chrome / Safari, and a one-tap Copy
 * link. "Sign in with Google" at the bottom covers a browser we mistook for
 * an in-app one.
 */
export function OpenInBrowser({
  app,
  platform,
  next,
}: {
  app: string | null;
  platform: InAppBrowser["platform"];
  next: string;
}) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [tryAnyway, setTryAnyway] = useState(false);

  useEffect(() => {
    setLink(new URL(loginPath({ next }), window.location.origin).toString());
  }, [next]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Some in-app browsers block the clipboard; the link above is selectable.
      setCopied(false);
    }
  }

  if (tryAnyway) return <GoogleSignIn next={next} initialError={null} />;

  const browser = platform === "ios" ? "Safari" : "Chrome";
  const intent = platform === "android" && link ? chromeIntentUrl(link) : null;
  const where = app ? `${app}'s built-in browser` : "an app's built-in browser";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Card className="space-y-3 p-4">
        <p className="text-base text-text-body">
          You&apos;re in {where}. Open this page in <span className="font-medium text-text-primary">{browser}</span> to
          sign in:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-text-body">
          {platform === "ios" ? (
            <>
              <li>Tap the ••• or Share button (top or bottom corner).</li>
              <li>Choose &ldquo;Open in Safari&rdquo; or &ldquo;Open in browser&rdquo;.</li>
            </>
          ) : (
            <>
              <li>Tap ⋮ in the top right corner.</li>
              <li>Choose &ldquo;Open in Chrome&rdquo; or &ldquo;Open in browser&rdquo;.</li>
            </>
          )}
        </ol>
        <p className="text-sm text-text-secondary">No such option? Copy the link and paste it into {browser}.</p>
        {link && (
          <p className="select-all break-all rounded-[10px] bg-surface-muted px-3 py-2 text-sm text-text-body">{link}</p>
        )}
      </Card>

      <div className="mt-auto space-y-3 pt-2">
        {intent && (
          <Button asChild size="xl" block>
            <a href={intent}>
              <ExternalLink className="h-5 w-5" aria-hidden />
              Open in Chrome
            </a>
          </Button>
        )}
        <Button variant={intent ? "outline" : "default"} size="xl" block onClick={copy} disabled={!link}>
          {copied ? <Check className="h-5 w-5" aria-hidden /> : <Copy className="h-5 w-5" aria-hidden />}
          {copied ? "Link copied" : "Copy link"}
        </Button>
        <p className="sr-only" role="status" aria-live="polite">
          {copied ? `Link copied. Paste it into ${browser}.` : ""}
        </p>
        <Button variant="ghost" size="lg" block onClick={() => setTryAnyway(true)}>
          Already in {browser}? Sign in with Google
        </Button>
      </div>
    </div>
  );
}
