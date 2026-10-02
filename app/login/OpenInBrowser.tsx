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
 * other in-app browsers (Google refuses to sign in there): how to reach
 * Chrome / Safari, and a one-tap Copy link. Email sign-in, below it on the
 * login screen, works here as it is. "Already in Chrome/Safari?" covers a
 * browser we mistook for an in-app one.
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
      // Some in-app browsers block the clipboard; the link shown is selectable.
      setCopied(false);
    }
  }

  if (tryAnyway) return <GoogleSignIn next={next} initialError={null} />;

  const browser = platform === "ios" ? "Safari" : "Chrome";
  const intent = platform === "android" && link ? chromeIntentUrl(link) : null;
  const where = app ? `${app}'s built-in browser` : "an app's built-in browser";
  const menu = platform === "ios" ? "the ••• or Share button" : "⋮ (top right)";

  return (
    <Card className="space-y-3 p-4" data-open-in-browser>
      <p className="text-sm text-text-body">
        You&apos;re in {where}, where Google doesn&apos;t allow signing in. To use Google, tap {menu} and choose
        &ldquo;Open in {browser}&rdquo;, or copy the link into {browser}.
      </p>
      {link && (
        <p className="select-all break-all rounded-[10px] bg-surface-muted px-3 py-2 text-sm text-text-body">{link}</p>
      )}
      <div className="grid gap-2">
        {intent && (
          <Button asChild size="lg" block>
            <a href={intent}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open in Chrome
            </a>
          </Button>
        )}
        <Button variant="outline" size="lg" block onClick={copy} disabled={!link}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Link copied" : "Copy link"}
        </Button>
        <p className="sr-only" role="status" aria-live="polite">
          {copied ? `Link copied. Paste it into ${browser}.` : ""}
        </p>
        <Button variant="ghost" size="lg" block onClick={() => setTryAnyway(true)}>
          Already in {browser}? Use Google
        </Button>
      </div>
    </Card>
  );
}
