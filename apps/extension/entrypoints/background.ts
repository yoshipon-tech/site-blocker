import { BLOCKED_PAGE_URL, parseBlocklist } from "@/utils/blocklist";
import { completePendingSite } from "@/utils/editor";
import {
  clearServiceWorkers,
  findBlockedOrigin,
  serviceWorkerOrigins,
} from "@/utils/service-worker";
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

  /**
   * ブロックリストのサイトがページの読み込みを service worker に受け持たせていると、リダイレクトをすり抜ける。
   * 先に取り除いておき、読み込みがネットに出てリダイレクトで止まるようにする
   */
  async function clearBlockedServiceWorkers() {
    const { domains } = parseBlocklist(await blocklistItem.getValue());
    await clearServiceWorkers(
      browser.browsingData,
      serviceWorkerOrigins(domains),
    );
  }

  /**
   * 先に取り除けなかった service worker がページを表示したとき、タブをブロック画面へ移し、そのオリジンも取り除く。
   * ブロック中のサイトの URL がタブに入るのは、リダイレクトをすり抜けたときだけ
   */
  async function redirectIfBlocked(tabId: number, url: string) {
    const { domains } = parseBlocklist(await blocklistItem.getValue());
    const origin = findBlockedOrigin(url, domains);
    if (origin === null) {
      return;
    }
    // 移し先はリダイレクトのルールと同じ URL の契約（元URLを # の後ろにエンコードせずに置く）
    await Promise.all([
      browser.tabs.update(tabId, { url: `${BLOCKED_PAGE_URL}#${url}` }),
      clearServiceWorkers(browser.browsingData, [origin]),
    ]);
  }

  function refresh() {
    syncAndReport();
    clearBlockedServiceWorkers().catch((error: unknown) => {
      console.error(
        "ブロックするサイトの service worker を取り除けませんでした",
        error,
      );
    });
  }

  // service worker が止まっていてもイベントで起き上がれるよう、リスナーはすべて同期的に登録する。
  // インストール・更新・再読み込み
  browser.runtime.onInstalled.addListener(refresh);
  // 前回の終了前に追従が終わっていなくても、起動時に保存内容へ揃える
  browser.runtime.onStartup.addListener(refresh);
  // 編集画面などで保存内容が変わったとき
  blocklistItem.watch(refresh);
  // タブの URL が変わったとき。changeInfo.url は、ホスト権限を持つページ（ブロック対象のサイト）でだけ届く
  browser.tabs.onUpdated.addListener((tabId, { url }) => {
    if (url === undefined) {
      return;
    }
    redirectIfBlocked(tabId, url).catch((error: unknown) => {
      console.error("ブロックするサイトのページを移せませんでした", error);
    });
  });
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
