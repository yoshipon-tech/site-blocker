import { expect, test } from "@playwright/test";

test("読み込むリソースに 4xx のレスポンスがない", async ({ page }) => {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("./#https://x.com/home");
  await page.waitForLoadState("networkidle");

  expect(failures).toEqual([]);
});

test.describe("元URLの表示", () => {
  test("ホスト名・見出し・元URLを表示する", async ({ page }) => {
    await page.goto("./#https://www.youtube.com/watch?v=1");

    await expect(page.locator(".lead")).toHaveText(
      "youtube.com は今ブロックしています",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "いまは、目の前のことに。",
    );
    await expect(page.locator(".url-value")).toHaveText(
      "https://www.youtube.com/watch?v=1",
    );
  });

  test("元URLに含まれる # ? & も途中で切らずに表示する", async ({ page }) => {
    await page.goto("./#https://example.com/a?b=1&c=2#d");

    await expect(page.locator(".url-value")).toHaveText(
      "https://example.com/a?b=1&c=2#d",
    );
  });

  test("元URLをリンクにしない", async ({ page }) => {
    await page.goto("./#https://x.com/home");

    await expect(page.locator(".url-value")).toBeVisible();
    await expect(page.locator(".url a, .lead a")).toHaveCount(0);
  });

  test("HTML を含む元URLを要素として解釈しない", async ({ page }) => {
    let dialogOpened = false;
    page.on("dialog", async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });

    await page.goto("./#https://x.com/<img src=x onerror=alert(1)>");

    await expect(page.locator(".url-value")).toContainText("onerror=alert(1)");
    await expect(page.locator("img")).toHaveCount(0);
    expect(dialogOpened).toBe(false);
  });

  test("パーセントエンコードをデコードせずに表示する", async ({ page }) => {
    await page.goto("./#https://x.com/search?q=%E6%97%A5");

    await expect(page.locator(".url-value")).toHaveText(
      "https://x.com/search?q=%E6%97%A5",
    );
  });
});

test.describe("hash が空のとき", () => {
  for (const hash of ["", "#"]) {
    test(`hash が "${hash}" なら見出しだけを表示する`, async ({ page }) => {
      await page.goto(`./${hash}`);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator(".lead")).toHaveCount(0);
      await expect(page.locator(".url")).toHaveCount(0);
    });
  }
});

test("表示後に hash が変わると、再読み込みなしに表示が追従する", async ({
  page,
}) => {
  await page.goto("./#https://x.com/home");
  await page.evaluate(() => {
    (window as unknown as { marker: boolean }).marker = true;
    window.location.hash = "https://www.youtube.com/";
  });

  await expect(page.locator(".lead")).toHaveText(
    "youtube.com は今ブロックしています",
  );
  await expect(page.locator(".url-value")).toHaveText(
    "https://www.youtube.com/",
  );
  // 再読み込みされていれば window の値は消える
  expect(
    await page.evaluate(
      () => (window as unknown as { marker?: boolean }).marker,
    ),
  ).toBe(true);
});

test.describe("前のページに戻る", () => {
  test("別のページから遷移して開いたときはボタンが出て、押すと遷移元に戻る", async ({
    page,
  }) => {
    await page.goto("data:text/html;charset=utf-8,<title>遷移元</title>");
    await page.goto("./#https://x.com/home");

    await page.getByRole("button", { name: "前のページに戻る" }).click();

    await expect(page).toHaveTitle("遷移元");
  });

  test("新しいタブで直接開いたときはボタンが出ない", async ({
    page,
    context,
  }) => {
    // Playwright のページは about:blank を開いた状態から始まり、goto すると履歴が2件になる。
    // 履歴が1件だけの新しいタブを作るため、window.open で開く
    await page.goto("./");
    const [tab] = await Promise.all([
      context.waitForEvent("page"),
      page.evaluate(() =>
        window.open("./#https://x.com/home", "_blank", "noopener"),
      ),
    ]);
    await tab.waitForLoadState();

    expect(await tab.evaluate(() => window.history.length)).toBe(1);
    await expect(tab.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      tab.getByRole("button", { name: "前のページに戻る" }),
    ).toHaveCount(0);
  });
});

test("元URLを外部に送らず、同じオリジンにしかリクエストしない", async ({
  page,
  baseURL,
}) => {
  const original = "https://x.com/secret-path?token=abc";
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  await page.goto(`./#${original}`);
  await expect(page.locator(".url-value")).toHaveText(original);
  await page.waitForLoadState("networkidle");

  const origin = new URL(baseURL!).origin;
  // data: の favicon はネットワークに出ないので対象外
  const network = requested.filter((url) => !url.startsWith("data:"));
  expect(network.length).toBeGreaterThan(0);
  for (const url of network) {
    expect(new URL(url).origin).toBe(origin);
    expect(url).not.toContain("x.com");
    expect(url).not.toContain("secret-path");
  }
});
