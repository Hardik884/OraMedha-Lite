/**
 * In-app browsers.
 *
 * A link tapped inside WhatsApp, Instagram, Facebook and similar apps opens
 * in that app's own built-in browser. Google refuses to sign anyone in there
 * ("disallowed_useragent"), so instead of a Google button that can only fail,
 * the login screen asks the PG to open the page in Chrome or Safari.
 *
 * Detection is by user agent, which is all these browsers give us. It errs on
 * the side of showing the Google button: an unknown browser gets it.
 */
export type InAppBrowser = {
  /** The app's name as PGs know it, or null for a generic built-in browser. */
  app: string | null;
  platform: "android" | "ios" | "other";
};

const APPS: { name: string; pattern: RegExp }[] = [
  { name: "WhatsApp", pattern: /WhatsApp/i },
  { name: "Instagram", pattern: /Instagram/i },
  // Facebook and Messenger both mark themselves with FBAN / FBAV / FB_IAB.
  { name: "Facebook", pattern: /\bFB(AN|AV|_IAB|IOS)\b|\[FB/i },
  { name: "LinkedIn", pattern: /LinkedInApp/i },
  { name: "Snapchat", pattern: /Snapchat/i },
  { name: "X", pattern: /\bTwitter/i },
  { name: "Telegram", pattern: /Telegram/i },
  { name: "TikTok", pattern: /musical_ly|BytedanceWebview|TikTok/i },
  { name: "Line", pattern: /\bLine\/\d/ },
  { name: "Pinterest", pattern: /Pinterest/i },
];

function platformOf(ua: string): InAppBrowser["platform"] {
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "other";
}

export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  const ua = userAgent ?? "";
  if (!ua) return null;
  const platform = platformOf(ua);

  const app = APPS.find((a) => a.pattern.test(ua));
  if (app) return { app: app.name, platform };

  // Any other Android WebView ("; wv)" in the UA). Chrome Custom Tabs — what
  // Gmail and most apps use — report plain Chrome and are fine.
  if (platform === "android" && /;\s?wv\)/.test(ua)) return { app: null, platform };

  // iOS WebViews lack "Safari/" in the UA; real Safari, Chrome (CriOS),
  // Firefox (FxiOS) and Edge (EdgiOS) all have it.
  if (platform === "ios" && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) {
    return { app: null, platform };
  }

  return null;
}

/**
 * Android can be asked to open a page in Chrome directly from most in-app
 * browsers, with an intent link. Only for https pages.
 */
export function chromeIntentUrl(pageUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;
}
