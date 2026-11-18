---
status: backlog
labels: [question]
---

# 並行開発の流れに合わせて、不要になった skill と rules を整理する

`issue` / `work` スキルで並行開発する流れを入れた。この流れで実際に回して問題がなければ、それ以前の仕様駆動の流れ（`spec` → `impl`）のために作った skill と rules のうち、使わなくなったものを消す。

## 着手の条件

- 並行開発を1回通しで回し終えている（`ready` → `work` → PR → マージ → `done`）。候補は [schedule-blocking](schedule-blocking.md) と [privacy-page](privacy-page.md) の2レーン（[docs/guide-roadmap.md](../docs/guide-roadmap.md)）
- 回した中で `issue` / `work` スキルを直したいところがあれば、先に直してから着手する

## 分かっていること

| 対象 | 今の使われ方 | 気になる点 |
| ---- | ---- | ---- |
| `impl` スキル | `work` が spec の tasks を実装するときに呼ぶ | `work` と役割が重なる。「コミットしない」「並行開発」の節が `work` の流れと食い違う |
| `spec` スキル | `labels: [spec]` の issue を `ready` にする前に main で使う | issue の `ready` と spec の3文書のどちらに設計を書くかが二重になりうる |
| `review` スキル | `work` がサブエージェントで呼ぶ | cc-sdd の名残がある（`_Boundary:_`、`READY_FOR_REVIEW`、controller）。tasks の書式は `_範囲:_` なので用語が合っていない。入力が tasks.md 前提で、issue を入力にする想定がない |
| `debug` スキル | `impl` と `work` が呼ぶ | 消す候補ではない。`impl` を消すなら呼び出し元の記述を直す |
| `verify-completion` スキル | `impl` が呼ぶ。`work` は呼んでいない | `impl` を消すと呼び出し元がなくなる。`work` の「確認」に組み込むか消すか |
| `rule-review.md` | レビュー指摘の形式 | 「`review` スキルとの対応」の節が、`review` の重大度の語に依存している |
| `guide-product.md`・`guide-tech.md`・`guide-structure.md`・`rule-git.md` | 判断の前提とコミット形式 | 流れに依存しないので残す見込み |

skill や rules を消すと、参照している文書も直す必要がある。`CLAUDE.md`（フロー・スキル一覧）、`docs/guide-workflow.md`（cc-sdd との比較、spec と impl の手順）、`README.md`（開発の進め方）。

## 決めること

- 仕様駆動（requirements / design / tasks）を続けるか。続けるなら `spec` は残し、issue と spec のどちらに何を書くかを分ける。やめるなら、issue の `ready` を設計の置き場所にする
- `impl` を消して `work` に寄せるか、`work` から呼ぶ部品として残すか
- `review` を消すか、issue を入力にする形に書き直すか（`work` のレビューの手段なので、消すなら代わりが要る）
- `verify-completion` を `work` に組み込むか、消すか
- 完了済みの `docs/specs/` を残すか（記録として残す見込み）
- 整理したあとの skill を、ほかのリポジトリにどう展開するか（`~/.claude/skills/` に移す、plugin にする）。この issue でやるか、別の issue に切るか

## 経緯

- 2026-11-18: 並行開発のための `issue` / `work` スキルを作ったときに、並行開発を試して問題がなければ古い skill と rules を整理する、と決めた
