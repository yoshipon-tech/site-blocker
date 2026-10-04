import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

/** 保存内容を用意してから、保存先を定義するモジュールを読み込み直す（init は定義した時点で走る） */
async function loadWith(stored: Record<string, unknown>) {
  await fakeBrowser.storage.local.set(stored);
  vi.resetModules();
  const { blocklistItem } = await import("./storage");
  return blocklistItem;
}

describe("blocklistItem", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("値がないときは初期値を書く", async () => {
    const item = await loadWith({});

    expect(await item.getValue()).toEqual(["x.com", "twitter.com"]);
    expect(await fakeBrowser.storage.local.get("blocklist")).toEqual({
      blocklist: ["x.com", "twitter.com"],
    });
  });

  it("保存済みの値を初期値で上書きしない", async () => {
    const item = await loadWith({ blocklist: ["x.com"] });

    expect(await item.getValue()).toEqual(["x.com"]);
  });

  it("空の配列を初期値で埋め直さない", async () => {
    const item = await loadWith({ blocklist: [] });

    expect(await item.getValue()).toEqual([]);
  });
});
