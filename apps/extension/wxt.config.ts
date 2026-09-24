import { defineConfig } from "wxt";
import { BLOCKLIST } from "./utils/blocklist";
import { hostPermissions } from "./utils/rules";

export default defineConfig({
  manifest: {
    // WithHostAccess 自体はインストール時の警告を出さない。redirect に要るホスト権限だけを求める
    permissions: ["declarativeNetRequestWithHostAccess"],
    host_permissions: hostPermissions(BLOCKLIST),
  },
});
