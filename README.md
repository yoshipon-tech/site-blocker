# site-blocker

指定したサイトを開くと、ブロック画面へリダイレクトする Chrome 拡張。

> 設計段階です。まだ実装はありません。

## 仕組み

拡張は「止める」だけ、Web は「見せる」だけに役割を分けています。

| 役割 | 担当                           | やること                                           |
| ---- | ------------------------------ | -------------------------------------------------- |
| 拡張 | どこをブロックするか           | ブロックリストを持ち、リダイレクトルールを登録する |
| Web  | ブロックされた後に何を見せるか | 元のURLを受け取って表示する                        |

```
ユーザーが x.com を開く
  │
  ▼
拡張: declarativeNetRequest の redirect ルールに一致
  │
  ▼
https://<GitHub Pages>/blocked#https://x.com/home
  │
  ▼
Web: location.hash を読んで表示
```

拡張と Web をつなぐ契約は `/blocked#<元URL>` という URL の形だけです。

### リダイレクトルール

`regexFilter` のマッチ全体（`\0`）を `regexSubstitution` でフラグメントに埋め込みます。

```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "regexSubstitution": "https://<GitHub Pages>/blocked#\\0" }
  },
  "condition": {
    "regexFilter": "^https?://([^/]*\\.)?x\\.com/.*",
    "resourceTypes": ["main_frame"]
  }
}
```

- クエリ（`?from=\0`）ではなくフラグメントにするのは、置換結果が URL エンコードされず、元URLに `&` や `#` があるとクエリが壊れるため
- `resourceTypes` を `main_frame` に絞り、iframe や画像はリダイレクトしない
- `redirect` は非セーフなルールとして dynamic ルールの 5,000 件枠に数えられる（正規表現ルールは 1,000 件まで）
- ブロック画面では `location.hash` をテキストとして表示し、HTML として埋め込まない

### プライバシー

開こうとした URL は `#` 以降（フラグメント）でブロック画面に渡します。フラグメントはサーバに送信されないため、閲覧先の URL がホスティング側のアクセスログに残りません。

## 技術構成

| 項目               | 採用                                       | 理由                                                                   |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| ブロック方法       | `declarativeNetRequest` の dynamic ルール   | ページの読み込み前に止まる。実行時にルールを書き換えられる             |
| 拡張のビルド       | [WXT](https://wxt.dev/)（Manifest V3）      | `entrypoints/` の構成から manifest を生成でき、手で書く設定が少ない     |
| ブロック画面       | Vite + React                                | ビルド結果は静的ファイルなので GitHub Pages にそのまま置ける           |
| ホスティング       | GitHub Pages                                | 画面の変更をデプロイだけで反映でき、拡張の更新やストア審査を待たなくてよい |
| リポジトリ         | pnpm workspace のモノレポ                   | 拡張とブロック画面を1つのリポジトリで管理する                          |

```
site-blocker/
├── .claude/rules/          前提（guide-*）と作業ルール（rule-*）
├── .claude/skills/         review / debug / verify-completion
├── docs/specs/             機能ごとの spec
├── .github/workflows/      apps/web を GitHub Pages へ公開
├── pnpm-workspace.yaml
├── package.json
└── apps/
    ├── extension/          WXT（Manifest V3）
    └── web/                Vite + React
```

## ロードマップ

### 第一段階

- `apps/extension`: コードに書いたブロックリストを、インストール時に dynamic ルールとして登録する
- `apps/web`: `/blocked` で元URLを表示し、GitHub Pages に公開する
- 拡張は開発者モードで読み込む

### 次段階以降

- ポップアップかオプションページからブロックリストを編集する
- 時間帯・曜日によるブロック
- 一時解除（「5分だけ開く」）
- Chrome ウェブストアでの公開

## 開発の進め方

Claude Code で進めます。詳しい手順は [docs/guide-workflow.md](docs/guide-workflow.md) を参照してください。

```
/spec <機能名>   requirements → design → tasks   各段で停止・確認
/impl <機能名>   タスクを実装し、都度検証        コミットはしない
人がレビュー     通しで差分を読んでコミット
```

- 各段は人が確認してから次に進みます
- 実装はタスクごとに実際に検証します（コマンド / Playwright / ブラウザ）
- 機能は触るディレクトリ（影響範囲）で分けます

  | 機能             | 範囲                              |
  | ---------------- | --------------------------------- |
  | `redirect-rules` | `apps/extension`                  |
  | `blocked-page`   | `apps/web`, `.github/workflows`   |

### git worktree による並行開発

方針を main で承認したあと、機能ごとにブランチと worktree を作って並行で実装します。

```bash
git worktree add ../site-blocker-wt/redirect-rules -b feat/redirect-rules
cd ../site-blocker-wt/redirect-rules && pnpm install
```

- `.claude/rules/`・spec・URL の契約は分岐前に main で確定させる
- 実装中に方針を変えたくなったら main で直してから各ブランチに取り込む
- `pnpm-lock.yaml` が衝突したら手で直さず、マージ後に `pnpm install` で作り直す

## 未解決の課題

| 課題                                                                                                   | 解くタイミング                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `redirect` ルールに `host_permissions` が要るか。`declarativeNetRequest` と `declarativeNetRequestWithHostAccess` のどちらにするか | `redirect-rules` の方針決め    |
| 元URLにすでに `#` が含まれる場合も、フラグメント渡しが意図どおり動くか                                  | `redirect-rules` の実装時に手動確認 |
| カスタムドメインを使うか。リダイレクト先URLは配布した拡張に埋め込まれるため、後から変えると古い拡張が壊れる | ストア公開の前                 |
| ストア公開に必要なもの（プライバシーポリシー、掲載情報）と、ブロックリスト編集UI                        | ストア公開の段階の spec        |
| 一時解除などで Web から拡張を操作する場合の `externally_connectable` とメッセージの形                    | 該当機能の spec の前に `.claude/rules/` へ追加 |
| テストフレームワーク                                                                                   | `monorepo-setup` の design     |
| lint / format / 型チェックの共通設定と一括実行（命名規則・パスエイリアスを含む）                        | 別の spec                      |
| プルリクや push で自動チェックする CI                                                                  | 別の spec                      |

## 必要環境

- [mise](https://mise.jdx.dev/)（`mise install` で `mise.toml` に固定した Node.js 26 系と pnpm が入る）
- Chrome
