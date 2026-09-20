# Technology Stack

## Architecture

Chrome 拡張と、静的サイトとして公開するブロック画面の2つに分け、URL の形だけでつなぐ。

```
ユーザーが x.com を開く
  → 拡張: declarativeNetRequest の redirect ルールに一致
  → https://<GitHub Pages>/blocked#https://x.com/home
  → Web: location.hash を読んで表示
```

- **拡張（`apps/extension`）**: ブロックリストを持ち、リダイレクトルールを登録する。表示の責務は持たない
- **Web（`apps/web`）**: 受け取った元URLを表示する。ブロック判定の責務は持たない
- **契約**: 両者の間のインターフェースは `/blocked#<元URL>` という URL の形のみ。これを変える場合は両側の spec を同時に見直す

## Core Technologies

- **Language**: TypeScript
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
