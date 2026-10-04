import type { Browser } from "wxt/browser";
import { describe, expect, it, vi } from "vitest";
import { buildRules, type DynamicRulesApi } from "./rules";
import { createSync, type SyncLog } from "./sync";

type Rule = Browser.declarativeNetRequest.Rule;

type FakeDnr = DynamicRulesApi & { rules: Rule[]; maxConcurrent: number };

/**
 * updateDynamicRules の結果を覚え、同時に走った入れ直しの数の最大を記録する偽物。
 * 本物と同じく、既にある ID を足そうとすると失敗する
 */
function fakeDnr(): FakeDnr {
  let running = 0;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 5));
  const fake: FakeDnr = {
    rules: [],
    maxConcurrent: 0,
    getDynamicRules: async () => {
      running += 1;
      fake.maxConcurrent = Math.max(fake.maxConcurrent, running);
      await wait();
      return [...fake.rules];
    },
    updateDynamicRules: async ({ removeRuleIds = [], addRules = [] }) => {
      await wait();
      running -= 1;
      const kept = fake.rules.filter(
        (rule) => !removeRuleIds.includes(rule.id),
      );
      if (addRules.some((rule) => kept.some((k) => k.id === rule.id))) {
        throw new Error("Rule with id already exists");
      }
      fake.rules = [...kept, ...addRules];
    },
  };
  return fake;
}

function fakeLog() {
  return { warn: vi.fn<SyncLog["warn"]>(), error: vi.fn<SyncLog["error"]>() };
}

describe("createSync", () => {
  it("続けて呼んでも入れ直しが重ならず、最後の保存内容に揃う", async () => {
    const dnr = fakeDnr();
    let stored: unknown = ["x.com"];
    const sync = createSync(dnr, () => Promise.resolve(stored), fakeLog());

    const first = sync();
    stored = ["x.com", "twitter.com"];
    const second = sync();
    stored = ["example.com", "x.com", "twitter.com"];
    const third = sync();
    await Promise.all([first, second, third]);

    expect(dnr.maxConcurrent).toBe(1);
    expect(dnr.rules).toEqual(
      buildRules(["example.com", "x.com", "twitter.com"]),
    );
  });

  it("捨てた項目と理由を warn に渡し、残りでルールを作る", async () => {
    const dnr = fakeDnr();
    const log = fakeLog();
    const sync = createSync(
      dnr,
      () => Promise.resolve(["x.com", "https://y.com", "x.com"]),
      log,
    );

    await sync();

    expect(dnr.rules).toEqual(buildRules(["x.com"]));
    expect(log.warn).toHaveBeenCalledTimes(2);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("ドメインではない"),
      "https://y.com",
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("重複"),
      "x.com",
    );
    expect(log.error).not.toHaveBeenCalled();
  });

  it("配列でない保存内容は error に渡し、ルールを全部外す", async () => {
    const dnr = fakeDnr();
    dnr.rules = buildRules(["x.com"]);
    const log = fakeLog();
    const sync = createSync(dnr, () => Promise.resolve("x.com"), log);

    await sync();

    expect(dnr.rules).toEqual([]);
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining("配列ではない"),
      "x.com",
    );
  });

  it("途中で失敗しても、次の呼び出しは実行される", async () => {
    const dnr = fakeDnr();
    const read = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("読めない"))
      .mockResolvedValue(["x.com"]);
    const sync = createSync(dnr, read, fakeLog());

    await expect(sync()).rejects.toThrow("読めない");
    await sync();

    expect(dnr.rules).toEqual(buildRules(["x.com"]));
  });
});
