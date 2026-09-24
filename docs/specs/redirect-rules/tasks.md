# 実装タスク: redirect-rules

- [ ] 1. ルールと登録

- [ ] 1.1 ブロックリストからルールを組み立て、入れ直す関数を作る
  - `utils/blocklist.ts` に `BLOCKLIST`（`x.com`・`twitter.com`）とブロック画面の URL を置く
  - `utils/rules.ts` に `buildRules`・`syncRules`・`hostPermissions` を置き、`utils/rules.test.ts` で単体テストする（ID `1..n`、`requestDomains`、`main_frame`、`regexFilter: "^.+$"`、置換 `…/blocked/#\0`、既存の全 ID を外して入れ直す、リストから外したサイトのルールが残らない）
  - `vitest.config.ts` の対象を `utils/**/*.test.ts` に絞る
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` と `pnpm lint` が終了コード 0_
  - _要件: 3.0, 3.1, 3.3, 3.4_
  - _範囲: `apps/extension/utils/`, `apps/extension/vitest.config.ts`_
  - _並行: 不可（1.2 以降がこの関数を使う）_

- [ ] 1.2 manifest の権限を設定し、インストール時にルールを登録する
  - `wxt.config.ts` の manifest に `permissions: ["declarativeNetRequestWithHostAccess"]` と `host_permissions: hostPermissions(BLOCKLIST)` を設定する
  - `entrypoints/background.ts` で `browser.runtime.onInstalled` のときに `syncRules` を呼ぶ
  - `package.json` に `dev`（`wxt`）を足す
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run build` が終了コード 0 / ビルドした `.output/chrome-mv3/manifest.json` の `permissions` が `["declarativeNetRequestWithHostAccess"]`、`host_permissions` が `["*://*.x.com/*","*://*.twitter.com/*"]` / ブラウザ: `dev` で Chrome が起動し、x.com を開くとブロック画面になる。`background.ts` を変えると再読み込みされる_
  - _要件: 3.1, 4.1, 5.1_
  - _範囲: `apps/extension/wxt.config.ts`, `apps/extension/entrypoints/background.ts`, `apps/extension/package.json`_
  - _並行: 不可（`package.json` を 2.1 と共有する）_

- [ ] 2. E2E

- [ ] 2.1 拡張を読み込んだ Chromium で E2E を走らせる基盤を作る
  - `@playwright/test`・`@types/node` を追加し、`playwright.config.ts`（Chromium のみ、`testDir: "e2e"`）と `e2e/tsconfig.json` を置く。`test:e2e`（`wxt build && playwright test`）を足し、`typecheck` で `e2e` も検査する
  - `launchPersistentContext`（`channel: "chromium"`、`--load-extension`）のフィクスチャを作り、`context.route` でブロック画面・ブロックリストのサイト・ほかのサイトを手元の応答に差し替える
  - 最初のテスト: `https://x.com/home` を開くと `https://yoshipon-tech.github.io/site-blocker/blocked/#https://x.com/home` になり、x.com への `route` が呼ばれない
  - _検証: Playwright: `pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0 / コマンド — `pnpm check` が終了コード 0_
  - _要件: 1.1, 1.6, 2.1, 6.2_
  - _範囲: `apps/extension/package.json`, `apps/extension/playwright.config.ts`, `apps/extension/e2e/`, `pnpm-lock.yaml`_
  - _並行: 不可（`pnpm-lock.yaml` を更新する。2.2 以降がこの基盤を使う）_

- [ ] 2.2 ブロックする範囲としない範囲を確かめる
  - `www.x.com`・`mobile.twitter.com`・`http://twitter.com/` はブロック画面になる
  - `example.com`・`notx.com`・`x.com.example.test` は URL が変わらない。`example.com` のページが `https://x.com/a.png` を読み込んでもページの URL が変わらない
  - _検証: Playwright: `e2e/redirect.spec.ts`_
  - _要件: 1.2, 1.3, 1.4, 1.5_
  - _範囲: `apps/extension/e2e/redirect.spec.ts`_
  - _並行: 不可（2.3・2.4 と同じテストファイルを触る）_

- [ ] 2.3 元URLを欠かさず渡すことを確かめ、テストが壊れを検出することを確かめる
  - `https://x.com/search?q=a&b=%E6%97%A5#frag` の遷移先のフラグメントが `#https://x.com/search?q=a&b=%E6%97%A5#frag` と一致する
  - _検証: Playwright: `e2e/redirect.spec.ts` / コマンド — `buildRules` の置換を一時的に壊すと `test:e2e` が失敗し、戻すと通る（確認後に戻す）_
  - _要件: 2.2, 2.3, 6.1_
  - _範囲: `apps/extension/e2e/redirect.spec.ts`_
  - _並行: 不可（同上）_

- [ ] 2.4 再起動をまたいでもルールが保たれ、重複しないことを確かめる
  - 同じプロファイルで起動し直しても、dynamic ルールが2件のままで x.com がブロックされる
  - _検証: Playwright: `e2e/redirect.spec.ts`（service worker で `getDynamicRules` の件数を見る）_
  - _要件: 3.2, 3.4_
  - _範囲: `apps/extension/e2e/redirect.spec.ts`_
  - _並行: 不可（同上）_

- [ ] 3. 実ブラウザ

- [ ] 3.1 公開中のブロック画面と組み合わせて確かめる
  - _検証: ブラウザ: ビルドした `.output/chrome-mv3/` を chrome-devtools MCP の `install_extension` で読み込み、`https://x.com/home?a=1&b=2#c` を開くと公開中のブロック画面に元URLが出る。コンソールのエラーがない_
  - _要件: 1.1, 2.1, 2.2, 2.3_
  - _範囲: なし（確認のみ）_
  - _並行: 不可（1.x・2.x の後）_
