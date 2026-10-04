import { describe, expect, it, vi } from "vitest";
import { addSite, completePendingSite, removeEntry } from "./editor";
import type { EditorDeps } from "./editor";

const REQUIRED = ["*://*.x.com/*", "*://*.twitter.com/*"];

/** 保存内容と権限を覚える偽物。request は granted の値で許可・拒否を返す */
function fakeDeps({
  stored = ["x.com", "twitter.com"] as unknown,
  granted = [...REQUIRED],
  allow = true,
} = {}) {
  const state = {
    stored,
    pending: null as string | null,
    granted,
    // request を呼んだ時点の pendingSite（呼ぶ前に書かれているか）
    pendingAtRequest: undefined as string | null | undefined,
  };
  const has = (origins: string[]) =>
    origins.every((origin) => state.granted.includes(origin));
  const deps = {
    permissions: {
      contains: vi.fn(({ origins }: { origins: string[] }) =>
        Promise.resolve(has(origins)),
      ),
      request: vi.fn(({ origins }: { origins: string[] }) => {
        state.pendingAtRequest = state.pending;
        if (allow) state.granted.push(...origins);
        return Promise.resolve(allow);
      }),
      remove: vi.fn(({ origins }: { origins: string[] }) => {
        state.granted = state.granted.filter((o) => !origins.includes(o));
        return Promise.resolve(true);
      }),
    },
    blocklist: {
      getValue: () => Promise.resolve(state.stored),
      setValue: vi.fn((value: unknown) => {
        state.stored = value;
        return Promise.resolve();
      }),
    },
    pendingSite: {
      getValue: () => Promise.resolve(state.pending),
      setValue: vi.fn((value: string | null) => {
        state.pending = value;
        return Promise.resolve();
      }),
    },
    requiredOrigins: REQUIRED,
  } satisfies EditorDeps;
  return { deps, state };
}

describe("addSite", () => {
  it("権限を持つサイトは、権限を求めずに正規化して末尾に保存する", async () => {
    const { deps, state } = fakeDeps({ stored: ["x.com"] });

    const result = await addSite("https://www.Twitter.com/home", deps);

    expect(result).toEqual({ ok: true, domain: "twitter.com" });
    expect(state.stored).toEqual(["x.com", "twitter.com"]);
    expect(deps.permissions.request).not.toHaveBeenCalled();
    expect(state.pending).toBeNull();
  });

  it("権限を持たないサイトは、pendingSite を書いてからそのサイトの権限だけを求め、保存は background に任せる", async () => {
    const { deps, state } = fakeDeps();

    const result = await addSite("youtube.com", deps);

    expect(result).toEqual({ ok: true, domain: "youtube.com" });
    expect(deps.permissions.request).toHaveBeenCalledTimes(1);
    expect(deps.permissions.request).toHaveBeenCalledWith({
      origins: ["*://*.youtube.com/*"],
    });
    expect(state.pendingAtRequest).toBe("youtube.com");
    expect(state.stored).toEqual(["x.com", "twitter.com"]);
  });

  it("権限を拒否されたら、ブロックリストを変えず pendingSite を消して理由を返す", async () => {
    const { deps, state } = fakeDeps({ allow: false });

    const result = await addSite("youtube.com", deps);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("追加しませんでした");
    expect(state.stored).toEqual(["x.com", "twitter.com"]);
    expect(state.pending).toBeNull();
  });

  it.each([
    ["", "サイトを入力してください"],
    ["https://", "サイトとして扱えません"],
    ["www.x.com", "x.com は既にブロックしています"],
    ["mobile.x.com", "x.com に含まれる"],
  ])("%j は保存も権限の要求もせず、理由を返す", async (input, reason) => {
    const { deps, state } = fakeDeps();

    const result = await addSite(input, deps);

    expect(!result.ok && result.reason).toContain(reason);
    expect(state.stored).toEqual(["x.com", "twitter.com"]);
    expect(deps.permissions.request).not.toHaveBeenCalled();
    expect(deps.blocklist.setValue).not.toHaveBeenCalled();
  });

  it("無効な項目は残したまま末尾に足す", async () => {
    const { deps, state } = fakeDeps({ stored: ["X.com", 1] });

    await addSite("x.com", deps);

    expect(state.stored).toEqual(["X.com", 1, "x.com"]);
  });

  it("保存内容が配列でないときは、空として足す", async () => {
    const { deps, state } = fakeDeps({ stored: "broken" });

    await addSite("x.com", deps);

    expect(state.stored).toEqual(["x.com"]);
  });
});

