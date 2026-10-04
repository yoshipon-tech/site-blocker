import { storage } from "wxt/utils/storage";
import { DEFAULT_BLOCKLIST } from "./blocklist";

/**
 * 保存されたブロックリスト（storage.local の blocklist キー）。書くのは編集画面（blocklist-ui）だけ。
 * 値がないときだけ初期値を書き、空の配列は「全部外した」として埋め直さない。
 * 中身は編集画面以外から書かれることもあるので、読んだら parseBlocklist で検査する。
 * wxt.config.ts から import される blocklist.ts とは分ける（設定の読み込み時に storage を触らないため）
 */
export const blocklistItem = storage.defineItem<string[]>("local:blocklist", {
  init: () => [...DEFAULT_BLOCKLIST],
  version: 1,
});
