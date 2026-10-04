import { parseBlocklist } from "./blocklist";
import { syncRules, type DynamicRulesApi } from "./rules";

/** 入れ直しの結果を残す先。background では console を渡す */
export type SyncLog = {
  warn(message: string, detail: unknown): void;
  error(message: string, detail: unknown): void;
};

/**
 * 保存されたブロックリストに dynamic ルールを揃える関数を返す。
 * 呼ぶたびに列に並び、前の入れ直しが終わってから最新の保存内容を読む。
 * getDynamicRules と updateDynamicRules の間に別の入れ直しが割り込むと同じ ID を二重に足して失敗するため
 */
export function createSync(
  dnr: DynamicRulesApi,
  readBlocklist: () => Promise<unknown>,
  log: SyncLog,
): () => Promise<void> {
  let queue = Promise.resolve();

  async function run(): Promise<void> {
    const stored = await readBlocklist();
    const parsed = parseBlocklist(stored);
    if (parsed.invalidShape) {
      log.error(
        "保存されたブロックリストが配列ではないため、どのサイトもブロックしません",
        stored,
      );
    }
    for (const entry of parsed.ignored) {
      log.warn(
        `ブロックリストの項目を無視しました: ${entry.reason}`,
        entry.value,
      );
    }
    await syncRules(dnr, parsed.domains);
  }

  return () => {
    const next = queue.then(run);
    // 失敗は呼び出し元に返し、列には残さない（1回の失敗で後続を止めない）
    queue = next.catch(() => undefined);
    return next;
  };
}
