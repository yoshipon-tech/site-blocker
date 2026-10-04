import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Worker,
} from "@playwright/test";
import path from "node:path";

export const BLOCKED_PAGE =
  "https://yoshipon-tech.github.io/site-blocker/blocked/";

const extensionPath = path.join(import.meta.dirname, "../.output/chrome-mv3");

/** service worker の中で使う chrome の一部 */
declare const chrome: {
  declarativeNetRequest: {
    getDynamicRules(): Promise<{ id: number }[]>;
    updateDynamicRules(options: { removeRuleIds: number[] }): Promise<void>;
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

/** テスト用 service worker が返すページが送る記録のリクエスト。ページの中身が表示されたかをこれで判定する */
export const SW_SEEN_URL = "https://record.example/seen";

const SW_REGISTER_PATH = "/__test-sw/register";
// service worker が受け持つ範囲はスクリプトの置き場所より下になるので、サイト全体を受け持つようルート直下に置く
const SW_SCRIPT_PATH = "/__test-sw.js";

/** service worker を登録するページ。登録が済んでページを受け持つまで待てるよう、ready を window に置く */
const SW_REGISTER_PAGE = `<title>register</title><script>
window.ready = navigator.serviceWorker.register("${SW_SCRIPT_PATH}").then(() => navigator.serviceWorker.ready);
</script>`;

/**
 * ページの読み込みを自前で受け持つ service worker（#30 の x.com と同じ状況を作る）。
 * 返すページは、表示されると記録のリクエストを1回送る
 */
const SW_SCRIPT = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  const html = '<title>from-sw</title><script>fetch("${SW_SEEN_URL}?url=" + encodeURIComponent(location.href), { mode: "no-cors" })</scr' + 'ipt>';
  event.respondWith(new Response(html, { headers: { "content-type": "text/html" } }));
});
`;

/**
 * ビルド済みの拡張を読み込んだ Chromium を起動する。拡張は永続コンテキストでしか動かない。
 * 外部への通信はすべて手元の応答に差し替え、送られた URL を requests に残す
 */
export async function launch(
  userDataDir: string,
  // 保存されたブロックリストが空のときはルールが0件のまま。登録を待たずに返す
  { waitForRules = true } = {},
) {
  const context = await chromium.launchPersistentContext(userDataDir, {
    // ヘッドレスで拡張を動かすには chromium チャンネルが要る
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const requests: string[] = [];
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    // 拡張自身のページ（ポップアップ）とそのスクリプトは差し替えない
    if (url.startsWith("chrome-extension://")) {
      await route.continue();
      return;
    }
    requests.push(url);
    const { pathname } = new URL(url);
    if (pathname === SW_SCRIPT_PATH) {
      await route.fulfill({
        contentType: "text/javascript",
        body: SW_SCRIPT,
      });
      return;
    }
    if (pathname === SW_REGISTER_PATH) {
      await route.fulfill({ contentType: "text/html", body: SW_REGISTER_PAGE });
      return;
    }
    const html = url.startsWith(BLOCKED_PAGE)
      ? "<title>blocked</title>"
      : // ほかのページがブロックリストのサイトの画像を読み込む場合を試せるようにする
        '<title>other</title><img src="https://x.com/a.png">';
    await route.fulfill({ contentType: "text/html", body: html });
  });

  // テスト用に登録したサイトの service worker と取り違えないよう、拡張のものを選ぶ
  const isExtension = (w: Worker) => w.url().startsWith("chrome-extension://");
  const worker =
    context.serviceWorkers().find(isExtension) ??
    (await context.waitForEvent("serviceworker", { predicate: isExtension }));
  if (waitForRules) {
    // インストール時・起動時の登録が終わるまで待つ
    await expect.poll(() => ruleCount(worker)).toBeGreaterThan(0);
  }

  return { context, worker, requests };
}

export function ruleCount(worker: Worker): Promise<number> {
  return worker.evaluate(
    async () => (await chrome.declarativeNetRequest.getDynamicRules()).length,
  );
}

/** 保存されたブロックリスト（storage.local の blocklist キー）を読む */
export function getBlocklist(worker: Worker): Promise<unknown> {
  return worker.evaluate(
    async () => (await chrome.storage.local.get("blocklist")).blocklist,
  );
}

/** 保存されたブロックリストを書き換える。編集画面（blocklist-ui）が保存したときと同じ経路で拡張に届く */
export async function setBlocklist(worker: Worker, value: unknown) {
  await worker.evaluate(
    (blocklist) => chrome.storage.local.set({ blocklist }),
    value,
  );
}

/** 保存内容はそのままで、dynamic ルールだけを全部外す（保存内容とルールがずれた状態を作る） */
export async function removeAllRules(worker: Worker) {
  await worker.evaluate(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id),
    });
  });
}

/** 指定したホスト（https）に、ページの読み込みを受け持つテスト用 service worker を登録する */
export async function registerServiceWorker(
  context: BrowserContext,
  host: string,
) {
  const page = await context.newPage();
  await page.goto(`https://${host}${SW_REGISTER_PATH}`);
  await page.evaluate(
    () => (window as unknown as { ready: Promise<unknown> }).ready,
  );
  await page.close();
}

/**
 * 登録されている service worker の scope を、DevTools Protocol のイベントで追い続ける。
 * 拡張が取り除く処理は非同期なので、取り除き終わったのを待ってからページを開くのに使う
 */
export async function watchServiceWorkers(context: BrowserContext) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const registered = new Map<string, boolean>();
  cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
    for (const { scopeURL, isDeleted } of registrations) {
      registered.set(scopeURL, !isDeleted);
    }
  });
  await cdp.send("ServiceWorker.enable");
  return {
    /** scope（`https://x.com/` など）の service worker が登録されているか */
    has: (scope: string) => registered.get(scope) ?? false,
  };
}

/** テスト用 service worker が返したページが、指定した URL で表示された回数 */
export function seenCount(requests: string[], url: string): number {
  const seen = `${SW_SEEN_URL}?url=${encodeURIComponent(url)}`;
  return requests.filter((request) => request === seen).length;
}

/**
 * 編集画面のポップアップを、タブとして開く。Playwright はツールバーのポップアップを開けないため。
 * 拡張の ID は service worker の URL（chrome-extension://<ID>/background.js）から取る
 */
export async function openPopup(context: BrowserContext, worker: Worker) {
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  return page;
}

export const test = base.extend<{
  extension: { context: BrowserContext; worker: Worker; requests: string[] };
}>({
  // eslint-disable-next-line no-empty-pattern -- Playwright のフィクスチャは分割代入が必須
  extension: async ({}, use, testInfo) => {
    const extension = await launch(testInfo.outputPath("profile"));
    await use(extension);
    await extension.context.close();
  },
});

export { expect };
