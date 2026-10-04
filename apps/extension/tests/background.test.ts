import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

const sync = vi.fn(() => Promise.resolve());
vi.mock("@/utils/sync", () => ({ createSync: () => sync }));

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
});
