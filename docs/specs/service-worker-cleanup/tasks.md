# 実装タスク: service-worker-cleanup

- [x] 1. 現象の再現

- [x] 1.1 テスト用の service worker で、ブロックをすり抜ける現象を E2E で再現する
  - `e2e/fixtures.ts` に、指定したホストでテスト用 service worker を登録するページと、そのスクリプト（自前で応答を返す `fetch` ハンドラ）を返す応答を足す。service worker が返すページは記録用の URL へ1回リクエストを送り、`requests` に残る
  - `e2e/service-worker.spec.ts`: 空のブロックリストで x.com に登録してから `["x.com"]` を保存し、x.com を開くとブロック画面に移ることを期待するテストを書き、**今の実装では失敗する**（記録のリクエストが出る）ことを確かめる
  - 再現できなければ止めて報告する（design のリスク）
  - _検証: Playwright: `e2e/service-worker.spec.ts` を実行し、1.2 の期待で失敗すること（失敗の内容が「ブロック画面に移らない」であること）/ 既存の `test:e2e` は通る_
  - _要件: 4.2_
  - _範囲: `apps/extension/e2e/fixtures.ts`, `apps/extension/e2e/service-worker.spec.ts`_
  - _並行: 不可（以降のタスクの検証基盤）_

- [x] 2. 取り除く処理

- [x] 2.1 オリジンの組み立てと URL の判定、取り除く関数を作る
  - `utils/service-worker.ts` に `serviceWorkerOrigins`・`findBlockedOrigin`・`clearServiceWorkers` を置き、`utils/service-worker.test.ts` で確かめる（4つの https オリジン / サブドメインを拾う / `notx.com`・`x.com.example.test`・ブロック画面の URL・`http` 以外のスキームを拾わない / `browsingData.remove` に `serviceWorkers` だけを渡す / オリジンが空なら呼ばない）
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` と `pnpm lint` が終了コード 0_
  - _要件: 1.4, 2.1, 2.2_
  - _範囲: `apps/extension/utils/service-worker.ts`, `apps/extension/utils/service-worker.test.ts`_
  - _並行: 可（1.1 と別のファイル）_

- [x] 2.2 インストール・起動・保存内容の変更で、先に取り除く
  - `entrypoints/background.ts` の3つのきっかけで、`parseBlocklist` の有効なドメインから `clearServiceWorkers(serviceWorkerOrigins(...))` を呼ぶ。失敗は理由をコンソールに残す
  - `wxt.config.ts` の `permissions` に `browsingData` を足す
  - `tests/background.test.ts` に、3つのきっかけで取り除く処理が呼ばれることを足す（起動し直したときの E2E は、ブロックリストに入ったまま service worker が残る状態を作れないので書かない。design の検証方法を参照）
  - 1.1 のテストが通る。`e2e/service-worker.spec.ts` に、`www.x.com` の登録も取り除かれること / x.com の Cookie が残ること / example.com の service worker が残ることを足す
  - _検証: Playwright: `e2e/service-worker.spec.ts`（`pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0）/ コマンド — `pnpm check` が終了コード 0 / ビルドした `manifest.json` の `permissions` に `browsingData` だけが増え、`host_permissions`・`optional_host_permissions` が変わらない_
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1_
  - _範囲: `apps/extension/entrypoints/background.ts`, `apps/extension/wxt.config.ts`, `apps/extension/tests/background.test.ts`, `apps/extension/e2e/service-worker.spec.ts`_
  - _並行: 不可（1.1・2.1 を使う）_

- [x] 2.3 残っていた service worker のページを、開いた時点でブロック画面へ移す
  - `entrypoints/background.ts` で `tabs.onUpdated` をトップレベルで登録し、`changeInfo.url` が `findBlockedOrigin` に当たれば `tabs.update` でブロック画面へ移し、そのオリジンを取り除く
  - `tests/background.test.ts`: ブロック中のサイトの URL のときだけ移す
  - `e2e/service-worker.spec.ts`: `news.x.com` に登録して `["x.com"]` を保存すると、1回目はブロック画面に移り記録のリクエストが1回、2回目は記録のリクエストが出ずにブロック画面に移る
  - _検証: Playwright: `e2e/service-worker.spec.ts`（`pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0）/ コマンド — `pnpm check` が終了コード 0_
  - _要件: 1.6_
  - _範囲: `apps/extension/entrypoints/background.ts`, `apps/extension/tests/background.test.ts`, `apps/extension/e2e/service-worker.spec.ts`_
  - _並行: 不可（2.2 と同じファイルを触る）_

- [x] 2.4 テストが実装の誤りを捕まえることを確かめる
  - 先に取り除く処理と `tabs.onUpdated` の処理をそれぞれ一時的に外すと `test:e2e` が失敗し、戻すと通る
  - _検証: コマンド — 外したときに終了コードが 0 以外、戻すと 0_
  - _要件: 4.1_
  - _範囲: `apps/extension/entrypoints/background.ts`（外す変更は検証後に戻す）_
  - _並行: 不可（2.3 までの E2E を使う）_

- [x] 3. 実ブラウザ

- [x] 3.1 実在の x.com で、ログインしたあとでもブロックされることを確かめる（人が操作する）
  - `pnpm --filter @site-blocker/extension run dev` で起動した Chrome で、ブロックリストから x.com を外して x.com にログインし、x.com を足し直す
  - _検証: ブラウザ: x.com を開くとブロック画面に移る / x.com を外すと、ログインしたまま x.com が開ける / service worker のコンソールにエラーがない_
  - _要件: 1.2, 2.1_
  - _範囲: なし（確認のみ）_
  - _並行: 可_
