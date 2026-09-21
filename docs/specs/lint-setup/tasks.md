# 実装タスク: lint-setup

- [x] 1. 個別の検査

- [x] 1.1 TypeScript を 6 系に揃え、型チェックを実行できるようにする
  - 両アプリとルートの `typescript` を `~6.0.3` にし、両アプリに `typecheck`（`tsc --noEmit`）、ルートに `typecheck`（`pnpm -r run typecheck`）を足す
  - Web の `tsconfig.json` に `strict: true` を足し、既存コードの型エラーを直す
  - _検証: コマンド — `pnpm typecheck` が終了コード 0 / `pnpm --filter @site-blocker/web run typecheck` で web だけが走る / 一時ファイルに暗黙の any と null 未確認の参照を置くと終了コード 0 以外でファイル名と行が出る（確認後に消す）_
  - _要件: 1.1, 1.2, 1.3, 1.4_
  - _範囲: `package.json`, `apps/*/package.json`, `apps/web/tsconfig.json`, `apps/*/src`, `pnpm-lock.yaml`_
  - _並行: 不可（`pnpm-lock.yaml` と `package.json` を更新する。1.2 以降が 6 系を前提にする）_

- [x] 1.2 ESLint を型情報付きで全アプリに掛ける
  - ルートに `eslint.config.js` を置く。無視 → JS 推奨 → `recommendedTypeChecked`（`projectService`）→ `apps/web/**` に react-hooks。`*.config.*` は型情報なし
  - ルートに `lint`（`eslint .`）を足し、既存コードの違反を直す
  - _検証: コマンド — `pnpm lint` が終了コード 0 / 一時的に未使用変数・条件分岐内の `useState`・`useEffect` の依存漏れを置くと、ファイル名・行・ルール名付きで失敗する / `pnpm build` 後も `pnpm lint` が終了コード 0（`dist` `.output` `.wxt` を見ていない）_
  - _要件: 2.1, 2.2, 2.3, 2.4_
  - _範囲: `eslint.config.js`, `package.json`, `apps/*/src`, `apps/*/entrypoints`, `pnpm-lock.yaml`_
  - _並行: 不可（`pnpm-lock.yaml` と `package.json` を更新する）_

- [x] 1.3 Prettier で書式を揃え、ESLint と衝突させない
  - `.prettierrc.json`（既定値）と `.prettierignore`（`*.md`・成果物・`pnpm-lock.yaml`）を置き、ルートに `format` / `format:check` を足す
  - `eslint.config.js` の最後に `eslint-config-prettier` を足し、`pnpm format` で既存ファイルを整形する
  - _検証: コマンド — 一時的に書式を崩すと `pnpm format:check` がファイル名付きで失敗し、`pnpm format` 後に通る / `pnpm format` 後に `pnpm lint` が終了コード 0 / 書式の崩れた `.md` を置いても `pnpm format:check` が終了コード 0_
  - _要件: 3.1, 3.2, 3.3, 3.4_
  - _範囲: `.prettierrc.json`, `.prettierignore`, `eslint.config.js`, `package.json`, 整形されるファイル全体, `pnpm-lock.yaml`_
  - _並行: 不可（`eslint.config.js` と `pnpm-lock.yaml` を 1.2 と共有する。整形が全ファイルに及ぶ）_

- [x] 1.4 ワークフローを actionlint で検査する
  - `mise.toml` に `actionlint` と `shellcheck` を固定し、ルートに `lint:workflows`（`actionlint`）を足す。既存の `claude.yml` の指摘を直す
  - _検証: コマンド — `mise install` 後に `mise exec -- actionlint --version` が `mise.toml` の版 / `pnpm lint:workflows` が終了コード 0 / 一時的に `needs:` に存在しないジョブを書くと失敗する_
  - _要件: 4.1, 4.2_
  - _範囲: `mise.toml`, `package.json`, `.github/workflows/`_
  - _並行: 不可（`package.json` の scripts を 1.1〜1.3 と共有する）_

- [x] 2. まとめて実行する

- [x] 2.1 一括チェックを用意し、既存コードがすべて通ることを確かめる
  - ルートに `check`（`typecheck && lint && format:check && lint:workflows && test`）を足す
  - _検証: コマンド — `pnpm check` が終了コード 0 / 1.x の違反を1つ入れると失敗し、失敗したスクリプト名が出る（確認後に戻す）_
  - _要件: 5.1, 5.2, 7.1_
  - _範囲: `package.json`_
  - _並行: 不可（1.1〜1.4 のスクリプトを前提にする）_

- [x] 2.2 push 前に一括チェックを自動で実行する
  - husky を入れ、ルートに `prepare`（`husky`）を足す。`pnpm install` で有効にならなければ `postinstall` に切り替える
  - `.husky/pre-push` で mise を PATH・`/opt/homebrew/bin`・`~/.local/bin` の順に探し、`mise exec -- pnpm run check` を実行する。見つからなければ理由を表示して終了コード 1
  - _検証: コマンド — 違反を入れた状態で `sh .husky/pre-push` が終了コード 0 以外、戻すと 0 / 一時ディレクトリにクローンして `pnpm install` 後、`git config core.hooksPath` が `.husky/_` / `env -i HOME="$HOME" PATH=/usr/bin:/bin sh .husky/pre-push` が終了コード 0_
  - _要件: 6.1, 6.2, 6.3, 6.4_
  - _範囲: `.husky/pre-push`, `package.json`, `pnpm-lock.yaml`_
  - _並行: 不可（2.1 の `check` を呼ぶ）_

- [x] 2.3 作業ルールと技術ガイドを更新する
  - `rule-git.md` の「機械的な強制」の行を、push 前に一括チェックを自動実行し、commitlint と CI はしない、に書き換える
  - `guide-tech.md` に TypeScript 6 系とその理由、Common Commands に `pnpm check` `pnpm lint` `pnpm format` などを足す
  - _検証: 目視 — 差分を読み、6.5 の2点（push 前の自動実行 / commitlint と CI はしない）が書かれていることを確認する_
  - _要件: 6.5_
  - _範囲: `.claude/rules/rule-git.md`, `.claude/rules/guide-tech.md`_
  - _並行: 可_
