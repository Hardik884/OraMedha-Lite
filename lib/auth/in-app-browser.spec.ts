import { describe, expect, it } from "vitest";
import { chromeIntentUrl, detectInAppBrowser } from "./in-app-browser";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  androidWhatsApp:
    "Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 WhatsApp/2.24.12.78",
  iosInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.3.23.101 (iPhone14,5; iOS 17_5; en_IN; en; scale=3.00; 1170x2532; 614158928)",
  iosFacebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.108;FBBV/620000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5]",
  androidFacebook:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.43.109;]",
  androidWebView:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36",
  iosWebView:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
};

describe("detectInAppBrowser", () => {
  it.each([
    ["Android Chrome", UA.androidChrome],
    ["iPhone Safari", UA.iosSafari],
    ["iPhone Chrome", UA.iosChrome],
    ["desktop Chrome", UA.desktopChrome],
    ["no user agent", ""],
  ])("lets %s sign in with Google", (_name, ua) => {
    expect(detectInAppBrowser(ua)).toBeNull();
  });

  it("names WhatsApp, Instagram and Facebook", () => {
    expect(detectInAppBrowser(UA.androidWhatsApp)).toEqual({ app: "WhatsApp", platform: "android" });
    expect(detectInAppBrowser(UA.iosInstagram)).toEqual({ app: "Instagram", platform: "ios" });
    expect(detectInAppBrowser(UA.iosFacebook)).toEqual({ app: "Facebook", platform: "ios" });
    expect(detectInAppBrowser(UA.androidFacebook)).toEqual({ app: "Facebook", platform: "android" });
  });

  it("catches unnamed built-in browsers on Android and iPhone", () => {
    expect(detectInAppBrowser(UA.androidWebView)).toEqual({ app: null, platform: "android" });
    expect(detectInAppBrowser(UA.iosWebView)).toEqual({ app: null, platform: "ios" });
  });
});

describe("chromeIntentUrl", () => {
  it("builds an Android intent for an https page", () => {
    expect(chromeIntentUrl("https://lite.example.com/login?next=%2Fpatients")).toBe(
      "intent://lite.example.com/login?next=%2Fpatients#Intent;scheme=https;package=com.android.chrome;end",
    );
  });

  it("refuses anything else", () => {
    expect(chromeIntentUrl("http://192.168.1.23:3000/login")).toBeNull();
    expect(chromeIntentUrl("not a url")).toBeNull();
  });
});
