# 実装タスク: blocked-page

- [ ] 1. 出力構成と検証基盤

- [x] 1.1 ブロック画面を `/site-blocker/blocked/` として出力する
  - `apps/web/index.html` を `apps/web/blocked/index.html` に移し、favicon を `data:` URI で埋め込む
  - Vite の `base` を `/site-blocker/`、ビルドの入力を `blocked/index.html` にする
  - ビルド結果に `dist/blocked/index.html` があり、`dist/index.html` がない。HTML が参照する JS・CSS が `/site-blocker/assets/` 配下を指す
  - _検証: コマンド — `pnpm --filter @site-blocker/web run build` が終了コード 0 / `test -f apps/web/dist/blocked/index.html && ! test -f apps/web/dist/index.html` / `grep -c '/site-blocker/assets/' apps/web/dist/blocked/index.html` が 1 以上_
  - _要件: 4.2, 4.3_
  - _範囲: `apps/web/index.html`, `apps/web/blocked/index.html`, `apps/web/vite.config.ts`_
  - _並行: 不可（1.2 以降がこの出力を前提にする）_

- [x] 1.2 ビルド結果に対して Playwright を走らせる基盤を作る
  - `@playwright/test` を追加し、`preview` と `test:e2e` のスクリプトを定義する（`test` には含めない）
  - `vite preview` を起動して `/site-blocker/blocked/` を開く設定にする。ブラウザは Chromium のみ
  - 最初のテストとして、ページを開いたときに 4xx のレスポンスが0件であることを確かめる
  - Playwright の出力（`test-results/` `playwright-report/`）を `.gitignore` に足す
  - _検証: コマンド — `pnpm --filter @site-blocker/web run test:e2e` が終了コード 0 / `pnpm test` がブラウザなしでも終了コード 0_
  - _要件: 4.3_
  - _範囲: `apps/web/package.json`, `apps/web/playwright.config.ts`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/e2e/`, `.gitignore`, `pnpm-lock.yaml`_
  - _並行: 不可（`pnpm-lock.yaml` を更新する。2.x の E2E の前提になる）_

- [ ] 2. 表示

- [x] 2.1 `location.hash` から表示用URLとホスト名を取り出す
  - `parseBlockedUrl(hash)` が、先頭の `#` を落とし、デコードせずに返す。ホスト名は先頭の `www.` を落とす。空なら `null`（U2 の見直しで `decodeURI` をやめる）
  - 元URLに含まれる `#`、`%E6%97%A5`、`%26`、不正な `%`、URL として読めない値を単体テストで押さえる
  - _検証: コマンド — `pnpm --filter @site-blocker/web run test` が終了コード 0 / `pnpm format:check` が終了コード 0_
  - _要件: 1.2, 1.7, 1.9_
  - _範囲: `apps/web/src/blockedUrl.ts`, `apps/web/src/blockedUrl.test.ts`_
  - _並行: 可_

- [x] 2.2 元URLとホスト名を、リンクにせずテキストで表示する
  - 1行目に「<ホスト名> は今ブロックしています」、見出しに「いまは、目の前のことに。」、その下に元URLを出す
  - `<img src=x onerror=...>` を含む hash でも文字として表示され、`img` 要素が作られない。元URL欄に `a` 要素がない
  - _検証: Playwright: `apps/web/e2e/blocked.spec.ts`（ホスト名・見出し・元URL・`#` を含む元URL・`img` と `a` が0個）_
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _範囲: `apps/web/src/App.tsx`, `apps/web/src/main.tsx`, `apps/web/src/vite-env.d.ts`, `apps/web/e2e/blocked.spec.ts`_
  - _並行: 不可（2.3〜2.5 と同じ E2E ファイルに追記する）_

