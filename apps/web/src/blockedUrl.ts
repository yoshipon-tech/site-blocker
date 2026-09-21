export type BlockedUrl = {
  /** 表示用の元URL。パーセントエンコードは読める形に戻す */
  url: string;
  /** 見出しに出すホスト名。先頭の www. は落とす。URL として読めなければ null */
  host: string | null;
};

/**
 * location.hash から元URLを取り出す。hash が空なら null。
 * 元URLに # が含まれていても、location.hash は最初の # 以降をすべて返すので先頭1文字だけ落とせばよい。
 */
export function parseBlockedUrl(hash: string): BlockedUrl | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw === "") return null;

  return { url: decode(raw), host: hostOf(raw) };
}

function decode(raw: string): string {
  try {
    // decodeURIComponent だと %2F や %26 まで戻り、URL の区切りが変わって見えるので decodeURI にする
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

function hostOf(raw: string): string | null {
  try {
    const { hostname } = new URL(raw);
    if (hostname === "") return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
