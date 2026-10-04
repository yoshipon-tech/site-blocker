# 実装タスク: blocklist-ui

- [ ] 1. 編集のロジック

- [x] 1.1 入力の正規化と追加の可否を判定する関数を作る
  - `utils/blocklist.ts` のドメインの検査を `isDomain(value)` として公開し、`parseBlocklist` もそれを使う（既存のテストが変更なしで通る）
  - `utils/site.ts` に `normalizeSite(input)`・`checkAdd(stored, domain)`・`describeEntries(stored)` を置き、`utils/site.test.ts` で確かめる（大文字 / URL / 先頭の `www.` / 前後の空白 / 空 / `https://` / 重複 / 既存のサブドメイン / 1,000 件 / 無効な項目と配列でない値の表示用の行）
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` と `pnpm lint` が終了コード 0_
  - _要件: 1.5, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  - _範囲: `apps/extension/utils/blocklist.ts`, `apps/extension/utils/site.ts`, `apps/extension/utils/site.test.ts`_
  - _並行: 不可（1.2 以降が使う）_

- [x] 1.2 権限と保存の段取りをする関数を作る
  - `utils/storage.ts` に `pendingSiteItem`（`session:pendingSite`）を足す
  - `utils/editor.ts` に `addSite`・`removeEntry`・`completePendingSite` を置き、偽の `permissions`・保存先・manifest を渡して `utils/editor.test.ts` で確かめる
    - 権限あり: `request` を呼ばずに末尾に保存する / 権限なし: `pendingSite` を書いてから `request` に入力したサイトの1パターンだけを渡す / 拒否: `blocklist` が変わらず `pendingSite` が消え、理由を返す
    - `completePendingSite`: `pendingSite` と一致するパターンでだけ末尾に足し、`pendingSite` を消す。既に入っていれば足さない
    - 削除: そのサイトだけを外す / 最後の1件で `[]` を保存する / manifest の `host_permissions` にないパターンだけ `permissions.remove` を呼ぶ
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / `pnpm typecheck` と `pnpm lint` が終了コード 0_
  - _要件: 2.1, 2.3, 3.1, 3.3, 3.4, 4.2_
  - _範囲: `apps/extension/utils/storage.ts`, `apps/extension/utils/editor.ts`, `apps/extension/utils/editor.test.ts`_
  - _並行: 不可（1.1 を使う）_

- [x] 1.3 background で許可を受けて保存し、任意の権限を宣言する
  - `entrypoints/background.ts` で `permissions.onAdded` をトップレベルで登録し、`completePendingSite` を呼ぶ。`tests/background.test.ts` に、`onAdded` で呼ばれることを足す
  - `wxt.config.ts` に `optional_host_permissions: ["*://*/*"]` を足す
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0 / ビルドした `manifest.json` の `permissions`・`host_permissions` が変わらず、`optional_host_permissions` が `["*://*/*"]` / 既存の `test:e2e` が終了コード 0_
  - _要件: 2.1, 4.1_
  - _範囲: `apps/extension/entrypoints/background.ts`, `apps/extension/tests/background.test.ts`, `apps/extension/wxt.config.ts`_
  - _並行: 不可（1.2 を使う）_

- [ ] 2. ポップアップ

- [x] 2.1 一覧を表示するポップアップを作る
  - `entrypoints/popup/` に `index.html`・`main.ts`・`style.css` を置く。行は `describeEntries` から描き、値は `textContent` で出す。`blocklistItem.watch` と `permissions.onAdded/onRemoved` で描き直す
  - `e2e/fixtures.ts` に `openPopup` を足し、`e2e/popup.spec.ts` で確かめる: 初期値の2サイトが保存順に出る / `[]` で1件もない旨が出る / 開いたまま書き換えると表示が変わる / `["x.com", "example.com"]` で example.com の行にだけブロックされていない旨が出る / `["x.com", "X.com", 1]` で無効の行が2つ出る
  - _検証: Playwright: `e2e/popup.spec.ts`（`pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0）/ `pnpm check` が終了コード 0_
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2_
  - _範囲: `apps/extension/entrypoints/popup/`, `apps/extension/e2e/fixtures.ts`, `apps/extension/e2e/popup.spec.ts`_
  - _並行: 不可（1.1・1.2 を使う）_

- [x] 2.2 ポップアップから追加・削除できるようにする
  - 入力欄と追加ボタン、各行の削除ボタンを `addSite`・`removeEntry` につなぎ、結果の文言を表示する
  - `e2e/popup.spec.ts`: twitter.com を削除すると開け、`Twitter.com` で足し直すとブロックされる / 最後の1件まで消すと `[]` が保存される / 無効の行を削除すると `blocklist` から消える / 空・`https://`・`www.x.com` を入力すると保存されず理由が出る
  - _検証: Playwright: `e2e/popup.spec.ts`（`pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0）/ `pnpm check` が終了コード 0_
  - _要件: 1.5, 2.2, 2.4, 2.7, 2.8, 3.1, 3.2, 3.3_
  - _範囲: `apps/extension/entrypoints/popup/`, `apps/extension/e2e/popup.spec.ts`_
  - _並行: 不可（2.1 と同じファイルを触る）_

- [x] 2.3 テストが実装の誤りを捕まえることを確かめる
  - `normalizeSite` の `www.` 除去と `checkAdd` の重複検査をそれぞれ一時的に壊すと、単体テストか `test:e2e` が失敗し、戻すと通る
  - _検証: コマンド — 壊したときに終了コードが 0 以外、戻すと 0_
  - _要件: 5.1_
  - _範囲: `apps/extension/utils/site.ts`（壊す変更は検証後に戻す）_
  - _並行: 不可（2.2 の E2E を使う）_

- [ ] 3. 実ブラウザ

- [ ] 3.1 権限ダイアログを通した追加・削除を確かめる（人が操作する）
  - `pnpm --filter @site-blocker/extension run build` の `.output/chrome-mv3` を手元の Chrome に開発者モードで読み込み、ツールバーのアイコンからポップアップを開く
  - _検証: ブラウザ: `https://www.youtube.com/watch?v=1` を追加し、許可すると一覧に `youtube.com` が足され、youtube.com と m.youtube.com を開くとブロック画面に元URLが出る / もう一度別のサイトで拒否すると一覧が変わらず理由が出る / youtube.com を削除すると開け、`chrome://extensions` の詳細でそのサイトのアクセス権が消えている / ポップアップの見た目が崩れていない_
  - _要件: 2.1, 2.2, 2.3, 3.4_
  - _範囲: なし（確認のみ）_
  - _並行: 可_
