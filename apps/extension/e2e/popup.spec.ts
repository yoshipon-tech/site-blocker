import type { Page } from "@playwright/test";
import {
  BLOCKED_PAGE,
  expect,
  getBlocklist,
  openPopup,
  ruleCount,
  setBlocklist,
  test,
} from "./fixtures";

/** 一覧の各行のサイト名と注記（削除ボタンの文字を含まない） */
function sites(popup: Page) {
  return popup.locator("#sites li .site");
}

async function addFromPopup(popup: Page, input: string) {
  await popup.getByRole("textbox", { name: "追加するサイト" }).fill(input);
  await popup.getByRole("button", { name: "追加", exact: true }).click();
}

test.describe("一覧", () => {
  test("保存されているサイトを保存順に表示する", async ({
    extension: { context, worker },
  }) => {
    const popup = await openPopup(context, worker);

    await expect(sites(popup)).toHaveText(["x.com", "twitter.com"]);
    await expect(popup.getByText("登録中 2件")).toBeVisible();
    await expect(popup.getByText("まだ何も登録されていません")).toBeHidden();
  });

  test("保存内容が空のときは、サイトが1件もないことを表示する", async ({
    extension: { context, worker },
  }) => {
    await setBlocklist(worker, []);
    const popup = await openPopup(context, worker);

    await expect(popup.getByText("まだ何も登録されていません")).toBeVisible();
    await expect(sites(popup)).toHaveCount(0);
  });

  test("開いている間に保存内容が変わると、開き直さずに表示を変える", async ({
    extension: { context, worker },
  }) => {
    const popup = await openPopup(context, worker);
    await expect(sites(popup)).toHaveCount(2);

    await setBlocklist(worker, ["twitter.com", "x.com", "x.com.example"]);

    await expect(sites(popup)).toHaveText([
      "twitter.com",
      "x.com",
      /^x\.com\.example/,
    ]);
  });

  test("アクセスが許可されていないサイトの行にだけ、ブロックされていないことを表示する", async ({
    extension: { context, worker },
  }) => {
    await setBlocklist(worker, ["x.com", "example.com"]);
    const popup = await openPopup(context, worker);

    await expect(sites(popup)).toHaveText([
      "x.com",
      /^example\.com.*ブロックされていません/,
    ]);
  });

  test("ドメインとして扱えない項目を、無効であると分かる形で表示する", async ({
    extension: { context, worker },
  }) => {
    await setBlocklist(worker, ["x.com", "X.com", 1]);
    const popup = await openPopup(context, worker);

    await expect(sites(popup)).toHaveText(["x.com", /^X\.com無効/, /^1無効/]);
  });
});

test.describe("追加と削除", () => {
  test("削除したサイトは開けるようになり、入力し直して足すと再びブロックする", async ({
    extension: { context, worker },
  }) => {
    const popup = await openPopup(context, worker);
    const page = await context.newPage();

    await popup
      .getByRole("button", { name: "twitter.com を削除", exact: true })
      .click();
    await expect(popup.getByRole("status")).toHaveText(
      "twitter.com を削除しました",
    );
    await expect(sites(popup)).toHaveText(["x.com"]);
    expect(await getBlocklist(worker)).toEqual(["x.com"]);
    await expect.poll(() => ruleCount(worker)).toBe(1);
    await page.goto("https://twitter.com/home");
    expect(page.url()).toBe("https://twitter.com/home");

    // インストール時から権限を持つので、権限ダイアログを出さずに足せる
    await addFromPopup(popup, "https://www.Twitter.com/home");
    await expect(popup.getByRole("status")).toHaveText(
      "twitter.com を追加しました",
    );
    await expect(sites(popup)).toHaveText(["x.com", "twitter.com"]);
    expect(await getBlocklist(worker)).toEqual(["x.com", "twitter.com"]);
    await expect.poll(() => ruleCount(worker)).toBe(2);
    await page.goto("https://mobile.twitter.com/home");
    expect(page.url()).toBe(`${BLOCKED_PAGE}#https://mobile.twitter.com/home`);
  });

  test("最後の1件まで削除すると、空のまま保存する", async ({
    extension: { context, worker },
  }) => {
    const popup = await openPopup(context, worker);

    await popup
      .getByRole("button", { name: "x.com を削除", exact: true })
      .click();
    await expect(sites(popup)).toHaveText(["twitter.com"]);
    await popup
      .getByRole("button", { name: "twitter.com を削除", exact: true })
      .click();

    await expect(popup.getByText("まだ何も登録されていません")).toBeVisible();
    expect(await getBlocklist(worker)).toEqual([]);
  });

  test("無効な項目を削除できる", async ({ extension: { context, worker } }) => {
    await setBlocklist(worker, ["x.com", "X.com"]);
    const popup = await openPopup(context, worker);

    await popup
      .getByRole("button", { name: "X.com を削除", exact: true })
      .click();

    await expect(sites(popup)).toHaveText(["x.com"]);
    expect(await getBlocklist(worker)).toEqual(["x.com"]);
  });

  for (const { input, reason } of [
    { input: "", reason: "サイトを入力してください" },
    { input: "https://", reason: "サイトとして扱えません" },
    { input: "www.x.com", reason: "x.com は既にブロックしています" },
  ]) {
    test(`${JSON.stringify(input)} を入力すると、保存せずに理由を表示する`, async ({
      extension: { context, worker },
    }) => {
      const popup = await openPopup(context, worker);
      await expect(sites(popup)).toHaveCount(2);

      await addFromPopup(popup, input);

      await expect(popup.getByRole("status")).toContainText(reason);
      expect(await getBlocklist(worker)).toEqual(["x.com", "twitter.com"]);
      await expect(sites(popup)).toHaveCount(2);
    });
  }
});
