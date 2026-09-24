import type { Browser } from "wxt/browser";
import { BLOCKED_PAGE_URL } from "./blocklist";

type Rule = Browser.declarativeNetRequest.Rule;

/** syncRules が使う declarativeNetRequest の一部。テストでは偽物を渡す */
export type DynamicRulesApi = {
  getDynamicRules(): Promise<Rule[]>;
  updateDynamicRules(
    options: Browser.declarativeNetRequest.UpdateRuleOptions,
  ): Promise<void>;
};

/**
 * 1サイト1ルールで、ブロック画面へのリダイレクトルールを組み立てる。
 * ID は並び順で 1..n。サイト単位で外せるように分けておく（一時解除で使う）
 */
export function buildRules(blocklist: readonly string[]): Rule[] {
  return blocklist.map((domain, index): Rule => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      // \0 は一致した URL 全体。パス・クエリ・フラグメントまで含み、エンコードし直さない
      redirect: { regexSubstitution: `${BLOCKED_PAGE_URL}#\\0` },
    },
    condition: {
      // regexSubstitution には regexFilter が要る。対象の絞り込みは requestDomains で行う
      regexFilter: "^.+$",
      // サブドメインにも一致する
      requestDomains: [domain],
      // ページの遷移だけを止め、画像・スクリプト・iframe は止めない
      resourceTypes: ["main_frame"],
    },
  }));
}

/**
 * 既存の dynamic ルールをすべて外し、ブロックリストから組み立てたルールを入れ直す。
 * 何度呼んでもルールは重複せず、リストから外したサイトのルールも残らない
 */
export async function syncRules(
  dnr: DynamicRulesApi,
  blocklist: readonly string[],
): Promise<void> {
  const existing = await dnr.getDynamicRules();
  await dnr.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: buildRules(blocklist),
  });
}

/** manifest の host_permissions。*.x.com は x.com 自身も含む */
export function hostPermissions(blocklist: readonly string[]): string[] {
  return blocklist.map((domain) => `*://*.${domain}/*`);
}
