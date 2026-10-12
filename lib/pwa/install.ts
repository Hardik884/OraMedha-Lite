/**
 * "Add to home screen": which instructions fit the phone in hand.
 *
 *   installed   — already opened from the home-screen icon
 *   ios         — iPhone/iPad in Safari: Share → Add to Home Screen
 *   ios_other   — iPhone in Chrome, Edge or Firefox: their Share menu also has
 *                 Add to Home Screen (iOS 16.4+); Safari is the surest way
 *   android     — Chrome menu ⋮ → Add to Home screen / Install app
 *   desktop     — a computer: open the link on the phone instead
 */
export type InstallPlatform = "installed" | "ios" | "ios_other" | "android" | "desktop";

export function installPlatform(userAgent: string, standalone: boolean): InstallPlatform {
  if (standalone) return "installed";
  const ua = userAgent ?? "";
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile\//.test(ua));
  if (isIos) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? "ios_other" : "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Web push works on Android in the browser, but on iPhone only from the
 * home-screen app (iOS 16.4+).
 */
export function pushNeedsInstall(platform: InstallPlatform): boolean {
  return platform === "ios" || platform === "ios_other";
}
