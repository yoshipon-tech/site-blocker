# ロードマップ

**これから何を、どの順で、どの単位の spec で作るか**を決めた文書。着手前にここを見て、spec の粒度と前提条件を確認する。

- 開発の手順そのものは [guide-workflow.md](guide-workflow.md)
- **確定した spec の影響範囲は `.claude/rules/guide-structure.md` が正**。この文書は計画なので、実装が始まったら guide-structure.md を更新する

## 現在地

| spec | 状態 |
| ---- | ---- |
| `monorepo-setup` | 完了（pnpm workspace と2アプリの雛形） |
| それ以降 | 未着手 |

## spec を切る基準

1. **1 spec = 1 影響範囲（ディレクトリ）** — worktree で並行実装できるように
2. **共有するものは分岐前に main で確定** — `.claude/rules/`、URL の契約、ルート設定
3. **分量上限 80 / 150 / 100 行** — 超えるなら機能を分割する

この3つから「触るディレクトリが同じ spec は並行できない」が決まる。機能が `apps/extension` に集中するため、**並行できるのは第一段階だけ**で、以降はほぼ直列になる。並行させるために無理に分割しない。

## 全体像

| # | spec | 範囲 | 前提 | 並行 |
| --- | --- | --- | --- | --- |
| 1 | `monorepo-setup` | root, `apps/*` 雛形 | — | 完了 |
| 2 | `redirect-rules` | `apps/extension` | URL 契約の確定 | 3 と並行可 |
| 3 | `blocked-page` | `apps/web`, `.github/workflows` | URL 契約の確定 | 2 と並行可 |
| 4 | `lint-typecheck` | root, `apps/*` 両方 | 2・3 のマージ後 | 単独 |
| 5 | `ci` | `.github/workflows` | 4 | 単独 |
| 6 | `blocklist-storage` | `apps/extension` | 2 | 直列 |
| 7 | `blocklist-ui` | `apps/extension` | 6 | 直列 |
| 8 | `schedule-blocking` | `apps/extension` | 6 | 直列 |
| 9 | `temporary-unblock` | `apps/extension` + `apps/web` | 6、メッセージ契約の確定 | 要分割 |
| 10 | `store-release` | `apps/extension`, docs | 6〜9 の必要分 | 最後 |

## 第一段階

### 着手前に main で決めること

2 と 3 を worktree で並行させるなら、**先に決めないと両方やり直しになる**。

| 決めること | なぜ先か |
| ---- | ---- |
| リダイレクト先のオリジン | 拡張のルールに埋め込まれる。開発中は GitHub Pages の既定ドメインを使う |
| パス | `/blocked` で確定か。Pages のサブパス（`/site-blocker/blocked`）をどう扱うか |
| フラグメントの形 | `#<元URL>` を生で入れるか、エンコードするか |

`guide-tech.md` には `/blocked#<元URL>` としか書いていないので、**サブパスの扱いを追記してから分岐する**。

### 2. `redirect-rules` — `apps/extension`

コードに書いたブロックリストから dynamic ルールを登録し、ブロック画面へリダイレクトする。

- `declarativeNetRequest` と `declarativeNetRequestWithHostAccess` のどちらにするか、`host_permissions` が要るかを決める
- 元URLに `#` や `&` が含まれる場合に `regexSubstitution` が壊れないかを確認する
- 検証は Playwright（回帰させる）と chrome-devtools MCP（初回の実挙動）の併用
- `wxt dev` を使うので、ここで `dev` スクリプトを `package.json` に足す

### 3. `blocked-page` — `apps/web`, `.github/workflows`

`location.hash` を読んで元URLをテキスト表示し、GitHub Pages へ公開する。

- 表示（`apps/web`）と公開（`.github/workflows`）は性質が違うので、**design が 150 行を超えたら `pages-deploy` を切り出す**
- `location.hash` は HTML として埋め込まない（`guide-tech.md` の Security）

## 基盤（第一段階の直後）

### 4. `lint-typecheck` — root と両アプリ

- lint / format ツールの選定（Biome か ESLint + Prettier か）
- `apps/web` の tsconfig を共通 base から継承させるか（`@tsconfig/vite-react` か、ルートに base を置くか）
- 各アプリが `typecheck` を持ち、ルートから `pnpm -r run typecheck` で回す規約
- 命名規則・パスエイリアス

**両アプリとルートを同時に触るので他と並行できない。** 2・3 がマージされた後の main で単独で進める。

### 5. `ci` — `.github/workflows`

プルリクと push で build / test / lint / typecheck を回す。4 の後でないと、CI に入れるコマンドが決まらない。

## 次段階

