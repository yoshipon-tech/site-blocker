import { describe, expect, it } from "vitest";
import { parseBlocklist } from "./blocklist";

describe("parseBlocklist", () => {
  it("ドメインの配列はそのまま通す", () => {
    expect(
      parseBlocklist(["x.com", "mobile.twitter.com", "xn--r8jz45g.jp"]),
    ).toEqual({
      domains: ["x.com", "mobile.twitter.com", "xn--r8jz45g.jp"],
      ignored: [],
      invalidShape: false,
    });
  });

  it("空の配列は空のまま通す", () => {
    expect(parseBlocklist([])).toEqual({
      domains: [],
      ignored: [],
      invalidShape: false,
    });
  });

  it("重複は最初の1つを残し、残りを理由付きで捨てる", () => {
    const parsed = parseBlocklist(["x.com", "twitter.com", "x.com"]);

    expect(parsed.domains).toEqual(["x.com", "twitter.com"]);
    expect(parsed.ignored.map((entry) => entry.value)).toEqual(["x.com"]);
    expect(parsed.ignored[0]?.reason).toContain("重複");
  });

  it.each([
    "",
    "https://x.com",
    "x.com/a",
    "X.com",
    "-x.com",
    "x..com",
    "x .com",
  ])("ドメインとして扱えない %j を理由付きで捨て、残りは通す", (entry) => {
    const parsed = parseBlocklist([entry, "x.com"]);

    expect(parsed.domains).toEqual(["x.com"]);
    expect(parsed.ignored.map((ignored) => ignored.value)).toEqual([entry]);
    expect(parsed.ignored[0]?.reason).toContain("ドメインではない");
  });

  it("文字列でない項目を理由付きで捨てる", () => {
    const parsed = parseBlocklist([1, null, "x.com"]);

    expect(parsed.domains).toEqual(["x.com"]);
    expect(parsed.ignored.map((entry) => entry.value)).toEqual([1, null]);
  });

  it.each([null, undefined, "x.com", { 0: "x.com" }])(
    "配列でない %j は空として扱い、形が不正だと返す",
    (value) => {
      expect(parseBlocklist(value)).toEqual({
        domains: [],
        ignored: [],
        invalidShape: true,
      });
    },
  );
});
