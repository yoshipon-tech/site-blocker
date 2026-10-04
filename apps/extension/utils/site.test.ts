import { describe, expect, it } from "vitest";
import { checkAdd, describeEntries, MAX_SITES, normalizeSite } from "./site";

describe("normalizeSite", () => {
  it.each([
    ["youtube.com", "youtube.com"],
    ["  youtube.com  ", "youtube.com"],
    ["YouTube.COM", "youtube.com"],
    ["https://www.youtube.com/watch?v=1", "youtube.com"],
    ["http://m.youtube.com:8080/a#b", "m.youtube.com"],
    ["www.x.com", "x.com"],
    ["WWW.X.COM", "x.com"],
    ["youtube.com/shorts", "youtube.com"],
    ["日本.jp", "xn--wgv71a.jp"],
  ])("%j を %j にする", (input, domain) => {
    expect(normalizeSite(input)).toEqual({ ok: true, domain });
  });

  it("www. は先頭の1つだけ外す", () => {
    expect(normalizeSite("www.www.x.com")).toEqual({
      ok: true,
      domain: "www.x.com",
    });
  });

  it.each(["", "   "])("空の入力 %j は理由付きで受け付けない", (input) => {
    expect(normalizeSite(input)).toEqual({
      ok: false,
      reason: "サイトを入力してください",
    });
  });

  it.each([
    "https://",
    "www.",
    "x .com",
    "x..com",
    "x.com.",
    "chrome://extensions",
    "ftp://x.com",
    "[::1]",
  ])("サイトとして扱えない %j は理由付きで受け付けない", (input) => {
    const result = normalizeSite(input);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("サイトとして扱えません");
  });
});

describe("checkAdd", () => {
  it("まだないサイトは足してよい", () => {
    expect(checkAdd(["x.com"], "youtube.com")).toEqual({ ok: true });
  });

  it("保存内容が空でも足してよい", () => {
    expect(checkAdd([], "x.com")).toEqual({ ok: true });
  });

  it("保存内容が配列でないときは空として扱う", () => {
    expect(checkAdd("x.com", "x.com")).toEqual({ ok: true });
  });

  it("同じサイトは理由付きで断る", () => {
    expect(checkAdd(["x.com"], "x.com")).toEqual({
      ok: false,
      reason: "x.com は既にブロックしています",
    });
  });

  it("既にあるサイトのサブドメインは理由付きで断る", () => {
    expect(checkAdd(["x.com"], "mobile.x.com")).toEqual({
      ok: false,
      reason: "mobile.x.com は x.com に含まれるため、既にブロックしています",
    });
  });

  it("名前の末尾が同じだけの別のサイトは足してよい", () => {
    expect(checkAdd(["x.com"], "notx.com")).toEqual({ ok: true });
  });

  it("無効な項目は既存のサイトとして数えない", () => {
    expect(checkAdd(["X.com"], "x.com")).toEqual({ ok: true });
  });

  it("上限に達していたら理由付きで断る", () => {
    const full = Array.from({ length: MAX_SITES }, (_, i) => `s${i}.com`);

    expect(checkAdd(full, "x.com")).toEqual({
      ok: false,
      reason: "登録できるのは 1,000 件までです",
    });
    expect(checkAdd(full.slice(1), "x.com")).toEqual({ ok: true });
  });
});

describe("describeEntries", () => {
  it("保存順に行を作り、有効な項目には理由を付けない", () => {
    expect(describeEntries(["x.com", "twitter.com"])).toEqual([
      { index: 0, value: "x.com", label: "x.com" },
      { index: 1, value: "twitter.com", label: "twitter.com" },
    ]);
  });

  it("空の配列は行を作らない", () => {
    expect(describeEntries([])).toEqual([]);
  });

  it("ドメインとして扱えない項目と重複に理由を付ける", () => {
    const rows = describeEntries(["x.com", "X.com", 1, "", "x.com"]);

    expect(rows.map((row) => [row.label, row.invalidReason])).toEqual([
      ["x.com", undefined],
      ["X.com", "小文字のドメインではありません"],
      ["1", "小文字のドメインではありません"],
      ['""', "小文字のドメインではありません"],
      ["x.com", "重複しています"],
    ]);
  });

  it("配列でない値は1つの無効な行にする", () => {
    expect(describeEntries("x.com")).toEqual([
      {
        index: -1,
        value: "x.com",
        label: "x.com",
        invalidReason: "保存内容がリストではありません",
      },
    ]);
  });
});
