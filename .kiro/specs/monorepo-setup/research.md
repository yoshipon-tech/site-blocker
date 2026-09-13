# Research & Design Decisions

## Summary
- **Feature**: `monorepo-setup`
- **Discovery Scope**: New Feature（コードが存在しない greenfield。full discovery を実施）
- **Key Findings**:
  - `engines.node` だけでは実行環境を強制できない（pnpm 12 は Node.js 24 でもインストールを通し、npm は警告のみ）。`devEngines`（`onFail: "error"`）なら pnpm 12 と npm は止まるが、yarn 1 / yarn 4 / pnpm 8 は `devEngines` を無視する。preinstall のチェックスクリプトを併用すると全パターンで止まる
  - WXT はエントリーポイントが1つもないと `wxt prepare`（postinstall）が失敗し、インストール自体が止まる。何もしない background エントリーポイントが雛形に必要
  - `pnpm -r run` は既定で最初の失敗で止まり、失敗したパッケージのパスを表示して終了コード 1 を返す。`vitest run --passWithNoTests` はテスト0件で終了コード 0

すべての検証は scratchpad 上の試作ワークスペースで、Node.js 26.8.2 / pnpm 12.4.1（mise）を使って実施した。

## Research Log

### ライブラリの最新版と互換性（2026-09-13 時点、npm registry）
- **Sources Consulted**: `https://registry.npmjs.org/<package>/latest`
- **Findings**:
  | パッケージ | 版 | engines / peer |
  | --- | --- | --- |
  | wxt | 0.21.4 | node >=22、peer vite ^6.3.4 \|\| ^7 \|\| ^8、typescript >=5.4 |
  | vite | 8.3.0 | node ^20.19.0 \|\| >=22.12.0（rolldown 1.2 系を内蔵） |
  | @vitejs/plugin-react | 6.1.1 | peer vite ^8 |
  | vitest | 5.0.0 | node ^22.12 \|\| ^24 \|\| >=26、peer vite ^6.4 \|\| ^7 \|\| ^8 |
  | react / react-dom | 19.3.0 | — |
  | @types/react / @types/react-dom | 19.3.0 | — |
  | typescript | 7.0.2 | node >=16.20 |
  | pnpm | 12.4.1 | node >=18 |
- **Implications**: 全パッケージが Node.js 26 と Vite 8 の組み合わせで互換。試作ワークスペースで install / build / test がすべて成功した（TypeScript 7.0.2 でも `wxt prepare` の型生成は成功）

### 実行環境の強制（旧要件 2。要件から削除済み）
- **Status**: 調査後、`mise.toml` でバージョンを固定しているため不要と判断し、requirements から削除した。以下は判断材料として残す
- **Context**: Node.js 26 未満、pnpm 以外でのインストールを止め、理由を表示する
- **Sources Consulted**:
  - https://pnpm.io/package_json（engines、devEngines.runtime は v10.14〜、devEngines.packageManager は v11〜）
  - https://pnpm.io/settings/cli（engineStrict、pmOnFail は v11〜、既定 download）
  - https://docs.npmjs.com/cli/v11/configuring-npm/package-json（devEngines は install / ci / run の前に検査、onFail 既定 error）
