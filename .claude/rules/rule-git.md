# Git ルール

コミット・ブランチ・プルリクを作るときに守ること。

## コミットメッセージ

Conventional Commits に従う。type と scope は英語、要約と本文は日本語。

```
<type>(<scope>): <要約>

<本文（任意）: なぜ変えたか>
```

- **type**: `feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `ci`
- **scope**: 機能に属する変更は機能名（= spec 名）。機能に属さない変更は変更場所で決める

  | scope        | 対象                                     |
  | ------------ | ---------------------------------------- |
  | `<機能名>`   | その機能の実装（例: `redirect-rules`）   |
  | `root`       | リポジトリ直下の設定                     |
  | `rules`      | `.claude/rules/`                         |
  | `ci`         | `.github/`                               |

- 要約は「〜する」の形で1行。末尾に句点を付けない
- 本文は簡潔に。書くのは「なぜ変えたか」だけで、変更内容を列挙しない（差分を見れば分かる）。3行以内に収め、要約だけで足りるなら本文を書かない
- 1コミット1目的。整形だけの変更は機能変更と混ぜない
- URL の契約（`/blocked#<元URL>`）を変える場合は本文にその旨を書く
- 機械的な強制（commitlint、Git フック、CI）は現時点ではしない

```
feat(redirect-rules): インストール時に dynamic ルールを登録する
fix(blocked-page): hash が空のときに元URL欄を表示しない
chore(monorepo-setup): pnpm workspace と apps の雛形を追加する
docs(rules): guide-tech.md に lint 方針を追記する
```

## ブランチ

- `main`: `.claude/rules/`・spec の確定と、各ブランチのマージ先
- 作業ブランチ: `<type>/<機能名>`（例: `feat/redirect-rules`）。方針を main で承認してから、機能ごとにブランチと worktree を作る

## プルリク

- タイトルはコミットと同じ形式・日本語
- 本文は `.github/pull_request_template.md` の項目（概要、関連spec）を埋める
