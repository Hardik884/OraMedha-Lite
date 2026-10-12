"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { installPlatform, type InstallPlatform } from "@/lib/pwa/install";
import { canPromptInstall, isStandalone, onInstallPromptChange, promptInstall } from "@/lib/push/browser";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/brand/name";

type Phone = "android" | "iphone";

/**
 * Add to home screen, step by step, for Android and iPhone. Opens on the
 * phone in hand; the other phone's steps are one tap away (to help a
 * colleague). On Android Chrome, a one-tap Install button when it's offered.
 */
export function InstallGuide() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [phone, setPhone] = useState<Phone>("android");
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const p = installPlatform(navigator.userAgent, isStandalone());
    setPlatform(p);
    if (p === "ios" || p === "ios_other") setPhone("iphone");
    setCanInstall(canPromptInstall());
    return onInstallPromptChange(() => setCanInstall(canPromptInstall()));
  }, []);

  async function install() {
    if (await promptInstall()) setInstalled(true);
  }

  if (platform === "installed" || installed) {
    return (
      <Card className="flex items-start gap-3 p-4" role="status">
        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-strong" aria-hidden />
        <p className="text-base text-text-body">
          {installed ? "Added." : "You're already using the home-screen app."} Open {APP_NAME} from the{" "}
          <span className="font-medium text-text-primary">{APP_SHORT_NAME}</span> icon on your home screen.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SegmentedTabs
        tabs={[
          { key: "android", label: "Android" },
          { key: "iphone", label: "iPhone" },
        ]}
        value={phone}
        onChange={(k) => setPhone(k as Phone)}
      />

      {platform === "desktop" && (
        <p className="text-sm text-text-secondary">
          You&apos;re on a computer. Open this page on your phone and follow the steps there.
        </p>
      )}

      {phone === "android" ? (
        <>
          {canInstall && platform === "android" && (
            <Button size="xl" block onClick={install}>
              <Download className="h-5 w-5" aria-hidden />
              Install app
            </Button>
          )}
          <Steps
            steps={[
              <>Open this site in <strong>Chrome</strong>.</>,
              <>
                Tap <Icon><EllipsisVertical className="h-4 w-4" aria-hidden /></Icon> (the three dots) at the top right.
              </>,
              <>
                Tap <strong>Add to Home screen</strong> (on some phones: <strong>Install app</strong>).
              </>,
              <>
                Tap <strong>Install</strong> or <strong>Add</strong>.
              </>,
              <>
                Open {APP_NAME} from the new <strong>{APP_SHORT_NAME}</strong> icon from now on.
              </>,
            ]}
          />
        </>
      ) : (
        <>
          {platform === "ios_other" && (
            <p className="rounded-[10px] border border-warning-border bg-warning-bg px-3.5 py-3 text-sm text-text-body">
              Safari works best for this. Copy this page&apos;s address into Safari, or follow the same steps in this
              browser&apos;s Share menu.
            </p>
          )}
          <Steps
            steps={[
              <>Open this site in <strong>Safari</strong>.</>,
              <>
                Tap the <strong>Share</strong> button <Icon><Share className="h-4 w-4" aria-hidden /></Icon> (bottom of
                the screen, or top right on iPad).
              </>,
              <>
                Scroll down and tap <strong>Add to Home Screen</strong>{" "}
                <Icon><SquarePlus className="h-4 w-4" aria-hidden /></Icon>.
              </>,
              <>
                Tap <strong>Add</strong> (top right).
              </>,
              <>
                Open {APP_NAME} from the new <strong>{APP_SHORT_NAME}</strong> icon. You may need to sign in once more
                there.
              </>,
            ]}
          />
          <p className="text-sm text-text-secondary">
            Needed on iPhone for the evening reminder: iPhones only show notifications from apps on the home screen
            (iOS 16.4 or newer).
          </p>
        </>
      )}
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 w-6 translate-y-1 items-center justify-center rounded-md bg-surface-muted text-text-primary">
      {children}
    </span>
  );
}

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <Card className="p-4">
      <ol className="space-y-3.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {i + 1}
            </span>
            <span className="pt-0.5 text-base text-text-body">{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
