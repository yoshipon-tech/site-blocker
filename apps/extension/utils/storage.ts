import { storage } from "wxt/utils/storage";
import { DEFAULT_BLOCKLIST } from "./blocklist";

/**
 * 保存されたブロックリスト（storage.local の blocklist キー）。書くのは編集画面（blocklist-ui）の
 * ポップアップと、権限の許可を受けて追加を仕上げる background だけ。
 * 値がないときだけ初期値を書き、空の配列は「全部外した」として埋め直さない。
 * 中身は開発者のコンソールなどから書かれることもあるので unknown として扱い、読んだら parseBlocklist で検査する。
 * wxt.config.ts から import される blocklist.ts とは分ける（設定の読み込み時に storage を触らないため）
 */
export const blocklistItem = storage.defineItem<unknown>("local:blocklist", {
  init: () => [...DEFAULT_BLOCKLIST],
  version: 1,
});

/**
 * 権限の許可を待っている追加（storage.session の pendingSite キー）。
 * ポップアップは権限ダイアログで閉じることがあるので、許可を受けた background がここを見て追加を仕上げる。
 * session はブラウザを閉じると消えるので、拒否されて残った値も持ち越さない
 */
export const pendingSiteItem = storage.defineItem<string | null>(
  "session:pendingSite",
  { fallback: null },
);
