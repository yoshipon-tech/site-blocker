import { describe, expect, it } from "vitest";
import { parseBlockedUrl } from "./blockedUrl";

describe("parseBlockedUrl", () => {
  it("先頭の # を落として元URLとホスト名を返す", () => {
    expect(parseBlockedUrl("#https://x.com/home")).toEqual({
      url: "https://x.com/home",
      host: "x.com",
    });
  });

  it("hash が空なら null を返す", () => {
    expect(parseBlockedUrl("")).toBeNull();
    expect(parseBlockedUrl("#")).toBeNull();
  });

  it("元URLに含まれる # 以降も元URLとして残す", () => {
    expect(parseBlockedUrl("#https://example.com/a#b")?.url).toBe("https://example.com/a#b");
  });

  it("ホスト名の先頭の www. を落とす", () => {
    expect(parseBlockedUrl("#https://www.youtube.com/watch?v=1")?.host).toBe("youtube.com");
  });

  it("パーセントエンコードされた日本語を読める形に戻す", () => {
    expect(parseBlockedUrl("#https://x.com/search?q=%E6%97%A5%E6%9C%AC")?.url).toBe(
      "https://x.com/search?q=日本",
    );
  });

  it("URL の区切りを表すエンコード（%26 など）は戻さない", () => {
    expect(parseBlockedUrl("#https://x.com/?q=a%26b")?.url).toBe("https://x.com/?q=a%26b");
  });

  it("デコードできない % を含むときは届いたまま返す", () => {
    expect(parseBlockedUrl("#https://x.com/?q=100%")?.url).toBe("https://x.com/?q=100%");
  });

  it("URL として読めないときはホスト名を null にする", () => {
    expect(parseBlockedUrl("#not a url")).toEqual({ url: "not a url", host: null });
  });
});