### 6. `blocklist-storage` — `apps/extension`

コードに直書きしたリストを `storage` へ移し、実行時に dynamic ルールを再構築する。**7・8・9 すべての土台**なので先にやる。

### 7. `blocklist-ui` — `apps/extension`

ポップアップかオプションページから編集する。6 のデータ構造が決まってから。

### 8. `schedule-blocking` — `apps/extension`

時間帯・曜日での有効／無効。`alarms` の検討が入る。

### 9. `temporary-unblock` — ここだけ boundary が割れる

「5分だけ開く」はブロック画面（`apps/web`）のボタンから拡張（`apps/extension`）を操作するため、**1 spec = 1 影響範囲を満たせない**。URL 契約と同じ構図なので、契約を先に固定して2つに割る。

1. main で `.claude/rules/guide-tech.md` にメッセージ契約を追記（`externally_connectable` の対象オリジン、メッセージの型、解除時間の扱い）
2. `temporary-unblock-extension` — `apps/extension`（受信、ルールの一時削除と復元）
3. `temporary-unblock-page` — `apps/web`（ボタン、送信）

## 公開

### 10. `store-release`

プライバシーポリシー、掲載情報、カスタムドメインの最終決定、拡張の version 運用（誰がどう上げるか）。

`apps/extension/package.json` の `version` は WXT が manifest に流し込む。開発中は `0.0.0` のままでよいが、**ストアはアップロードのたびに前回より大きい version を要求する**ので、ここで運用を決める。

## 推奨する順序

```
[main] URL 契約を guide-tech.md に確定（サブパスの扱いを含む）
   ↓
  ┌─ 2 redirect-rules（worktree A）
  └─ 3 blocked-page  （worktree B）    ← 並行できるのはここだけ
   ↓ 両方マージ
  4 lint-typecheck → 5 ci              ← 全体に触るので直列
   ↓
  6 blocklist-storage → 7 blocklist-ui → 8 schedule-blocking
   ↓
[main] メッセージ契約を確定 → 9 を2つに割って並行
   ↓
  10 store-release
```

## 未解決の課題

| 課題 | 解くタイミング |
| ---- | ---- |
| `redirect` ルールに `host_permissions` が要るか。`declarativeNetRequest` と `declarativeNetRequestWithHostAccess` のどちらにするか | 2 `redirect-rules` の方針決め |
| 元URLにすでに `#` が含まれる場合も、フラグメント渡しが意図どおり動くか | 2 `redirect-rules` の実装時に実ブラウザで確認 |
| lint / format / 型チェックの共通設定と一括実行（命名規則・パスエイリアスを含む） | 4 `lint-typecheck` |
| プルリクや push で自動チェックする CI | 5 `ci` |
| 一時解除などで Web から拡張を操作する場合の `externally_connectable` とメッセージの形 | 9 の前に `.claude/rules/` へ追加 |
| ストア公開に必要なもの（プライバシーポリシー、掲載情報）と、ブロックリスト編集UI | 7 `blocklist-ui` と 10 `store-release` |
| カスタムドメインを使うか。リダイレクト先URLは配布した拡張に埋め込まれるため、後から変えると古い拡張が壊れる | 10 `store-release`（開発中は既定ドメイン） |

テストフレームワークは `monorepo-setup` で Vitest に決定し、両アプリに配線済み。

## 拡張を Chrome で確認する

開発者モードで読み込む。ビルド成果物は `apps/extension/.output/chrome-mv3/`。

```bash
pnpm --filter @site-blocker/extension run build
```

1. Chrome で `chrome://extensions` を開く
2. 右上の**デベロッパーモード**を ON にする
3. **パッケージ化されていない拡張機能を読み込む**をクリック
4. `apps/extension/.output/chrome-mv3` を選ぶ

コードを変えたら**再ビルドしてから、`chrome://extensions` のリロードボタンを押す**。background のログは、拡張カードの **Service Worker** リンクから DevTools で見る。

`wxt dev`（`redirect-rules` 以降）を使えば、変更の検知と拡張のリロードが自動になる。

Claude に検証させる場合は chrome-devtools MCP を使う。`--isolated=true` なので毎回まっさらなプロファイルで起動し、**拡張は `install_extension` で毎回読み込む**（`--load-extension` は効かない）。普段使いの Chrome プロファイルは汚れない。

### 雛形の段階で見えるもの

`monorepo-setup` の時点では `background.ts` が空なので、読み込んでも**何も起きない**のが正しい。`chrome://extensions` に `@site-blocker/extension` が表示されれば、manifest が壊れていないことは確認できる。意味のある動作確認は 2 `redirect-rules` から。
