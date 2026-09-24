/** ブロックするサイト。サブドメインも含めてブロックする。変えるときは拡張を更新する */
export const BLOCKLIST = ["x.com", "twitter.com"];

/**
 * ブロック画面の URL。元URLは # の後ろにエンコードせずに置く（guide-tech.md の URL の契約）。
 * 配布した拡張に焼き込まれるので、変えると古い拡張が古い URL を指し続ける
 */
export const BLOCKED_PAGE_URL =
  "https://yoshipon-tech.github.io/site-blocker/blocked/";
