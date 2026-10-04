import { completePendingSite } from "@/utils/editor";
import { blocklistItem, pendingSiteItem } from "@/utils/storage";
import { createSync } from "@/utils/sync";

export default defineBackground(() => {
  const sync = createSync(
    browser.declarativeNetRequest,
    () => blocklistItem.getValue(),
    console,
  );

  function syncAndReport() {
    // 失敗するとブロックが効かないまま気づけないので、service worker のコンソールに理由を残す
    sync().catch((error: unknown) => {
      console.error("ブロックのルールを登録できませんでした", error);
    });
  }

  // service worker が止まっていてもイベントで起き上がれるよう、リスナーはすべて同期的に登録する。
  // インストール・更新・再読み込み
  browser.runtime.onInstalled.addListener(syncAndReport);
  // 前回の終了前に追従が終わっていなくても、起動時に保存内容へ揃える
  browser.runtime.onStartup.addListener(syncAndReport);
  // 編集画面などで保存内容が変わったとき
  blocklistItem.watch(syncAndReport);
  // ポップアップから求めた権限が許可されたとき。ポップアップは権限ダイアログで閉じることがあるので、追加はここで仕上げる
  browser.permissions.onAdded.addListener(({ origins }) => {
    completePendingSite(origins, {
      blocklist: blocklistItem,
      pendingSite: pendingSiteItem,
    }).catch((error: unknown) => {
      console.error(
        "許可されたサイトをブロックリストに追加できませんでした",
        error,
      );
    });
  });
});