describe("completePendingSite", () => {
  it("待っていたサイトのパターンが許可されたら末尾に足し、pendingSite を消す", async () => {
    const { deps, state } = fakeDeps();
    state.pending = "youtube.com";

    await completePendingSite(["*://*.youtube.com/*"], deps);

    expect(state.stored).toEqual(["x.com", "twitter.com", "youtube.com"]);
    expect(state.pending).toBeNull();
  });

  it("別のパターンの許可では何もしない", async () => {
    const { deps, state } = fakeDeps();
    state.pending = "youtube.com";

    await completePendingSite(["*://*.example.com/*"], deps);
    await completePendingSite(undefined, deps);

    expect(state.stored).toEqual(["x.com", "twitter.com"]);
    expect(state.pending).toBe("youtube.com");
  });

  it("待っている追加がなければ何もしない", async () => {
    const { deps } = fakeDeps();

    await completePendingSite(["*://*.youtube.com/*"], deps);

    expect(deps.blocklist.setValue).not.toHaveBeenCalled();
  });

  it("既に入っていれば二重に足さない", async () => {
    const { deps, state } = fakeDeps({ stored: ["youtube.com"] });
    state.pending = "youtube.com";

    await completePendingSite(["*://*.youtube.com/*"], deps);

    expect(state.stored).toEqual(["youtube.com"]);
    expect(state.pending).toBeNull();
  });
});

describe("removeEntry", () => {
  it("その項目だけを外す", async () => {
    const { deps, state } = fakeDeps({
      stored: ["x.com", "twitter.com", "y.com"],
    });

    await removeEntry({ index: 1, value: "twitter.com" }, deps);

    expect(state.stored).toEqual(["x.com", "y.com"]);
  });

  it("最後の1件を外すと空の配列を保存する", async () => {
    const { deps, state } = fakeDeps({ stored: ["x.com"] });

    await removeEntry({ index: 0, value: "x.com" }, deps);

    expect(state.stored).toEqual([]);
  });

  it("位置がずれていたら値で探し直し、見つからなければ何もしない", async () => {
    const { deps, state } = fakeDeps({ stored: ["y.com", "x.com"] });

    await removeEntry({ index: 0, value: "x.com" }, deps);
    expect(state.stored).toEqual(["y.com"]);

    await removeEntry({ index: 0, value: "z.com" }, deps);
    expect(state.stored).toEqual(["y.com"]);
  });

  it("重複した行を外しても、もう1つは残る", async () => {
    const { deps, state } = fakeDeps({ stored: ["x.com", "x.com"] });

    await removeEntry({ index: 1, value: "x.com" }, deps);

    expect(state.stored).toEqual(["x.com"]);
  });

  it("無効な項目も外せる", async () => {
    const { deps, state } = fakeDeps({ stored: ["x.com", 1, "X.com"] });

    await removeEntry({ index: 1, value: 1 }, deps);
    await removeEntry({ index: 1, value: "X.com" }, deps);

    expect(state.stored).toEqual(["x.com"]);
    expect(deps.permissions.remove).not.toHaveBeenCalled();
  });

  it("配列でない値を外すと空の配列を保存する", async () => {
    const { deps, state } = fakeDeps({ stored: "broken" });

    await removeEntry({ index: -1, value: "broken" }, deps);

    expect(state.stored).toEqual([]);
  });

  it("追加時に求めた権限は手放す", async () => {
    const { deps, state } = fakeDeps({
      stored: ["x.com", "youtube.com"],
      granted: [...REQUIRED, "*://*.youtube.com/*"],
    });

    await removeEntry({ index: 1, value: "youtube.com" }, deps);

    expect(deps.permissions.remove).toHaveBeenCalledWith({
      origins: ["*://*.youtube.com/*"],
    });
    expect(state.granted).toEqual(REQUIRED);
  });

  it("インストール時からの権限は手放さない", async () => {
    const { deps } = fakeDeps();

    await removeEntry({ index: 0, value: "x.com" }, deps);

    expect(deps.permissions.remove).not.toHaveBeenCalled();
  });

  it("重複していた同じサイトが残るなら権限を手放さない", async () => {
    const { deps } = fakeDeps({
      stored: ["youtube.com", "youtube.com"],
      granted: [...REQUIRED, "*://*.youtube.com/*"],
    });

    await removeEntry({ index: 1, value: "youtube.com" }, deps);

    expect(deps.permissions.remove).not.toHaveBeenCalled();
  });
});
