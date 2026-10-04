import {
  BLOCKED_PAGE,
  expect,
  getBlocklist,
  launch,
  removeAllRules,
  ruleCount,
  setBlocklist,
  test,
} from "./fixtures";

test("初めてインストールすると、初期値を保存してブロックする", async ({
  extension: { context, worker },
}) => {
  expect(await getBlocklist(worker)).toEqual(["x.com", "twitter.com"]);

  const page = await context.newPage();
  await page.goto("https://x.com/home");

  expect(page.url()).toBe(`${BLOCKED_PAGE}#https://x.com/home`);
});

test("保存内容からサイトを外すとブロックしなくなり、戻すと再びブロックする", async ({
  extension: { context, worker },
}) => {
  const page = await context.newPage();

  await setBlocklist(worker, ["x.com"]);
  await expect.poll(() => ruleCount(worker)).toBe(1);
  await page.goto("https://twitter.com/home");
  expect(page.url()).toBe("https://twitter.com/home");

  await setBlocklist(worker, ["x.com", "twitter.com"]);
  await expect.poll(() => ruleCount(worker)).toBe(2);
  await page.goto("https://twitter.com/home");
  expect(page.url()).toBe(`${BLOCKED_PAGE}#https://twitter.com/home`);
});

test.describe("起動し直したとき", () => {
  for (const { saved, rules } of [
    { saved: ["x.com"], rules: 1 },
    { saved: [], rules: 0 },
  ]) {
    test(`保存内容 ${JSON.stringify(saved)} を初期値で上書きせず、ルールが ${rules} 件のまま`, async () => {
      const profile = test.info().outputPath("profile");
      const first = await launch(profile);
      try {
        await setBlocklist(first.worker, saved);
        await expect.poll(() => ruleCount(first.worker)).toBe(rules);
      } finally {
        await first.context.close();
      }

      const second = await launch(profile, { waitForRules: rules > 0 });
      try {
        expect(await getBlocklist(second.worker)).toEqual(saved);
        expect(await ruleCount(second.worker)).toBe(rules);
      } finally {
        await second.context.close();
      }
    });
  }

  // Playwright の --load-extension では起動のたびに onInstalled が発火し、onStartup は発火しない。
  // ここで戻るのは onInstalled による。onStartup で入れ直すことは tests/background.test.ts で確かめる
  test("ルールが保存内容とずれていても、保存内容どおりに戻す", async () => {
    const profile = test.info().outputPath("profile");
    const first = await launch(profile);
    try {
      await removeAllRules(first.worker);
      expect(await ruleCount(first.worker)).toBe(0);
    } finally {
      await first.context.close();
    }

    const second = await launch(profile, { waitForRules: false });
    try {
      await expect.poll(() => ruleCount(second.worker)).toBe(2);
      const page = await second.context.newPage();
      await page.goto("https://x.com/home");
      expect(page.url()).toBe(`${BLOCKED_PAGE}#https://x.com/home`);
    } finally {
      await second.context.close();
    }
  });
});

test("重複・不正な項目・権限のないサイトがあっても、残りのサイトをブロックする", async ({
  extension: { context, worker },
}) => {
  await setBlocklist(worker, ["x.com", "x.com", "X.com", "example.com"]);
  // 初期値（x.com・twitter.com）から、x.com と example.com の2件に入れ替わるまで待つ
  await expect
    .poll(async () => {
      const page = await context.newPage();
      await page.goto("https://twitter.com/");
      const url = page.url();
      await page.close();
      return url;
    })
    .toBe("https://twitter.com/");
  expect(await ruleCount(worker)).toBe(2);

  const page = await context.newPage();
  await page.goto("https://x.com/home");
  expect(page.url()).toBe(`${BLOCKED_PAGE}#https://x.com/home`);

  // example.com のルールはあるが、拡張が権限を持たないのでブロックされない
  await page.goto("https://example.com/");
  expect(page.url()).toBe("https://example.com/");
});

test("保存内容が配列でないときは、どのサイトもブロックしない", async ({
  extension: { context, worker },
}) => {
  await setBlocklist(worker, "x.com");
  await expect.poll(() => ruleCount(worker)).toBe(0);

  const page = await context.newPage();
  await page.goto("https://x.com/home");
  expect(page.url()).toBe("https://x.com/home");
});
