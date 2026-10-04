import {
  BLOCKED_PAGE,
  expect,
  registerServiceWorker,
  ruleCount,
  seenCount,
  setBlocklist,
  test,
  watchServiceWorkers,
} from "./fixtures";

// ブロックしていない間にサイトが service worker を登録し、その後にブロックリストへ足す（#30 の状況）
for (const host of ["x.com", "www.x.com"]) {
  test(`${host} に service worker が登録済みのサイトを足すと、開いたときに中身を表示せずブロック画面へ移す`, async ({
    extension: { context, worker, requests },
  }) => {
    const serviceWorkers = await watchServiceWorkers(context);
    await setBlocklist(worker, []);
    await expect.poll(() => ruleCount(worker)).toBe(0);
    await registerServiceWorker(context, host);
    await expect.poll(() => serviceWorkers.has(`https://${host}/`)).toBe(true);

    await setBlocklist(worker, ["x.com"]);
    await expect.poll(() => ruleCount(worker)).toBe(1);
    await expect.poll(() => serviceWorkers.has(`https://${host}/`)).toBe(false);

    const page = await context.newPage();
    await page.goto(`https://${host}/home`);

    await expect(page).toHaveURL(`${BLOCKED_PAGE}#https://${host}/home`);
    expect(seenCount(requests, `https://${host}/home`)).toBe(0);
  });
}

test("service worker を取り除いても、そのサイトの Cookie は残る", async ({
  extension: { context, worker },
}) => {
  const serviceWorkers = await watchServiceWorkers(context);
  await setBlocklist(worker, []);
  await expect.poll(() => ruleCount(worker)).toBe(0);
  await context.addCookies([
    { name: "session", value: "logged-in", url: "https://x.com/" },
  ]);
  await registerServiceWorker(context, "x.com");
  await expect.poll(() => serviceWorkers.has("https://x.com/")).toBe(true);

  await setBlocklist(worker, ["x.com"]);
  await expect.poll(() => serviceWorkers.has("https://x.com/")).toBe(false);

  const cookies = await context.cookies("https://x.com/");
  expect(cookies.map(({ name, value }) => ({ name, value }))).toEqual([
    { name: "session", value: "logged-in" },
  ]);
});

test("ブロックリストにないサイトの service worker は取り除かない", async ({
  extension: { context, worker, requests },
}) => {
  const serviceWorkers = await watchServiceWorkers(context);
  await setBlocklist(worker, []);
  await expect.poll(() => ruleCount(worker)).toBe(0);
  await registerServiceWorker(context, "x.com");
  await registerServiceWorker(context, "example.com");
  await expect
    .poll(() => serviceWorkers.has("https://example.com/"))
    .toBe(true);

  await setBlocklist(worker, ["x.com"]);
  await expect.poll(() => serviceWorkers.has("https://x.com/")).toBe(false);

  expect(serviceWorkers.has("https://example.com/")).toBe(true);
  const page = await context.newPage();
  await page.goto("https://example.com/");
  await expect(page).toHaveTitle("from-sw");
  await expect.poll(() => seenCount(requests, "https://example.com/")).toBe(1);
});

test("先に取り除かないサブドメインの service worker は、開いた時点でブロック画面へ移し、次からは中身を表示しない", async ({
  extension: { context, worker, requests },
}) => {
  const serviceWorkers = await watchServiceWorkers(context);
  await setBlocklist(worker, []);
  await expect.poll(() => ruleCount(worker)).toBe(0);
  await registerServiceWorker(context, "news.x.com");
  await expect.poll(() => serviceWorkers.has("https://news.x.com/")).toBe(true);

  await setBlocklist(worker, ["x.com"]);
  await expect.poll(() => ruleCount(worker)).toBe(1);

  // 1回目: service worker が中身を返してしまうが、すぐにブロック画面へ移る
  const page = await context.newPage();
  await page.goto("https://news.x.com/home");
  await expect(page).toHaveURL(`${BLOCKED_PAGE}#https://news.x.com/home`);
  expect(seenCount(requests, "https://news.x.com/home")).toBe(1);
  await expect
    .poll(() => serviceWorkers.has("https://news.x.com/"))
    .toBe(false);

  // 2回目: service worker がないので、中身を表示せずにリダイレクトで止まる
  await page.goto("https://news.x.com/home");
  await expect(page).toHaveURL(`${BLOCKED_PAGE}#https://news.x.com/home`);
  expect(seenCount(requests, "https://news.x.com/home")).toBe(1);
});
