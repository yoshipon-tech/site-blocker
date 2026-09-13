# Git ルール

コミット・ブランチ・プルリクを作るときに守ること。

## コミットメッセージ

Conventional Commits に従う。type と scope は英語、要約と本文は日本語。

```
<type>(<scope>): <要約>

<本文（任意）: なぜ変えたか>
```

- **type**: `feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `ci`
- **scope**: spec に属する変更は spec 名（`/kiro-impl` のコミット形式 `feat(<feature-name>): ...` と揃える）。spec に属さない変更は変更場所で決める

  | scope        | 対象                                     |
  | ------------ | ---------------------------------------- |
  | `<spec名>`   | その spec の実装（例: `redirect-rules`） |
  | `root`       | リポジトリ直下の設定                     |
  | `steering`   | `.kiro/steering/`                        |
  | `ci`         | `.github/`                               |

- 要約は「〜する」の形で1行。末尾に句点を付けない
- 1コミット1目的。整形だけの変更は機能変更と混ぜない
- URL の契約（`/blocked#<元URL>`）を変える場合は本文にその旨を書く
- 機械的な強制（commitlint、Git フック、CI）は現時点ではしない

```
feat(redirect-rules): インストール時に dynamic ルールを登録する
fix(blocked-page): hash が空のときに元URL欄を表示しない
chore(monorepo-setup): pnpm workspace と apps の雛形を追加する
docs(steering): guide-tech.md に lint 方針を追記する
```

## ブランチ

- `main`: steering・spec の確定と、各ブランチのマージ先
- 作業ブランチ: `<type>/<spec名>`（例: `feat/redirect-rules`）。spec を main で承認してから、spec ごとにブランチと worktree を作る

## プルリク

- タイトルはコミットと同じ形式・日本語
- 本文は `.github/pull_request_template.md` の項目（概要、関連spec/タスク）を埋める