- **Findings（実測）**:
  | 構成 | pnpm12+node26 | pnpm12+node24 | npm+node24/26 | pnpm8 | yarn1 | yarn4 |
  | --- | --- | --- | --- | --- | --- | --- |
  | `engines.node: ">=26"` のみ | 通過 | **通過** | 警告のみで通過 | — | — | — |
  | `devEngines`（runtime / packageManager、onFail error） | 通過 | 停止 `ERR_PNPM_BAD_RUNTIME_VERSION` | 停止 `EBADDEVENGINES` | **通過** | **通過** | **通過** |
  | `devEngines` + preinstall `npx only-allow pnpm` | **停止（pnpm 自身が失敗）** | 停止 | 停止 | — | — | — |
  | `devEngines` + preinstall 自前チェック | 通過 | 停止 | 停止 | 停止 | 停止 | 停止 |
  - pnpm 12 の lifecycle script では `npm_config_user_agent` が `pnpm/12.4.1 npm/? node/? darwin arm64`、yarn 1 では `yarn/1.22.22 ...`、pnpm 8 では `pnpm/8.15.9 ...` になる
  - yarn 4 は preinstall の失敗で終了コード 1 になるが、スクリプトの標準エラー出力は画面に出ず、ビルドログのパス（YN0009）だけが表示される
  - `devEngines.packageManager` を指定すると、pnpm は lockfile に `packageManagerDependencies`（pnpm 12.4.1 と各プラットフォームのバイナリ）を記録する。通常インストール後の `pnpm install --frozen-lockfile` は成功した
- **Implications**: `devEngines` を正とし、`devEngines` を解釈しないツール向けに自前の preinstall チェックを併用する。チェックスクリプトは `devEngines` を読み、バージョン指定を二重に持たない

### ワークスペースの一括実行（要件 4・5）
- **Sources Consulted**: https://pnpm.io/cli/recursive
- **Findings（実測）**:
  - ルートの `pnpm -r run build` は、ルートを除く2パッケージを対象に実行する（`Scope: 2 of 3 workspace projects`）
  - 失敗時は `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` で失敗したパッケージのパス（例: `apps/web`）を表示し、終了コード 1。並行実行中の他パッケージも `Failed` と表示されることがある
  - `pnpm --filter @site-blocker/web run build` で単体実行できる
  - `vitest run --passWithNoTests` はテストファイルがないと `No test files found, exiting with code 0`
  - テスト失敗時は Vitest がファイル名・テスト名・行番号を表示し、pnpm が失敗パッケージを表示する
- **Implications**: タスクランナー（Turborepo 等）は不要。pnpm の再帰実行で要件を満たす

### WXT の雛形とテスト
- **Sources Consulted**: https://wxt.dev/guide/essentials/project-structure.html、https://wxt.dev/guide/essentials/unit-testing.html
- **Findings（実測）**:
  - `entrypoints/` が空だと `wxt prepare` が `No entrypoints found` で失敗し、postinstall 経由でインストール全体が失敗する
  - `export default defineBackground(() => {});` だけの background で `wxt build` が成功し、`.output/chrome-mv3/`（manifest.json, background.js）を出力する
  - `package.json` に `version` がないと `Extension version not found, defaulting to "0.0.0"` の警告が出る
  - `vitest.config.ts` に `WxtVitest()`（`wxt/testing/vitest-plugin`）を設定すると、テスト0件でも成功し、`browser.storage.local` を使うテストがインメモリの fake browser で通る
  - pnpm 12 で依存のビルドスクリプトがブロックされる警告は出なかった
- **Implications**: 雛形に no-op の background と `version: "0.0.0"` を含める。テスト実行の配線（WxtVitest）は雛形側で用意する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
| --- | --- | --- | --- | --- |
| pnpm workspace + 再帰実行 | ルート scripts から `pnpm -r run` | 追加依存なし、フィルタ・失敗伝播が標準で揃う | キャッシュなし（2アプリなので問題にならない） | 採用 |
| Turborepo / Nx | タスクランナーを導入 | キャッシュ、依存グラフ可視化 | 設定と依存が増える。現規模では過剰 | 不採用 |

## Design Decisions

### Decision: 実行環境の強制は行わない（要件削除）
- **Final**: 当初は下記の「devEngines + 自前 preinstall チェック」を採用したが、yarn を使う予定がなく、Node.js / pnpm は `mise.toml` で固定しているため、要件ごと削除した。`devEngines`、`scripts/check-environment.mjs`、`scripts/` は作らない
- **Context**: 旧要件 2.1〜2.3
- **Alternatives Considered**:
  1. `engines` のみ — pnpm 12 も npm も止まらない
  2. `devEngines` のみ — yarn と古い pnpm が止まらない
  3. `devEngines` + `only-allow` — pnpm 12 自身のインストールが失敗する
  4. `devEngines` + 自前 preinstall チェック（採用）
