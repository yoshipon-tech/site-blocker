# issues

これから作る機能と未決事項を、1 issue = 1 ファイルで置く。

- **流れ・役割・`status`・テンプレートは skill にある。** メインは [`issue`](../.claude/skills/issue/SKILL.md)、サブは [`work`](../.claude/skills/work/SKILL.md)。どのリポジトリでも同じものを使う
- **このファイルには、このリポジトリ固有のことだけを書く。** skill と同じことを書き写さない
- 人がやることと流れの図は [docs/guide-parallel.md](../docs/guide-parallel.md)
- 順序と、いま並行できる組は [docs/guide-roadmap.md](../docs/guide-roadmap.md)

## 番号の扱い

`#12` のような番号は GitHub の issue・PR を指す。閉じた issue は [GitHub](https://github.com/yoshipon-tech/site-blocker/issues?q=is%3Aissue) に履歴として残している。ここに移した issue は、GitHub 側を閉じたときのコメントで移した先のファイルを案内している。

## 衝突しやすいファイル

| ファイル | 重なり方 |
| ---- | ---- |
| `pnpm-lock.yaml` | ルートに1つだけ。どちらかのアプリで依存を足すと書き換わる |
| ルートの `package.json`・設定ファイル | 共通スクリプトや lint 設定 |
| `.claude/`・`docs/guide-*.md`・`README.md` | 前提の更新。main で先に確定させる |

どうしても依存の追加を並べるなら、後からマージする側が `pnpm install` でロックファイルを作り直す（手で直さない）。

## このリポジトリでの手段

| 場面 | 手段 |
| ---- | ---- |
| spec を作る issue（`labels: [spec]`） | main で `/spec` を tasks まで作ってから `ready` にし、issue から spec を参照する |
| issue のコミット | `rule-git.md` に従う |
| workspace の作成 | Orca で作る。ブランチは `feat/<issue名>` |
| 確認 | `pnpm check`（push 前に husky も実行する）と、issue の「確認方法」 |
| レビュー | `review` スキルをサブエージェントで呼ぶ。`rule-review.md` の `MUST` を直す |
| 実装のコミット | `rule-git.md` に従う。scope は issue 名 |
| push | `git push -u origin <ブランチ>` |
| PR 作成 | `gh pr create --base main --title "<タイトル>" --body-file <本文ファイルの絶対パス>`。本文は `.github/pull_request_template.md` の項目で書く |

CI はまだ入れていない。Claude の PR レビューは、PR に `@claude` と書けば動く（`.github/workflows/claude.yml`）が、流れには組み込んでいない。
