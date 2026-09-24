import { BLOCKED_PAGE, expect, launch, ruleCount, test } from "./fixtures";

test("ブロックリストのサイトを開くと、元URL付きでブロック画面に遷移し、サイトには送らない", async ({
  extension: { context, requests },
}) => {
  const page = await context.newPage();

  await page.goto("https://x.com/home");

  expect(page.url()).toBe(`${BLOCKED_PAGE}#https://x.com/home`);
  expect(
    requests.filter((url) => new URL(url).hostname.endsWith("x.com")),
  ).toEqual([]);
});

test.describe("ブロックする範囲", () => {
  for (const url of [
    "https://www.x.com/",
    "https://mobile.twitter.com/i/flow",
  ]) {
    test(`サブドメイン ${url} もブロックする`, async ({
      extension: { context },
    }) => {
      const page = await context.newPage();

      await page.goto(url);

      expect(page.url()).toBe(`${BLOCKED_PAGE}#${url}`);
    });
  }

  test("http で開いてもブロックする", async ({ extension: { context } }) => {
    const page = await context.newPage();

    await page.goto("http://twitter.com/");

    // HTTPS への自動切り替えが先に起きると元URLは https になる。どちらでもブロックされていればよい
    expect(page.url()).toMatch(
      /^https:\/\/yoshipon-tech\.github\.io\/site-blocker\/blocked\/#https?:\/\/twitter\.com\/$/,
    );
  });

  for (const url of [
    "https://example.com/",
    "https://notx.com/",
    "https://x.com.example.test/",
  ]) {
    test(`ブロックリストにない ${url} はブロックしない`, async ({
      extension: { context },
    }) => {
      const page = await context.newPage();

      await page.goto(url);

      expect(page.url()).toBe(url);
    });
  }

  test("ほかのページが読み込むブロックリストのサイトの画像は止めない", async ({
    extension: { context, requests },
  }) => {
    const page = await context.newPage();

    // フィクスチャの応答は https://x.com/a.png を読み込む
    await page.goto("https://example.com/");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toBe("https://example.com/");
    expect(requests).toContain("https://x.com/a.png");
  });
});

test("クエリとフラグメントを含む元URLを、欠かさずエンコードし直さずに渡す", async ({
  extension: { context },
}) => {
  const page = await context.newPage();
  const original = "https://x.com/search?q=a&b=%E6%97%A5#frag";

  await page.goto(original);

  expect(new URL(page.url()).hash).toBe(`#${original}`);
});

test("同じプロファイルで起動し直しても、ルールが重複せずにブロックし続ける", async () => {
  const profile = test.info().outputPath("restart-profile");
  const first = await launch(profile);
  try {
    expect(await ruleCount(first.worker)).toBe(2);
  } finally {
    await first.context.close();
  }

  const second = await launch(profile);
  try {
    expect(await ruleCount(second.worker)).toBe(2);
    const page = await second.context.newPage();
    await page.goto("https://x.com/home");
    expect(page.url()).toBe(`${BLOCKED_PAGE}#https://x.com/home`);
  } finally {
    await second.context.close();
  }
});
