export type BlockedUrl = {
  /** 表示用の元URL。パーセントエンコードは戻さず、届いたまま */
  url: string;
  /** 見出しに出すホスト名。先頭の www. は落とす。URL として読めなければ null */
  host: string | null;
};

/**
 * location.hash から元URLを取り出す。hash が空なら null。
 * 元URLに # が含まれていても、location.hash は最初の # 以降をすべて返すので先頭1文字だけ落とせばよい。
 */
export function parseBlockedUrl(hash: string): BlockedUrl | null {
  const url = hash.startsWith("#") ? hash.slice(1) : hash;
  if (url === "") return null;

  return { url, host: hostOf(url) };
}

function hostOf(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    if (hostname === "") return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
