import { isDomain, parseBlocklist } from "./blocklist";

/** 登録できるサイトの上限。ルールは regexFilter を使うので、正規表現ルールの上限（1,000 件）に揃える */
export const MAX_SITES = 1000;

export type Checked<T> = ({ ok: true } & T) | { ok: false; reason: string };

/** 編集画面に出す1行。保存内容の項目と1対1に対応する */
export type EntryRow = {
  /** 保存内容での位置。配列でない値のときは -1 */
  index: number;
  value: unknown;
  /** 画面に出す文字列 */
  label: string;
  /** ブロックに使われない項目のとき、その理由 */
  invalidReason?: string;
};

const INVALID_INPUT =
  "サイトとして扱えません。youtube.com のようなドメインか URL を入力してください";

/**
 * 入力をブロックリストに保存する形（小文字のドメイン）にする。
 * URL ならホスト名を取り出し、先頭の www. を外す。小文字化と国際化ドメインの変換は URL に任せる
 */
export function normalizeSite(input: string): Checked<{ domain: string }> {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, reason: "サイトを入力してください" };
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, reason: INVALID_INPUT };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: INVALID_INPUT };
  }

  const domain = url.hostname.replace(/^www\./, "");
  if (!isDomain(domain)) {
    return { ok: false, reason: INVALID_INPUT };
  }
  return { ok: true, domain };
}

/** 正規化済みのドメインを、保存されたブロックリストに足してよいか */
export function checkAdd(stored: unknown, domain: string): Checked<object> {
  const { domains } = parseBlocklist(stored);

  if (domains.includes(domain)) {
    return { ok: false, reason: `${domain} は既にブロックしています` };
  }
  // requestDomains はサブドメインにも一致するので、親が入っていれば既に止まっている
  const parent = domains.find((existing) => domain.endsWith(`.${existing}`));
  if (parent !== undefined) {
    return {
      ok: false,
      reason: `${domain} は ${parent} に含まれるため、既にブロックしています`,
    };
  }
  if (domains.length >= MAX_SITES) {
    return {
      ok: false,
      reason: `登録できるのは ${MAX_SITES.toLocaleString()} 件までです`,
    };
  }
  return { ok: true };
}

/** 保存内容を、保存順に画面の行にする。ブロックに使われない項目には理由を付ける */
export function describeEntries(stored: unknown): EntryRow[] {
  if (!Array.isArray(stored)) {
    return [
      {
        index: -1,
        value: stored,
        label: toLabel(stored),
        invalidReason: "保存内容がリストではありません",
      },
    ];
  }

  const entries: unknown[] = stored;
  const seen = new Set<string>();
  return entries.map((value, index): EntryRow => {
    const row = { index, value, label: toLabel(value) };
    if (!isDomain(value)) {
      return { ...row, invalidReason: "小文字のドメインではありません" };
    }
    if (seen.has(value)) {
      return { ...row, invalidReason: "重複しています" };
    }
    seen.add(value);
    return row;
  });
}

// 空文字は画面で見えなくなるので、引用符付きで出す
function toLabel(value: unknown): string {
  return typeof value === "string" && value !== ""
    ? value
    : (JSON.stringify(value) ?? String(value));
}
