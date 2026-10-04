# 実装タスク: blocklist-storage

- [x] 1. 保存と追従

- [x] 1.1 保存内容を検査する関数を作り、初期値の定数を改名する
  - `utils/blocklist.ts` の `BLOCKLIST` を `DEFAULT_BLOCKLIST` に改名し、`wxt.config.ts`・`entrypoints/background.ts` の参照を直す
  - `parseBlocklist(value: unknown)` を足し、`utils/blocklist.test.ts` で単体テストする（重複は最初の1つを残す / 空文字・`https://x.com`・`x.com/a`・`X.com`・数値を理由付きで捨てる / 配列でない値は空として `invalidShape: true`）
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` と `pnpm lint` が終了コード 0 / ビルドした `manifest.json` の `permissions`・`host_permissions` が変わっていない_
  - _要件: 2.5, 3.1, 3.3_
  - _範囲: `apps/extension/utils/blocklist.ts`, `apps/extension/utils/blocklist.test.ts`, `apps/extension/wxt.config.ts`, `apps/extension/entrypoints/background.ts`_
  - _並行: 不可（1.2 以降が `DEFAULT_BLOCKLIST` と `parseBlocklist` を使う）_

- [x] 1.2 ブロックリストの保存先を定義する
  - `utils/storage.ts` に `blocklistItem`（`local:blocklist`、`init: () => [...DEFAULT_BLOCKLIST]`、`version: 1`）を置く
  - `fakeBrowser` を使った単体テストで、値がないと初期値が書かれ、既存の `["x.com"]` と `[]` は上書きされないことを確かめる
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` が終了コード 0_
  - _要件: 1.1, 1.2, 1.3, 1.4_
  - _範囲: `apps/extension/utils/storage.ts`, `apps/extension/utils/storage.test.ts`_
  - _並行: 不可（1.1 の定数を使う）_

- [x] 1.3 入れ直しを列に並べて実行する関数を作る
  - `utils/sync.ts` に `createSync(dnr, readBlocklist, log)` を置く。呼ぶたびに前の実行の完了を待ち、最新を読み、`parseBlocklist` を通して `syncRules` する。捨てた項目は `log.warn`、配列でない値は `log.error` に理由付きで渡す。1回の失敗で列を止めない
  - `utils/sync.test.ts`: 続けて3回呼ぶと `updateDynamicRules` が重ならず最後の内容に揃う / 捨てた項目と理由が `log` に渡る / 途中で失敗しても次の呼び出しは実行される
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` と `pnpm lint` が終了コード 0_
  - _要件: 2.3, 3.2_
  - _範囲: `apps/extension/utils/sync.ts`, `apps/extension/utils/sync.test.ts`_
  - _並行: 不可（1.1 の `parseBlocklist` を使う）_

- [x] 1.4 background を保存内容に追従させる
  - `entrypoints/background.ts` で `createSync(browser.declarativeNetRequest, () => blocklistItem.getValue(), console)` を作り、`runtime.onInstalled`・`runtime.onStartup`・`blocklistItem.watch` のリスナーをトップレベルで登録して呼ぶ
  - `wxt.config.ts` の `permissions` に `storage` を足す（ないと service worker で `chrome.storage` が使えない）
  - 既存の `e2e/redirect.spec.ts` が変更なしで通る
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0（既存の E2E） / `pnpm check` が終了コード 0 / ビルドした `manifest.json` の `permissions` が `["declarativeNetRequestWithHostAccess","storage"]`_
  - _要件: 1.1, 4.1_
  - _範囲: `apps/extension/entrypoints/background.ts`, `apps/extension/wxt.config.ts`_
  - _並行: 不可（1.2・1.3 を使う）_

- [x] 2. E2E

- [x] 2.1 保存内容を変えるとブロックが追従することを確かめる
  - `e2e/fixtures.ts` に `getBlocklist(worker)`・`setBlocklist(worker, value)` を足す。service worker から書いて `watch` が発火しなければ、拡張のページから書く（design のリスク）
  - `e2e/storage.spec.ts`: 新しいプロファイルでは `blocklist` が `["x.com", "twitter.com"]` / `twitter.com` を外すと twitter.com が開け、戻すと再びブロックされる
  - _検証: Playwright: `e2e/storage.spec.ts`（`pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0）_
  - _要件: 1.1, 2.1, 2.2, 5.2_
  - _範囲: `apps/extension/e2e/fixtures.ts`, `apps/extension/e2e/storage.spec.ts`_
  - _並行: 不可（2.2・2.3 と同じファイルを触る）_

- [x] 2.2 起動し直しても保存内容が保たれ、ブロックが保存内容に揃うことを確かめる
  - `blocklist` を `["x.com"]`・`[]` にして同じプロファイルで起動し直すと、値が保たれ、ルールがそれぞれ1件・0件
  - 起動中に dynamic ルールだけを全部外して閉じ、起動し直すと、保存内容どおりのルールに戻る
  - Playwright では起動し直すと `onInstalled` が発火し `onStartup` は発火しない（実装時に判明）。`onStartup`・`onInstalled`・保存内容の変更で入れ直しが呼ばれることは `tests/background.test.ts` で確かめる
  - _検証: Playwright: `e2e/storage.spec.ts` / コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0。`onStartup` の登録を外すと失敗する_
  - _要件: 1.3, 1.4, 2.4_
  - _範囲: `apps/extension/e2e/storage.spec.ts`, `apps/extension/tests/background.test.ts`, `apps/extension/vitest.config.ts`（対象に `tests/` を足す。`entrypoints/` に置くと WXT がエントリとして読みビルドが失敗する）_
  - _並行: 不可（2.1 と同じファイルを触る）_

- [x] 2.3 不正な項目・権限のないサイトがあっても残りをブロックすることを確かめる
  - `["x.com", "x.com", "X.com", "example.com"]` を保存すると、ルールが2件で、x.com はブロック、example.com（権限なし）はブロックされない。ルールの登録が拒否されたら design のリスクどおり止めて報告する
  - 配列でない値（`"x.com"`）を保存するとルールが0件になる
  - `parseBlocklist` の検査と `createSync` の直列化をそれぞれ一時的に壊すと、単体テストか `test:e2e` が失敗し、戻すと通る
  - _検証: Playwright: `e2e/storage.spec.ts` / コマンド — 壊したときに終了コードが 0 以外、戻すと 0_
  - _要件: 2.5, 2.6, 3.1, 3.3, 5.1_
  - _範囲: `apps/extension/e2e/storage.spec.ts`（壊す変更は検証後に戻す）_
  - _並行: 不可（2.1 と同じファイルを触る）_

- [x] 3. 実ブラウザ

- [x] 3.1 不正な値の理由がコンソールに出ることを確かめる
  - ビルドした拡張を chrome-devtools MCP の `install_extension` で読み込み、service worker で `["x.com", "https://y.com"]` と `"x.com"` を順に保存する
  - _検証: ブラウザ: 1回目は `https://y.com` と理由が warn で、2回目は配列でない旨が error で service worker のコンソールに出る。x.com を開くと公開中のブロック画面に元URLが出る_
  - _要件: 3.2_
  - _範囲: なし（確認のみ）_
  - _並行: 可_