- **Selected Approach**: ルート `package.json` の `devEngines` に Node.js `>=26` と pnpm `>=12` を `onFail: "error"` で宣言する。preinstall で `scripts/check-environment.mjs` を実行し、`devEngines` を読んで Node.js のメジャー版と `npm_config_user_agent` を検査する
- **Rationale**: 標準の仕組みを優先しつつ、実測で漏れたツールだけを補う。バージョン指定は `devEngines` の1か所
- **Trade-offs**: スクリプトは `>=<メジャー>` 形式のみ解釈する（semver ライブラリはインストール前に使えない）
- **Follow-up**: yarn 4 ではメッセージがビルドログにしか出ない

### Decision: 依存は `^` で指定し、lockfile で固定する
- **Context**: 要件 1.3（再インストールで同じ状態を再現）と、パッチを取り込みたいという方針
- **Alternatives Considered**:
  1. 完全一致で指定 — 再現性は高いが、パッチの取り込みに毎回 `package.json` の書き換えが必要
  2. `^` で指定 + lockfile（採用）
- **Selected Approach**: `package.json` の依存は `^` で指定する。`pnpm-lock.yaml` をコミットし、`pnpm install --frozen-lockfile` で同じ版を再現する。更新は `pnpm update` と lockfile のコミットで行う
- **Rationale**: 再現性は lockfile が担保し、`package.json` はパッチ・マイナー更新を受け入れる範囲を示す
- **Trade-offs**: `^` はメジャー 1 以上ではマイナー更新も含む（0.x の WXT はパッチのみ）。更新時はビルドとテストで確認する

### Decision: web の雛形は tsconfig を最小限にする
- **Context**: 型チェックと lint は範囲外（別 spec）。一方で TSX を書くとエディタが JSX を解釈できる必要がある
- **Selected Approach**: `apps/web/tsconfig.json` は JSX とモジュール解決に必要な項目だけを持ち、strict などの方針は別 spec で追加する。`apps/extension/tsconfig.json` は WXT 標準どおり `.wxt/tsconfig.json` を継承する

### Generalization / Simplification
- **Generalization**: 一括ビルドと一括テストは「全パッケージの同名スクリプトを実行する」同じ仕組み。各アプリは `build` と `test` スクリプトを持つ、という1つの規約にまとめる
- **Simplification**: タスクランナー、ルートの Vitest workspace 設定、共有 tsconfig パッケージは作らない

## Risks & Mitigations
- Node.js 26 は 2026年10月まで Current — mise で 26.8.2 に固定。LTS 移行後に更新
- TypeScript 7 は新しいメジャー版 — 試作で `wxt prepare` の成功を確認済み。型チェックは本 spec の範囲外
- mise 以外で入れた Node.js / pnpm で作業すると版がずれる — インストール時の強制はしない。README の必要環境で mise を前提として明記している
- 一括実行の失敗時、並行中の他パッケージも `Failed` と表示される — 最終行のエラーが失敗パッケージを示すことを検証項目に含める
- `apps/extension/entrypoints/background.ts` は後続の `redirect-rules` が中身を実装する — 本 spec は no-op のまま引き渡す

## References
- [pnpm package.json](https://pnpm.io/package_json) — engines、devEngines.runtime / packageManager
- [pnpm settings (CLI)](https://pnpm.io/settings/cli) — engineStrict、pmOnFail
- [pnpm recursive](https://pnpm.io/cli/recursive) — bail、フィルタ
- [npm package.json devEngines](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) — onFail
- [WXT Project Structure](https://wxt.dev/guide/essentials/project-structure.html)
- [WXT Unit Testing](https://wxt.dev/guide/essentials/unit-testing.html) — WxtVitest
