# Technology Stack

## Architecture

Chrome 拡張と、静的サイトとして公開するブロック画面の2つに分け、URL の形だけでつなぐ。

```
ユーザーが x.com を開く
  → 拡張: declarativeNetRequest の redirect ルールに一致
  → https://yoshipon-tech.github.io/site-blocker/blocked/#https://x.com/home
  → Web: location.hash を読んで表示
```

- **拡張（`apps/extension`）**: ブロックリストを持ち、リダイレクトルールを登録する。表示の責務は持たない
- **Web（`apps/web`）**: 受け取った元URLを表示する。ブロック判定の責務は持たない
- **契約**: 両者の間のインターフェースは上記 URL の形のみ。これを変える場合は両側の spec を同時に見直す

### URL の契約

| 項目 | 決めたこと |
| ---- | ---------- |
| オリジン | `https://yoshipon-tech.github.io`（GitHub Pages の既定ドメイン。カスタムドメインは公開前に判断する） |
| ベースパス | `/site-blocker/`（リポジトリ名。`apps/web` の Vite `base` に設定する） |
| ブロック画面のパス | `/blocked/`（**末尾スラッシュ付き**。`blocked/index.html` として出力する） |
| 元URL | フラグメントに**エンコードせず**そのまま置く。`regexSubstitution` は `#\0` |

- 拡張は末尾スラッシュ付きの URL を指す。スラッシュ無しだと GitHub Pages が 301 リダイレクトするため、1ホップ無駄になる
- Web 側は `location.hash` の先頭 `#` を落として元URLとして扱う。元URLに `#` が含まれていても、`location.hash` は最初の `#` 以降すべてを返すので復元できる
- ルート（`/site-blocker/`）はブロック画面が占有しない。プライバシーポリシーなど公開時に必要なページを後から置けるようにするため
- **この URL は配布した拡張に埋め込まれる。** 公開後に変えると、更新していないユーザーの拡張が古い URL を指し続ける

## Core Technologies

- **Language**: TypeScript 6 系（typescript-eslint が 7 系に未対応のため。対応したら全体を 7 系に上げる）
- **Extension**: [WXT](https://wxt.dev/)（Manifest V3）
- **Block page**: Vite + React（ビルド結果を静的サイトとして公開する）
- **Hosting**: GitHub Pages
- **Runtime**: Node.js 26 系（2026年10月に Active LTS になる予定の系列）
- **Package manager**: pnpm の最新版（workspace によるモノレポ）

## Key Libraries

- WXT: `entrypoints/` の構成から manifest を生成する。manifest は手で書かず WXT の設定で表現する
- Vite + React: ブロック画面を構築する。ビルド結果は静的ファイルなので GitHub Pages にそのまま置ける

## Development Standards

### Testing
- `declarativeNetRequest` の挙動（元URLに `#` を含む場合など）は、実ブラウザでの手動確認を併用する

### Security
- ブロック画面では `location.hash` をテキストとして表示し、HTML として埋め込まない

## Development Environment

### Required Tools
- mise（Node.js と pnpm のバージョンをリポジトリ直下の `mise.toml` で固定する。上げるときは `mise.toml` を更新してコミットする）
- Chrome（拡張は開発者モードで読み込む）

### Common Commands
```bash
# Tools: mise install
# Install: pnpm install
# Build all: pnpm build
# Test all: pnpm test
# Type check: pnpm typecheck
# Lint: pnpm lint（ESLint）/ pnpm lint:workflows（actionlint）
# Format: pnpm format（確認だけなら pnpm format:check。Markdown は対象外）
# All checks: pnpm check（push 前に husky が自動で実行する）
# Single app: pnpm --filter @site-blocker/extension run build（web は @site-blocker/web）
```

## Key Technical Decisions

- **`declarativeNetRequest` の dynamic ルール**: ページ読み込み前に止まり、実行時にルールを書き換えられる。`redirect` は非セーフルールとして 5,000 件枠に数えられ、正規表現ルールは 1,000 件まで
- **`regexSubstitution` でフラグメントに埋め込む**: クエリ（`?from=\0`）だと置換結果が URL エンコードされず、元URLの `&` や `#` で壊れるため `#\0` にする
- **`resourceTypes` は `main_frame` のみ**: iframe や画像はリダイレクトしない
- **Node.js は LTS の系列を使う**: まもなく Active LTS になる 26 系を先に採用する。以降も LTS が次の系列に切り替わったら、実行環境の前提をあわせて上げる
- **ブロック画面を拡張に同梱しない**: 表示の変更をストア審査なしで反映するため GitHub Pages に置く。代わりにリダイレクト先URLが配布済み拡張に埋め込まれるので、ドメインを後から変えると古い拡張が壊れる

---
_Document standards and patterns, not every dependency_
