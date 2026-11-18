---
name: issue
description: 並行開発のメイン（設計室）として issues/ の issue ファイルを書く。思いつきを backlog に積む、相談して方針を固めた issue を ready の作業指示書に書き直す、マージ後に done にする。実装はしない。
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion
argument-hint: <issue名> [backlog|ready|done]
---

# issue

## 概要

並行開発のメイン（設計室）として、`issues/<issue名>.md` を書く。**実装はしない。**サブ（現場）は `work` スキルでこの issue を実装する。

リポジトリ固有のこと（衝突しやすいファイル、spec を作る issue の扱い、コミットの scope など）は `issues/README.md` にある。開始前に必ず読む。

## 全体の流れ

流れの図と、人間がやることは `docs/guide-parallel.md` にある。人に流れを説明するときはそこを示す。

| 役割 | 動く場所 | やること | やらないこと |
| ---- | ---- | ---- | ---- |
| メイン | main | 相談して方針を固める。issue を書き、`status` を変える。コミットは `done` のときにまとめる | 実装 |
| サブ | worktree | `ready` の issue を1つ実装し、レビューしてコミットし、報告する | issue ファイルの編集、push、PR の作成 |
| 人間 | ターミナル | issue の確認、workspace の作成、push・PR・マージ、worktree の削除 | — |

## issue ファイル

- `issues/<kebab-case の要約>.md`。**1 issue = 1 ファイル**で、番号は振らない
- issue 同士はファイルへのリンクで参照する
- spec がある機能は issue から spec を参照する。issue に設計を書き写さない
- 議論の経緯は本文の末尾の「経緯」に日付つきで足す
- 先頭に frontmatter を置く（`status` と `labels`）

| `status` | 意味 | サブに渡すか | いつ変えるか |
| ---- | ---- | ---- | ---- |
| `backlog` | 思いつき・未決。書き方は自由 | 渡さない | 積むとき |
| `ready` | 方針が固まり、[templates/issue.md](templates/issue.md) の形に書き直した作業指示書。1つの worktree で完結する | 渡せる | 相談して方針を固めたとき |
| `done` | マージ済み。ファイルは消さずに残す | — | 人間がマージしたあと |

`labels` は `spec`（spec を作る単位）と `question`（決めることがある）。どちらでもなければ `[]`。

## 引数

| 形 | 動作 |
| -- | ---- |
| `<issue名>` | ファイルがなければ `backlog` で作る。あれば読んで、次に何を決めるかを示す |
| `<issue名> ready` | 方針を相談し、固まったらテンプレートの形に書き直す |
| `<issue名> done` | マージを確認して `done` にする |

## 開始前に必ずやること

1. `issues/README.md` を読む
2. `git branch --show-current` が `main` であることを確認する。違えば止まって人に聞く
3. 対象の issue と、`status: ready` の issue をすべて読む（走っているレーンを把握する）

## backlog に積む

- 書き方は自由。分かっていることと、決めることを分けて書く
- 依存する issue があればリンクする

## ready にする

1. **決めることを人に聞く。** issue の「決めること」や、解釈が分かれて成果物が変わる点は勝手に決めない。AskUserQuestion で1つずつ確認する
2. `issues/README.md` に spec を作る issue の扱いが書いてあれば、それに従う（spec を先に作る、など）
3. [templates/issue.md](templates/issue.md) の形に書き直す
   - 「範囲」は、触ってよいファイルと触らないものをパスで書く
   - 「完了条件」は、サブが自分で確かめられる形にする
   - 「確認方法」は、実際に走らせるコマンドやテストを書く
   - 「迷ったら」には、サブに決めさせず聞かせたいことを書く
   - 元の本文で残したい経緯は「経緯」に移す
4. **範囲の重なりを確かめる**
   - ほかの `ready` の issue の「触ってよいファイル」と1つでも重なるなら、人に報告して待つ
   - `issues/README.md` の「衝突しやすいファイル」は、同時に走る issue のうち1つだけに許可するか、すべての issue で「触らないもの」に入れる
   - 依存の追加（ロックファイルの更新）が要る issue は、ほかと同時に走らせない
   - 共有する前提（ルール、契約、spec）が要るなら、先に main で確定させる
5. `status: ready` にして人に見せ、確認を待つ
6. 人が了承したら、サブに渡せる状態になったと伝える。**コミットは要らない。**サブは main の作業ツリーの issue を直接読むので、書き換えはそのまま見える。だから、サブに渡したあとに書きかけの状態で保存しない

報告の最後に、人が workspace を作るときに要るもの（ブランチ名、サブに渡す最初の一言 `/work <issue名>`）を書く。

## done にする

1. 人がマージしたことを確認する（`git log` に該当の変更が main に入っていること）
2. `status: done` にし、「経緯」にマージした日付を足す
3. まだコミットしていない issue の書き換えをまとめて main にコミットする（`issues/README.md` のコミットの決まりに従う）。push はしない

## 禁止事項

- 実装しない（`issues/` と、方針の確定に要る文書以外を変更しない）
- 決めることを人に聞かずに `ready` にしない
- 範囲が重なる issue を `ready` のまま並べない
- push・PR の作成をしない
