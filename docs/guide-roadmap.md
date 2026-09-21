# ロードマップ

**これから何を、どの順で、どの単位の spec で作るか**を決めた文書。着手前にここを見て、spec の粒度と前提条件を確認する。

- 開発の手順そのものは [guide-workflow.md](guide-workflow.md)
- **確定した spec の影響範囲は `.claude/rules/guide-structure.md` が正**。この文書は計画なので、実装が始まったら guide-structure.md を更新する

## この文書と issue の分担

重複させない。置き場所を分ける。

| | 置くもの |
| ---- | ---- |
| **この文書** | spec の単位・順序・依存関係・着手前に決めること（状態を持たない判断の前提） |
| **GitHub issue** | 個々のタスクと未解決事項（open / closed という状態を持つ。PR から閉じる） |

思いついた機能は issue に積む。順序と依存を変えるときだけこの文書を直す。

## 現在地

| spec | 状態 |
| ---- | ---- |
| `monorepo-setup` | 完了（pnpm workspace と2アプリの雛形） |
| それ以降 | 未着手。[issue 一覧](https://github.com/yoshipon-tech/site-blocker/issues)（`spec` / `question` ラベル） |

## spec を切る基準

1. **1 spec = 1 影響範囲（ディレクトリ）** — worktree で並行実装できるように
2. **共有するものは分岐前に main で確定** — `.claude/rules/`、URL の契約、ルート設定
3. **分量上限 80 / 150 / 100 行** — 超えるなら機能を分割する

この3つから「触るディレクトリが同じ spec は並行できない」が決まる。機能が `apps/extension` に集中するため、後半はほぼ直列になる。**並行させるために無理に分割しない。**

## 全体像

| spec | issue | 範囲 | 前提 |
| ---- | ---- | ---- | ---- |
| `monorepo-setup` | — | root, `apps/*` 雛形 | 完了 |
| `blocked-page` | #4 | `apps/web`, `.github/workflows` | URL 契約の確定（#3） |
| `redirect-rules` | #5 | `apps/extension` | #3, #4 |
| `lint-typecheck` | #8 | root, `apps/*` 両方 | #4・#5 のマージ後 |
| `ci` | #9 | `.github/workflows` | #8 |
| `blocklist-storage` | #10 | `apps/extension` | #5 |
| `blocklist-ui` | #11 | `apps/extension` | #10 |
| `schedule-blocking` | #12 | `apps/extension` | #10 |
| `temporary-unblock-extension` | #14 | `apps/extension` | #10, 契約の確定（#13） |
| `temporary-unblock-page` | #15 | `apps/web` | #13 |
| `store-release` | #17 | `apps/extension`, docs | #16 |

## 第一段階

**目標は「動くもの」を最短で出すこと。** x.com を開くとブロック画面に飛び、元URLが表示される状態にする。

`blocked-page` と `redirect-rules` は影響範囲が分かれているので並行もできるが、**1人で進めるなら直列で `blocked-page` → `redirect-rules` の順**にする。リダイレクト先が実在してから拡張を作れば、検証が「アドレスバーのURLを読む」ではなく「実際にブロック画面が出る」になり、worktree を2つ管理する手間も要らない。

### 着手前に main で決めること（#3）

**先に決めないと両方やり直しになる。**

| 決めること | なぜ先か |
| ---- | ---- |
| リダイレクト先のオリジン | 拡張のルールに埋め込まれる。開発中は GitHub Pages の既定ドメインを使う |
| パス | `/blocked` で確定か。Pages のサブパス（`/site-blocker/blocked`）をどう扱うか |
| フラグメントの形 | `#<元URL>` を生で入れるか、エンコードするか |

`guide-tech.md` には `/blocked#<元URL>` としか書いていないので、**サブパスの扱いを追記してから分岐する**。

### 1番目: `blocked-page` — `apps/web`, `.github/workflows`（#4）

`location.hash` を読んで元URLをテキスト表示し、GitHub Pages へ公開する。

- 表示（`apps/web`）と公開（`.github/workflows`）は性質が違うので、**design が 150 行を超えたら `pages-deploy` を切り出す**
- `location.hash` は HTML として埋め込まない（`guide-tech.md` の Security）
- Vite の `base` を Pages のサブパスに合わせる
- hash が空のとき（直接開かれたとき）の挙動を決める

### 2番目: `redirect-rules` — `apps/extension`（#5）

コードに書いたブロックリストから dynamic ルールを登録し、ブロック画面へリダイレクトする。**ここまで入ると「動くもの」が完成する。**

- `declarativeNetRequest` と `declarativeNetRequestWithHostAccess` のどちらにするか、`host_permissions` が要るかを決める（#6）
- 元URLに `#` や `&` が含まれる場合に `regexSubstitution` が壊れないかを確認する（#7）
- 検証は Playwright（回帰させる）と chrome-devtools MCP（初回の実挙動）の併用
- `wxt dev` を使うので、ここで `dev` スクリプトを `package.json` に足す

## 基盤（第一段階の直後）

### `lint-typecheck` — root と両アプリ（#8）

- lint / format ツールの選定（Biome か ESLint + Prettier か）
- `apps/web` の tsconfig を共通 base から継承させるか（`@tsconfig/vite-react` か、ルートに base を置くか）
- 各アプリが `typecheck` を持ち、ルートから `pnpm -r run typecheck` で回す規約
- 命名規則・パスエイリアス

**両アプリとルートを同時に触るので他と並行できない。** #4・#5 がマージされた後の main で単独で進める。

### `ci` — `.github/workflows`（#9）

プルリクと push で build / test / lint / typecheck を回す。#8 の後でないと、CI に入れるコマンドが決まらない。

## 次段階

### `blocklist-storage` — `apps/extension`（#10）

コードに直書きしたリストを `storage` へ移し、実行時に dynamic ルールを再構築する。**#11・#12・#14 すべての土台**なので先にやる。

### `blocklist-ui` — `apps/extension`（#11）

ポップアップかオプションページから編集する。#10 のデータ構造が決まってから。

### `schedule-blocking` — `apps/extension`（#12）

時間帯・曜日での有効／無効。`alarms` の検討が入る。

### `temporary-unblock` — ここだけ boundary が割れる（#13, #14, #15）

「5分だけ開く」はブロック画面（`apps/web`）のボタンから拡張（`apps/extension`）を操作するため、**1 spec = 1 影響範囲を満たせない**。URL 契約と同じ構図なので、契約を先に固定して2つに割る。

1. main で `.claude/rules/guide-tech.md` にメッセージ契約を追記（#13）
2. `temporary-unblock-extension` — `apps/extension`（受信、ルールの一時削除と復元。#14）
3. `temporary-unblock-page` — `apps/web`（ボタン、送信。#15）

## 公開

### `store-release`（#16, #17）

プライバシーポリシー、掲載情報、カスタムドメインの最終決定、拡張の version 運用（誰がどう上げるか）。

`apps/extension/package.json` の `version` は WXT が manifest に流し込む。開発中は `0.0.0` のままでよいが、**ストアはアップロードのたびに前回より大きい version を要求する**ので、ここで運用を決める。

## 推奨する順序

```
[main] #3 URL 契約を guide-tech.md に確定（サブパスの扱いを含む）
   ↓
  #4 blocked-page  ← ここで公開先が実在する
   ↓
  #5 redirect-rules ← ここで「動くもの」が完成
   ↓
  #8 lint-typecheck → #9 ci         ← 全体に触るので直列
   ↓
  #10 blocklist-storage → #11 blocklist-ui → #12 schedule-blocking
   ↓
[main] #13 メッセージ契約を確定 → #14 と #15 を並行
   ↓
  #17 store-release
```

第一段階は直列で進める。並行させたくなったら、`blocked-page` と `redirect-rules` は影響範囲が分かれているので worktree を2つ作れる。

## 未解決の課題

issue で管理する。[`question` ラベル](https://github.com/yoshipon-tech/site-blocker/labels/question)を参照。

| 課題 | issue | 解くタイミング |
| ---- | ---- | ---- |
| URL の形（Pages のサブパスの扱い） | #3 | #4 の着手前 |
| `declarativeNetRequest` の種類と `host_permissions` の要否 | #6 | #5 の方針決め |
| 元URLに `#` や `&` が含まれる場合の挙動 | #7 | #5 の実装時に実ブラウザで確認 |
| `externally_connectable` とメッセージの契約 | #13 | #14・#15 の前 |
| カスタムドメインを使うか | #16 | #17 の前 |

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
