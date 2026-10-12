import { describe, expect, it } from "vitest";
import { installPlatform, pushNeedsInstall } from "./install";

const UA = {
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1",
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
};

describe("installPlatform", () => {
  it("knows when the app is already on the home screen", () => {
    expect(installPlatform(UA.iosSafari, true)).toBe("installed");
  });

  it("tells iPhone Safari from other iPhone browsers", () => {
    expect(installPlatform(UA.iosSafari, false)).toBe("ios");
    expect(installPlatform(UA.iosChrome, false)).toBe("ios_other");
    expect(installPlatform(UA.ipadDesktopMode, false)).toBe("ios");
  });

  it("spots Android and computers", () => {
    expect(installPlatform(UA.android, false)).toBe("android");
    expect(installPlatform(UA.mac, false)).toBe("desktop");
  });
});

describe("pushNeedsInstall", () => {
  it("is only needed on iPhone", () => {
    expect(pushNeedsInstall("ios")).toBe(true);
    expect(pushNeedsInstall("ios_other")).toBe(true);
    expect(pushNeedsInstall("android")).toBe(false);
    expect(pushNeedsInstall("installed")).toBe(false);
  });
});
