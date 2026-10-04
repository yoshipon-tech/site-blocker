/**
 * ブロックリストの初期値。保存先に値がないとき（初回のインストールや、コードに書いたリストで動いていた版からの更新）だけ使う。
 * host_permissions もここから作るので、変えると権限も変わる
 */
export const DEFAULT_BLOCKLIST = ["x.com", "twitter.com"];

/**
 * ブロック画面の URL。元URLは # の後ろにエンコードせずに置く（guide-tech.md の URL の契約）。
 * 配布した拡張に焼き込まれるので、変えると古い拡張が古い URL を指し続ける
 */
export const BLOCKED_PAGE_URL =
  "https://yoshipon-tech.github.io/site-blocker/blocked/";

/** parseBlocklist が捨てた項目と、その理由 */
export type IgnoredEntry = { value: unknown; reason: string };

export type ParsedBlocklist = {
  /** ルールにするドメイン。重複を除き、保存されていた順に並ぶ */
  domains: string[];
  ignored: IgnoredEntry[];
  /** 保存内容が配列でなかった。このとき domains は空 */
  invalidShape: boolean;
};

// requestDomains が受け付ける形（小文字の ASCII）。英数字とハイフンのラベルをドットでつなぐ
const DOMAIN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

/**
 * 保存されたブロックリストを、ルールにできるドメインの配列にする。
 * updateDynamicRules は1件でも不正なら全体が失敗するので、不正な項目は捨てて残りを通す。
 * 大文字を小文字にするなどの正規化はしない（入力時に編集画面が行う）
 */
export function parseBlocklist(value: unknown): ParsedBlocklist {
  if (!Array.isArray(value)) {
    return { domains: [], ignored: [], invalidShape: true };
  }

  const entries: unknown[] = value;
  const domains: string[] = [];
  const ignored: IgnoredEntry[] = [];
  for (const entry of entries) {
    if (typeof entry !== "string") {
      ignored.push({ value: entry, reason: "文字列ではない" });
    } else if (!DOMAIN.test(entry)) {
      ignored.push({
        value: entry,
        reason: "小文字のドメインではない（スキーム・パス・大文字などを含む）",
      });
    } else if (domains.includes(entry)) {
      ignored.push({ value: entry, reason: "重複している" });
    } else {
      domains.push(entry);
    }
  }
  return { domains, ignored, invalidShape: false };
}
