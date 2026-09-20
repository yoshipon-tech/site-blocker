# 実装タスク: monorepo-setup

- [ ] 1. ワークスペースの土台
- [x] 1.1 ルートのワークスペース定義と一括実行の入口を用意する
  - ワークスペースの対象を `apps/*` の各アプリに限定する
  - ルートのパッケージは非公開とし、アプリの依存を持たせない
  - ルートから全アプリの `build` と `test` を再帰実行するスクリプトを定義する
  - アプリがまだない状態で、リポジトリ直下の `pnpm install` が終了コード 0 で完了する
  - _検証: コマンド — リポジトリ直下の `pnpm install` が終了コード 0 / `pnpm run` の一覧に `build` と `test` が出る_
  - _要件: 1.1, 3.1, 4.1_
  - _範囲: `package.json`, `pnpm-workspace.yaml`_
  - _並行: 不可（2.1・3.1 の前提になるため最初に実行する）_

- [ ] 2. 拡張アプリの雛形
- [x] 2.1 ブロック機能を持たない WXT 拡張の雛形を作り、単体でビルドできるようにする
  - パッケージ名を `@site-blocker/extension`、バージョンを `0.0.0` にし、依存は `^` で指定する
  - インストール時に WXT の型生成が走るようにする
  - 何もしない background エントリーポイントを1つだけ置く（エントリーポイントがないと型生成とビルドが失敗するため）
  - `pnpm --filter @site-blocker/extension run build` が終了コード 0 で、Chrome MV3 向けの manifest と background が出力される
  - 出力された manifest に、リダイレクトルールや `declarativeNetRequest` の権限が含まれていない
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run build` が終了コード 0 / `apps/extension/.output/chrome-mv3/` に `manifest.json` と background のスクリプトが出力され、`manifest_version` が 3 / 出力された manifest に `declarativeNetRequest` と `rule` が一致しない（`grep -iE 'declarativeNetRequest|rule'`）_
  - _要件: 1.1, 2.1, 3.2_
  - _範囲: `apps/extension/package.json`, `wxt.config.ts`, `tsconfig.json`, `entrypoints/background.ts`_
  - _並行: 不可（3.1 と共有の `pnpm-lock.yaml` を更新するため）_

- [x] 2.2 拡張アプリのテスト実行を配線する
  - WXT の Vitest プラグインを登録し、テストから fake browser と WXT の自動 import を使えるようにする
  - テストが1つもない状態でも成功するテストスクリプトを定義する
  - `pnpm --filter @site-blocker/extension run test` がテスト0件で終了コード 0 になる
  - _検証: コマンド — `pnpm --filter @site-blocker/extension run test` がテスト0件で終了コード 0_
  - _要件: 4.2_
  - _範囲: `apps/extension/vitest.config.ts`, `apps/extension/package.json`_
  - _並行: 不可（2.1 が作る `package.json` に追記するため）_

- [ ] 3. ブロック画面アプリの雛形
- [x] 3.1 表示内容を持たない Vite + React の雛形を作り、単体でビルドできるようにする
  - パッケージ名を `@site-blocker/web` にし、依存は `^` で指定する
  - マウント先だけを持つ HTML と、空の React ツリーをマウントするだけのエントリを置く
  - JSX とモジュール解決に必要な最小限の TypeScript 設定だけを置き、strict などの型チェック方針は含めない
  - `pnpm --filter @site-blocker/web run build` が終了コード 0 で、`index.html` を含む成果物が出力される
  - _検証: コマンド — `pnpm --filter @site-blocker/web run build` が終了コード 0 / `apps/web/dist/index.html` が生成される_
  - _要件: 1.1, 2.2, 3.2_
  - _範囲: `apps/web/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`_
  - _並行: 不可（2.1 と共有の `pnpm-lock.yaml` を更新するため）_

- [x] 3.2 ブロック画面アプリのテスト実行を配線する
  - ビルド設定をそのまま読むテストスクリプトを定義し、テスト専用の設定ファイルは置かない
  - テストが1つもない状態でも成功するようにする
  - `pnpm --filter @site-blocker/web run test` がテスト0件で終了コード 0 になる
  - _検証: コマンド — `pnpm --filter @site-blocker/web run test` がテスト0件で終了コード 0 / `apps/web` にテスト専用の設定ファイルが存在しない_
  - _要件: 4.2_
  - _範囲: `apps/web/package.json`_
  - _並行: 不可（3.1 が作る `package.json` に追記するため）_

- [ ] 4. ワークスペース全体の結合
- [x] 4.1 ルートからのインストールと再現性を確認し、lockfile を確定する
  - リポジトリ直下の1回の `pnpm install` で、両アプリの依存が導入される
  - ワークスペースのパッケージ一覧に `@site-blocker/extension` と `@site-blocker/web` が表示される
  - `node_modules` を削除してから `pnpm install --frozen-lockfile` を実行し、終了コード 0 で同じ状態が再現される
  - 両アプリの依存定義とソースに、相手のパッケージへの依存や import が含まれていない
  - lockfile がコミット対象として存在し、ビルド成果物と `node_modules` は git 管理外のままである
  - _検証: コマンド — `node_modules` を消してから `pnpm install --frozen-lockfile` が終了コード 0 / `pnpm -r ls --depth -1` に両アプリのパッケージ名が出る / 両アプリの `package.json`・ソースに相手のパッケージ名が一致しない（`grep -r`） / `git status --porcelain` に `node_modules`・`.output`・`dist` が現れず、`git ls-files pnpm-lock.yaml` が1件返る_
  - _要件: 1.1, 1.2, 1.3, 2.3_
  - _範囲: `pnpm-lock.yaml`（確認が主で、恒久的な変更は lockfile のみ）_
  - _並行: 不可（2.x・3.x がすべて終わってから実行する）_

- [x] 4.2 ルートからの一括ビルド・一括テストと単体指定を確認する
  - リポジトリ直下の `pnpm build` が終了コード 0 で、拡張とブロック画面の両方の成果物が出力される
  - リポジトリ直下の `pnpm test` が、両アプリのテストを実行して終了コード 0 になる
  - `--filter` でアプリを指定したビルドとテストが、指定したアプリだけを対象に実行される
  - `.claude/rules/guide-tech.md` の Common Commands に、一括ビルド・一括テスト・単体指定のコマンドが追記されている
  - _検証: コマンド — リポジトリ直下の `pnpm build` が終了コード 0 で `apps/extension/.output/chrome-mv3/manifest.json` と `apps/web/dist/index.html` が生成される / 直下の `pnpm test` が終了コード 0 で両アプリが実行される / `pnpm --filter @site-blocker/web run build` の出力に `apps/extension` が現れない / `guide-tech.md` の Common Commands に3つのコマンドが載っている_
  - _要件: 3.1, 3.2, 3.4, 4.1, 4.2, 4.4_
  - _範囲: `.claude/rules/guide-tech.md`_
  - _並行: 不可（4.1 の後に実行する）_

- [ ] 5. 失敗時の挙動の検証
- [x] 5.1 ビルド失敗がルートの一括ビルドに伝わることを検証する
  - ブロック画面アプリに一時的に構文エラーを入れて、リポジトリ直下で一括ビルドを実行する
  - コマンドが終了コード非0で終わり、最後のエラー出力が失敗したアプリ（ブロック画面アプリ）を示す
  - 検証後に一時的な変更を戻し、一括ビルドが再び成功する
  - _検証: コマンド — `apps/web/src/main.tsx` に一時的な構文エラーを入れた状態の `pnpm build` が終了コード非0で、最後のエラー出力が `apps/web` を示す / 変更を戻した `pnpm build` が終了コード 0_
  - _要件: 3.3_
  - _範囲: `apps/web/src/main.tsx`（一時的に壊して戻す。恒久的な変更なし）_
  - _並行: 不可（一括ビルドを一時的に壊すため、他タスクと同時に走らせない）_

- [x] 5.2 テスト失敗の伝播と、テスト基盤の動作を検証する
  - ブロック画面アプリに一時的に失敗するテストを置き、リポジトリ直下で一括テストを実行する
  - コマンドが終了コード非0で終わり、失敗したテストファイル名と失敗したアプリが表示される
  - 拡張アプリに一時的に `browser.storage` を使うテストを置き、アプリ指定のテスト実行で拡張のテストだけが実行され成功する
  - 検証後に一時的なテストを削除し、一括テストが再び終了コード 0 になる
  - _検証: コマンド — 一時的に失敗するテストを `apps/web` に置いた `pnpm test` が終了コード非0で、テストファイル名と `apps/web` が表示される / `browser.storage` を使うテストを `apps/extension` に置いた `pnpm --filter @site-blocker/extension run test` が終了コード 0 で拡張のテストだけ実行される / 一時的なテストを削除した `pnpm test` が終了コード 0_
  - _要件: 4.3, 4.4_
  - _範囲: `apps/web`・`apps/extension` の一時的なテストファイル（検証後に削除。恒久的な変更なし）_
  - _並行: 不可（一括テストを一時的に壊すため、他タスクと同時に走らせない）_
