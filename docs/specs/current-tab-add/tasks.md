# 実装タスク: current-tab-add

- [x] 1. 判定と権限

- [x] 1.1 今開いているページのカードの状態を決める関数を作る
  - `utils/site.ts` で `checkAdd` から重複・サブドメインの判定を `coveringDomain(domains, domain)` として切り出し、`checkAdd` の返す理由を変えない
  - `describeCurrentPage(url, stored)` を足し、`utils/site.test.ts` で確かめる（`https://www.Note.com/foo` → addable `note.com` / `["x.com"]` で `https://x.com/`・`https://news.x.com/` → registered / `chrome://newtab/`・`chrome-extension://…`・`file:///…`・`undefined`・ブロック画面の URL → unavailable / 上限に達していても addable）
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` が終了コード 0（既存の `checkAdd` のテストを含む）/ `pnpm typecheck` と `pnpm lint` が終了コード 0_
  - _要件: 1.2, 1.4, 1.5, 5.2_
  - _範囲: `apps/extension/utils/site.ts`, `apps/extension/utils/site.test.ts`_
  - _並行: 可_

- [x] 1.2 `activeTab` 権限を足す
  - `wxt.config.ts` の `permissions` に `activeTab` を足し、インストール時の警告が出ないことをコメントに書く
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run build` が終了コード 0 で、ビルドした `manifest.json` の `permissions` に `activeTab` だけが増え、`host_permissions`・`optional_host_permissions` が変わらない_
  - _要件: 4.1_
  - _範囲: `apps/extension/wxt.config.ts`_
  - _並行: 可（1.1 と別のファイル）_

- [x] 2. ポップアップ

- [x] 2.1 ポップアップに今開いているページのカードを出し、追加できるようにする
  - `index.html` の入力欄の上にカードを置き、`style.css` でモック（`mock-addable.png`）に揃える。入力欄側の追加ボタンを枠線のボタンにする
  - `main.ts`: 開いたときに `tabs.query({ active: true, currentWindow: true })` の `url` を1回読み、`render` で `describeCurrentPage` の状態どおりにカードを描く（addable: ドメインと追加ボタン / registered: ドメインと「登録済み」/ unavailable: 「このページは追加できません」）。サイト名は `textContent` で出す
  - 追加ボタンのアクセシブルな名前は `<ドメイン> を追加`。押すと `addSite(domain, deps)` を呼び、結果を入力欄からの追加と同じ文言で表示する
  - _検証: コマンド — `pnpm check` が終了コード 0 / Playwright: 既存の `pnpm --filter @site-blocker/extension run test:e2e` が終了コード 0（3.1）/ コマンド — `grep -rnE '\.query\(' apps/extension/entrypoints apps/extension/utils` がテスト以外で `entrypoints/popup/main.ts` だけを返す（4.2。prettier が `browser.tabs` と `.query(` を別の行に分けるため）_
  - _要件: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 4.2_
  - _範囲: `apps/extension/entrypoints/popup/index.html`, `apps/extension/entrypoints/popup/main.ts`, `apps/extension/entrypoints/popup/style.css`_
  - _並行: 不可（1.1 の関数と 1.2 の権限を使う）_

- [x] 2.2 テストが判定の誤りを捕まえることを確かめる
  - `describeCurrentPage` の登録済みの判定（サブドメインを登録済みにしない）と `www.` の扱い（外さない）をそれぞれ一時的に壊すと `test` が失敗し、戻すと通る
  - _検証: コマンド — 壊したときに終了コードが 0 以外、戻すと 0_
  - _要件: 5.1_
  - _範囲: `apps/extension/utils/site.ts`（壊す変更は検証後に戻す）_
  - _並行: 不可（1.1 のテストを使う）_

- [x] 3. 実ブラウザ

- [x] 3.1 カードの表示と追加を確かめる（人が操作する）
  - `pnpm --filter @site-blocker/extension run dev` で起動した Chrome で確かめる
  - _検証: ブラウザ: note.com（権限なし）を開いてポップアップを開くと、入力欄の上のカードに `note.com` と追加ボタンが出て、見た目がモックと揃っている / 押して許可すると一覧に足され、開き直すとカードが「登録済み」で、note.com のタブは移っていない / 拒否すると足されない / ブロックリストから外した x.com ではダイアログなしに足され、開いたまま「登録済み」に変わる / 足す前から開いていた `www.x.com` のタブでは「登録済み」/ 新しいタブ・`chrome://extensions`・ブロック画面では「このページは追加できません」が出て追加ボタンが出ない / service worker とポップアップのコンソールにエラーがない_
  - _要件: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_
  - _範囲: なし（確認のみ）_
  - _並行: 不可（2.1 の実装を使う）_