- [x] 2.3 hash が空のときは見出しだけにし、hash の変化に追従する
  - hash なし・`#` のみで見出しだけを出し、ホスト名の行と元URL欄を出さない（U1）
  - 表示後に `location.hash` を変えると、1行目と元URL欄が新しい値になる
  - _検証: Playwright: `apps/web/e2e/blocked.spec.ts`（空の2パターン / hash 変更後の表示）_
  - _要件: 2.1, 1.6_
  - _範囲: `apps/web/src/App.tsx`, `apps/web/e2e/blocked.spec.ts`_
  - _並行: 不可（同上）_

- [x] 2.4 戻れる履歴があるときだけ「前のページに戻る」を出す
  - 別ページから遷移して開くとボタンが出て、押すと遷移元に戻る。新しいタブで直接開くとボタンが出ない
  - _検証: Playwright: `apps/web/e2e/blocked.spec.ts`（遷移ありで戻れる / 直接開くと非表示）_
  - _要件: 1.8_
  - _範囲: `apps/web/src/App.tsx`, `apps/web/e2e/blocked.spec.ts`_
  - _並行: 不可（同上）_

- [x] 2.5 元URLを外部に送らないことを確かめる
  - 読み込み中のリクエストがすべて同一オリジンで、どの URL も元URLの文字列を含まない
  - _検証: Playwright: `apps/web/e2e/blocked.spec.ts`（`page.on("request")` で全リクエストを記録して判定）_
  - _要件: 3.1, 3.2_
  - _範囲: `apps/web/e2e/blocked.spec.ts`_
  - _並行: 不可（同上）_

- [x] 2.6 見た目を `light.png` に合わせる
  - 空のグラデーション、右下の太陽と光、下部の海、左寄せの文字組み。カウントダウンは出さない
  - スマートフォン幅（375px）で横スクロールが出ず、文字が海や太陽に隠れない
  - _検証: ブラウザ: デスクトップ幅（1280×800）とスマートフォン幅（375×812）でスクリーンショットを撮り、`light.png` と見比べる_
  - _要件: なし（見た目。design の「検証方法」の見た目の行）_
  - _範囲: `apps/web/src/App.css`_
  - _並行: 可_

- [ ] 3. 公開

- [x] 3.1 ビルド・テストが通ったときだけ Pages に公開するワークフローを置く
  - `push`（main）と `workflow_dispatch` で起動する
  - `paths` は `apps/web/**`・ワークフロー自身・`package.json`・`pnpm-lock.yaml`・`pnpm-workspace.yaml`・`mise.toml`（U3）
  - build ジョブ: `jdx/mise-action` → `pnpm install --frozen-lockfile` → `pnpm check` → build → Playwright の Chromium を入れて test:e2e → `apps/web/dist` をアップロード
  - deploy ジョブは `needs: build` で、`deploy-pages` を実行する。権限は `contents: read` `pages: write` `id-token: write` のみ
  - Actions は checkout v7 / configure-pages v6 / upload-pages-artifact v5 / deploy-pages v5 / mise-action v4 に固定する
  - _検証: コマンド — `pnpm lint:workflows` が終了コード 0 / ワークフローと同じ手順（install → `pnpm check` → build → test:e2e）をローカルで順に実行して終了コード 0_
  - _要件: 4.1, 4.4, 4.5, 4.6_
  - _範囲: `.github/workflows/deploy-web.yml`_
  - _並行: 可_

- [ ] 3.2 （マージ後に人が行う）公開を確かめる
  - リポジトリの Settings → Pages → Source を「GitHub Actions」にする
  - main へのマージでワークフローが成功し、手動実行でも成功する。以後 `docs/` だけの push では実行されない
  - _検証: コマンド — `curl -sI https://yoshipon-tech.github.io/site-blocker/blocked/` が 200（301 でない） / ブラウザ: 公開 URL に `#https://x.com/home` を付けて開き、表示とネットワークタブで 404 が0件であることを確認する_
  - _要件: 4.1, 4.2, 4.3, 4.5, 4.6_
  - _範囲: なし（リポジトリ設定と確認のみ）_
  - _並行: 不可（3.1 のマージ後）_
