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
  declarativeNetRequest: { getDynamicRules(): Promise<{ id: number }[]> };
};

/**
 * ビルド済みの拡張を読み込んだ Chromium を起動する。拡張は永続コンテキストでしか動かない。
 * 外部への通信はすべて手元の応答に差し替え、送られた URL を requests に残す
 */
export async function launch(userDataDir: string) {
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
    requests.push(url);
    const html = url.startsWith(BLOCKED_PAGE)
      ? "<title>blocked</title>"
      : // ほかのページがブロックリストのサイトの画像を読み込む場合を試せるようにする
        '<title>other</title><img src="https://x.com/a.png">';
    await route.fulfill({ contentType: "text/html", body: html });
  });

  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  // インストール時の登録（onInstalled）が終わるまで待つ
  await expect.poll(() => ruleCount(worker)).toBeGreaterThan(0);

  return { context, worker, requests };
}

export function ruleCount(worker: Worker): Promise<number> {
  return worker.evaluate(
    async () => (await chrome.declarativeNetRequest.getDynamicRules()).length,
  );
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
