import { describe, expect, it } from "vitest";
import {
  checkAdd,
  describeCurrentPage,
  describeEntries,
  MAX_SITES,
  normalizeSite,
} from "./site";

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

  it("そのものと親の両方があるときは、そのものとして断る", () => {
    expect(checkAdd(["x.com", "news.x.com"], "news.x.com")).toEqual({
      ok: false,
      reason: "news.x.com は既にブロックしています",
    });
  });
});

describe("describeCurrentPage", () => {
  it("まだないサイトは、入力欄と同じ規則で作ったドメインで追加できる", () => {
    expect(describeCurrentPage("https://www.Note.com/foo?a=1", [])).toEqual({
      kind: "addable",
      domain: "note.com",
    });
  });

  it.each(["https://x.com/home", "https://news.x.com/", "http://www.x.com/"])(
    "ブロックリストにあるサイトかそのサブドメイン %j は登録済み",
    (url) => {
      expect(describeCurrentPage(url, ["x.com"])).toMatchObject({
        kind: "registered",
      });
    },
  );

  it("登録済みのドメインは、ブロックリストの親ではなく今のページのもの", () => {
    expect(describeCurrentPage("https://news.x.com/", ["x.com"])).toEqual({
      kind: "registered",
      domain: "news.x.com",
    });
  });

  it("名前の末尾が同じだけの別のサイトは追加できる", () => {
    expect(describeCurrentPage("https://notx.com/", ["x.com"])).toEqual({
      kind: "addable",
      domain: "notx.com",
    });
  });

  it("無効な項目は登録済みとして扱わない", () => {
    expect(describeCurrentPage("https://x.com/", ["X.com"])).toMatchObject({
      kind: "addable",
    });
  });

  it.each([
    ["URL を読めない", undefined],
    ["新しいタブ", "chrome://newtab/"],
    ["拡張のページ", "chrome-extension://abcdefghijklmnop/popup.html"],
    ["ファイル", "file:///Users/me/a.html"],
    [
      "ブロック画面",
      "https://yoshipon-tech.github.io/site-blocker/blocked/#https://x.com/",
    ],
  ])("%s は追加できない", (_, url) => {
    expect(describeCurrentPage(url, [])).toEqual({ kind: "unavailable" });
  });

  it("上限に達していても追加できる（押したときに理由を出す）", () => {
    const full = Array.from({ length: MAX_SITES }, (_, i) => `s${i}.com`);

    expect(describeCurrentPage("https://note.com/", full)).toEqual({
      kind: "addable",
      domain: "note.com",
    });
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
