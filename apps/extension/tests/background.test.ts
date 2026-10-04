import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { BLOCKED_PAGE_URL } from "@/utils/blocklist";

const sync = vi.fn(() => Promise.resolve());
vi.mock("@/utils/sync", () => ({ createSync: () => sync }));

const completePendingSite = vi.fn(() => Promise.resolve());
vi.mock("@/utils/editor", () => ({ completePendingSite }));

const clearServiceWorkers = vi.fn(() => Promise.resolve());
vi.mock("@/utils/service-worker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/service-worker")>()),
  clearServiceWorkers,
}));

/** 初期値（x.com・twitter.com）から先に取り除くオリジン */
const DEFAULT_ORIGINS = [
  "https://x.com",
  "https://www.x.com",
  "https://m.x.com",
  "https://mobile.x.com",
  "https://twitter.com",
  "https://www.twitter.com",
  "https://m.twitter.com",
  "https://mobile.twitter.com",
];

type PermissionsListener = (permissions: { origins?: string[] }) => void;
let permissionsAdded: PermissionsListener[] = [];

/** background を読み込み直して起動する。リスナーは起動時に登録される */
async function startBackground() {
  vi.resetModules();
  const { default: background } = await import("@/entrypoints/background");
  background.main();
}

// Playwright で起動し直すと onInstalled が毎回発火し onStartup は発火しないため、onStartup はここで確かめる
describe("background", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    sync.mockClear();
    completePendingSite.mockClear();
    clearServiceWorkers.mockClear();
    // fakeBrowser は permissions のイベントを持たないので、登録されたリスナーを覚えておく
    permissionsAdded = [];
    vi.spyOn(fakeBrowser.permissions.onAdded, "addListener").mockImplementation(
      (listener: PermissionsListener) => {
        permissionsAdded.push(listener);
      },
    );
  });

  it("ブラウザの起動時に入れ直す", async () => {
    await startBackground();

    await fakeBrowser.runtime.onStartup.trigger();

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("インストール・更新・再読み込みのときに入れ直す", async () => {
    await startBackground();

    await fakeBrowser.runtime.onInstalled.trigger({ reason: "update" });

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("保存されたブロックリストが変わったときに入れ直す", async () => {
    await startBackground();

    await fakeBrowser.storage.local.set({ blocklist: ["x.com"] });

    await vi.waitFor(() => {
      expect(sync).toHaveBeenCalled();
    });
  });

  it("権限が許可されたとき、待っていた追加を仕上げる", async () => {
    await startBackground();

    for (const listener of permissionsAdded) {
      listener({ origins: ["*://*.youtube.com/*"] });
    }

    expect(completePendingSite).toHaveBeenCalledTimes(1);
    expect(completePendingSite).toHaveBeenCalledWith(
      ["*://*.youtube.com/*"],
      expect.anything(),
    );
  });

  it("ブラウザの起動時に、ブロックするサイトの service worker を取り除く", async () => {
    await startBackground();

    await fakeBrowser.runtime.onStartup.trigger();

    await vi.waitFor(() => {
      expect(clearServiceWorkers).toHaveBeenCalledWith(
        expect.anything(),
        DEFAULT_ORIGINS,
      );
    });
  });

  it("インストール・更新・再読み込みのときに、service worker を取り除く", async () => {
    await startBackground();

    await fakeBrowser.runtime.onInstalled.trigger({ reason: "update" });

    await vi.waitFor(() => {
      expect(clearServiceWorkers).toHaveBeenCalledWith(
        expect.anything(),
        DEFAULT_ORIGINS,
      );
    });
  });

  it("保存されたブロックリストが変わったとき、新しいリストのサイトの service worker を取り除く", async () => {
    await startBackground();

    await fakeBrowser.storage.local.set({
      blocklist: ["youtube.com", "X.com"],
    });

    await vi.waitFor(() => {
      expect(clearServiceWorkers).toHaveBeenLastCalledWith(expect.anything(), [
        "https://youtube.com",
        "https://www.youtube.com",
        "https://m.youtube.com",
        "https://mobile.youtube.com",
      ]);
    });
  });

  it("ブロック中のサイトの URL がタブに入ったら、ブロック画面へ移してそのオリジンの service worker を取り除く", async () => {
    await startBackground();

    await fakeBrowser.tabs.update(0, { url: "https://news.x.com/home?a=1" });

    await vi.waitFor(async () => {
      expect((await fakeBrowser.tabs.get(0)).url).toBe(
        `${BLOCKED_PAGE_URL}#https://news.x.com/home?a=1`,
      );
    });
    expect(clearServiceWorkers).toHaveBeenCalledWith(expect.anything(), [
      "https://news.x.com",
    ]);
  });

  it("ブロック中でないサイトの URL では、タブを移さない", async () => {
    await startBackground();

    await fakeBrowser.tabs.update(0, { url: "https://example.com/" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect((await fakeBrowser.tabs.get(0)).url).toBe("https://example.com/");
    expect(clearServiceWorkers).not.toHaveBeenCalled();
  });
});
