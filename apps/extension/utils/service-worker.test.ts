import { describe, expect, it, vi } from "vitest";
import { BLOCKED_PAGE_URL } from "./blocklist";
import {
  clearServiceWorkers,
  findBlockedOrigin,
  serviceWorkerOrigins,
  type BrowsingDataApi,
} from "./service-worker";

describe("serviceWorkerOrigins", () => {
  it("各ドメインの本体と www.・m.・mobile. の https オリジンを作る", () => {
    expect(serviceWorkerOrigins(["youtube.com", "x.com"])).toEqual([
      "https://youtube.com",
      "https://www.youtube.com",
      "https://m.youtube.com",
      "https://mobile.youtube.com",
      "https://x.com",
      "https://www.x.com",
      "https://m.x.com",
      "https://mobile.x.com",
    ]);
  });

  it("ドメインがなければ空", () => {
    expect(serviceWorkerOrigins([])).toEqual([]);
  });
});

describe("findBlockedOrigin", () => {
  const domains = ["x.com", "youtube.com"];

  it.each([
    ["https://x.com/home", "https://x.com"],
    ["https://news.x.com/a?b=1#c", "https://news.x.com"],
    ["https://www.youtube.com/watch?v=1", "https://www.youtube.com"],
    ["http://x.com/", "https://x.com"],
    ["https://x.com:8443/", "https://x.com"],
  ])("ブロック中のサイト %j は %j を返す", (url, origin) => {
    expect(findBlockedOrigin(url, domains)).toBe(origin);
  });

  it.each([
    "https://notx.com/",
    "https://x.com.example.test/",
    "https://example.com/",
    `${BLOCKED_PAGE_URL}#https://x.com/home`,
    "chrome://extensions/",
    "about:blank",
    "not a url",
  ])("ブロック中でない %j は null", (url) => {
    expect(findBlockedOrigin(url, domains)).toBeNull();
  });

  it("ブロック画面のホストがブロックリストにあっても、ブロック画面は null", () => {
    expect(
      findBlockedOrigin(`${BLOCKED_PAGE_URL}#https://x.com/`, ["github.io"]),
    ).toBeNull();
  });

  it("ブロックリストが空なら null", () => {
    expect(findBlockedOrigin("https://x.com/", [])).toBeNull();
  });
});

describe("clearServiceWorkers", () => {
  it("指定したオリジンの service worker だけを取り除く", async () => {
    const browsingData = { remove: vi.fn<BrowsingDataApi["remove"]>() };

    await clearServiceWorkers(browsingData, [
      "https://x.com",
      "https://www.x.com",
    ]);

    expect(browsingData.remove).toHaveBeenCalledTimes(1);
    expect(browsingData.remove).toHaveBeenCalledWith(
      { origins: ["https://x.com", "https://www.x.com"] },
      { serviceWorkers: true },
    );
  });

  it("オリジンが空なら呼ばない", async () => {
    const browsingData = { remove: vi.fn<BrowsingDataApi["remove"]>() };

    await clearServiceWorkers(browsingData, []);

    expect(browsingData.remove).not.toHaveBeenCalled();
  });
});
