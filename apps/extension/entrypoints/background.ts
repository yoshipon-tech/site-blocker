import { BLOCKLIST } from "@/utils/blocklist";
import { syncRules } from "@/utils/rules";

export default defineBackground(() => {
  // インストール・更新・再読み込みで発火する。dynamic ルールは再起動をまたいで残るので、ここで入れ直せば足りる
  browser.runtime.onInstalled.addListener(() => {
    void syncRules(browser.declarativeNetRequest, BLOCKLIST);
  });
});
