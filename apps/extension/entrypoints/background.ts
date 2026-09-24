import { BLOCKLIST } from "@/utils/blocklist";
import { syncRules } from "@/utils/rules";

export default defineBackground(() => {
  // インストール・更新・再読み込みで発火する。dynamic ルールは再起動をまたいで残るので、ここで入れ直せば足りる
  browser.runtime.onInstalled.addListener(() => {
    // 失敗するとブロックが効かないまま気づけないので、service worker のコンソールに理由を残す
    syncRules(browser.declarativeNetRequest, BLOCKLIST).catch(
      (error: unknown) => {
        console.error("ブロックのルールを登録できませんでした", error);
      },
    );
  });
});
