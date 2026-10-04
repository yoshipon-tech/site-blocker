import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

const sync = vi.fn(() => Promise.resolve());
vi.mock("@/utils/sync", () => ({ createSync: () => sync }));

const completePendingSite = vi.fn(() => Promise.resolve());
vi.mock("@/utils/editor", () => ({ completePendingSite }));

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
});
