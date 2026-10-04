import { defineConfig } from "wxt";
import { DEFAULT_BLOCKLIST } from "./utils/blocklist";
import { hostPermissions } from "./utils/rules";

export default defineConfig({
  manifest: {
    // WithHostAccess・storage・browsingData・activeTab はインストール時の警告を出さない。redirect に要るホスト権限だけを求める。
    // browsingData はブロックするサイトの service worker を取り除くのに使う。
    // activeTab はアイコンを押したときだけ、そのタブの URL をポップアップで読むのに使う
    permissions: [
      "declarativeNetRequestWithHostAccess",
      "storage",
      "browsingData",
      "activeTab",
    ],
    host_permissions: hostPermissions(DEFAULT_BLOCKLIST),
    // 編集画面で足したサイトの権限は、追加のたびにそのサイトだけを求める。任意の権限はインストール時の警告に出ない
    optional_host_permissions: ["*://*/*"],
  },
});
