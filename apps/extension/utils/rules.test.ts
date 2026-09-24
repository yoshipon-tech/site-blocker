import type { Browser } from "wxt/browser";
import { describe, expect, it } from "vitest";
import {
  buildRules,
  hostPermissions,
  syncRules,
  type DynamicRulesApi,
} from "./rules";

type Rule = Browser.declarativeNetRequest.Rule;

/** updateDynamicRules の結果を覚えておく偽物 */
function fakeDnr(initial: Rule[]): DynamicRulesApi & { rules: Rule[] } {
  const fake = {
    rules: initial,
    getDynamicRules: () => Promise.resolve([...fake.rules]),
    updateDynamicRules: ({
      removeRuleIds = [],
      addRules = [],
    }: Browser.declarativeNetRequest.UpdateRuleOptions) => {
      fake.rules = [
        ...fake.rules.filter((rule) => !removeRuleIds.includes(rule.id)),
        ...addRules,
      ];
      return Promise.resolve();
    },
  };
  return fake;
}

describe("buildRules", () => {
  it("1サイト1ルールで、並び順に 1 から ID を振る", () => {
    const rules = buildRules(["x.com", "twitter.com"]);

    expect(rules.map((rule) => rule.id)).toEqual([1, 2]);
    expect(rules.map((rule) => rule.condition.requestDomains)).toEqual([
      ["x.com"],
      ["twitter.com"],
    ]);
  });

  it("ページの遷移だけを、元URL全体を # の後ろに置いてブロック画面へリダイレクトする", () => {
    const [rule] = buildRules(["x.com"]);

    expect(rule?.condition.resourceTypes).toEqual(["main_frame"]);
    expect(rule?.condition.regexFilter).toBe("^.+$");
    expect(rule?.action).toEqual({
      type: "redirect",
      redirect: {
        regexSubstitution:
          "https://yoshipon-tech.github.io/site-blocker/blocked/#\\0",
      },
    });
  });
});

describe("syncRules", () => {
  it("ルールがないときはブロックリストのルールを入れる", async () => {
    const dnr = fakeDnr([]);

    await syncRules(dnr, ["x.com", "twitter.com"]);

    expect(dnr.rules).toEqual(buildRules(["x.com", "twitter.com"]));
  });

  it("何度呼んでもルールが重複しない", async () => {
    const dnr = fakeDnr([]);

    await syncRules(dnr, ["x.com", "twitter.com"]);
    await syncRules(dnr, ["x.com", "twitter.com"]);

    expect(dnr.rules).toHaveLength(2);
  });

  it("リストから外したサイトのルールを残さない", async () => {
    const dnr = fakeDnr(buildRules(["x.com", "twitter.com", "example.com"]));

    await syncRules(dnr, ["x.com"]);

    expect(dnr.rules).toEqual(buildRules(["x.com"]));
  });
});

describe("hostPermissions", () => {
  it("サイトとサブドメインに一致するパターンを返す", () => {
    expect(hostPermissions(["x.com", "twitter.com"])).toEqual([
      "*://*.x.com/*",
      "*://*.twitter.com/*",
    ]);
  });
});
