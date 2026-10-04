import { defineConfig } from "wxt";
import { DEFAULT_BLOCKLIST } from "./utils/blocklist";
import { hostPermissions } from "./utils/rules";

export default defineConfig({
  manifest: {
    // WithHostAccess と storage はインストール時の警告を出さない。redirect に要るホスト権限だけを求める
    permissions: ["declarativeNetRequestWithHostAccess", "storage"],
    host_permissions: hostPermissions(DEFAULT_BLOCKLIST),
  },
});
