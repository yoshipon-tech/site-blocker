import type { Browser } from "wxt/browser";
import { BLOCKED_PAGE_URL } from "./blocklist";

/** clearServiceWorkers が使う browsingData の一部。テストでは偽物を渡す */
export type BrowsingDataApi = {
  remove(
    options: Browser.browsingData.RemovalOptions,
    dataToRemove: Browser.browsingData.DataTypeSet,
  ): Promise<void>;
};

/**
 * 先に取り除くサブドメイン。browsingData はオリジンを完全一致でしか指定できないので、
 * 実際に service worker が登録される本体・www.・m.・mobile. を並べる。漏れたものは開いた時点で拾う
 */
const PREFIXES = ["", "www.", "m.", "mobile."];

/** ブロックリストのドメインから、先に service worker を取り除くオリジンを作る。service worker は https にしか登録されない */
export function serviceWorkerOrigins(domains: readonly string[]): string[] {
  return domains.flatMap((domain) =>
    PREFIXES.map((prefix) => `https://${prefix}${domain}`),
  );
}

/**
 * タブに入った URL が、ブロック中のドメインかそのサブドメインなら、取り除く https オリジンを返す。
 * リダイレクトされていれば URL はブロック画面になるので、当たるのはリダイレクトをすり抜けたときだけ
 */
export function findBlockedOrigin(
  url: string,
  domains: readonly string[],
): string | null {
  // ブロック画面のホストがブロックリストに入っていても、ブロック画面自体は移さない
  if (url.startsWith(BLOCKED_PAGE_URL)) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname;
  const blocked = domains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
  return blocked ? `https://${host}` : null;
}

/** 指定したオリジンの service worker だけを取り除く。Cookie やほかの保存データには触れない */
export async function clearServiceWorkers(
  browsingData: BrowsingDataApi,
  origins: readonly string[],
): Promise<void> {
  const [first, ...rest] = origins;
  if (first === undefined) {
    return;
  }
  await browsingData.remove(
    { origins: [first, ...rest] },
    { serviceWorkers: true },
  );
}
