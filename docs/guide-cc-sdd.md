# cc-sdd による開発の進め方

このリポジトリは [cc-sdd](https://github.com/gotalab/cc-sdd)（v3.0.2）を使った **仕様駆動開発（Spec-Driven Development）** で進める。このドキュメントは「何から始めて、どこで何を確認すればいいか」を順番に説明する。

## 1. 考え方

いきなりコードを書かせるのではなく、**「何を作るか」→「どう作るか」→「どう分けて作るか」を文書にして、人が承認してから実装させる**。

```
steering（プロジェクト全体の前提）
   │  すべての spec が参照する
   ▼
spec（機能ごとの仕様）
   requirements.md  何を満たすか   ← 人が承認
   design.md        どう作るか     ← 人が承認
   tasks.md         どう分けるか   ← 人が承認
   │
   ▼
実装（Claude がタスクを1つずつ実装・レビュー・コミット）
```

- **人がやること**: 各段階の文書を読んで、意図と合っているか判断し、承認する
- **Claude がやること**: 文書の生成、実装、実装のレビュー、コミット
- 承認前の段階に戻るのは安い。実装後に「そもそも要件が違った」と気づくのが一番高くつく

## 2. ファイルの置き場所

| 場所 | 中身 | 誰が読むか |
| ---- | ---- | ---------- |
| `.kiro/steering/guide-*.md` | プロジェクト全体の前提（製品・技術・構成） | kiro コマンド |
| `.kiro/specs/<spec名>/` | spec ごとの `spec.json`・requirements・design・tasks | kiro コマンド、人 |
| `.kiro/settings/templates/` | 上記の文書の型（見出し構成） | kiro コマンド（生成時） |
| `.claude/rules/rule-*.md` | 必ず守る作業ルール（コミット形式など） | Claude Code（毎回） |
| `.claude/skills/kiro-*/` | kiro コマンド本体 | Claude Code |

- `settings/templates/` と `.claude/skills/` は普段触らない
- ファイル名のプレフィックス: `guide-` は知識・背景、`rule-` は守るべきルール

## 3. 全体の流れ

### ステップ 0: steering を整える（プロジェクトで最初に1回）

```
/kiro-steering
```

- `guide-product.md`（何のためのプロダクトか）、`guide-tech.md`（技術と判断理由）、`guide-structure.md`（ディレクトリの分け方）ができる
- 2回目以降に実行すると、コードとのずれを検出して追記を提案する
- テスト方針など分野別の前提は `/kiro-steering-custom` で `guide-<分野>.md` を追加する

**確認すること**: 書かれている前提が自分の認識と合っているか。ここが間違っていると、以降のすべての spec に波及する。

### ステップ 1: spec を作る

```
/kiro-spec-init "何を作りたいかの説明"
```

- `.kiro/specs/<spec名>/` に `spec.json` と `requirements.md`（説明文だけの下書き）ができる
- 説明には「誰が困っているか・現状・何を変えるか」を含める

### ステップ 2: 要件（requirements）

```
/kiro-spec-requirements <spec名>
```

- 「〜のとき、〜しなければならない」という形式（EARS）で、満たすべき条件が並ぶ
- ツール名や実装方法はここでは決めない（それは design の仕事）

**確認すること**
- 欲しいものが漏れていないか、要らないものが入っていないか
- 範囲外のもの（別 spec でやること）が混ざっていないか
- 各要件が「できた/できていない」を判定できる書き方になっているか

直したい場合は、指摘を伝えて同じコマンドを再実行する。問題なければ **承認** する（→ 5章）。

### ステップ 3: 設計（design）

```
/kiro-spec-design <spec名>
```

- `design.md`（どう作るか）と `research.md`（調べたことの記録）ができる
- ライブラリ・ツールの選定、ファイル構成、責務の境界（どこまでがこの spec の担当か）が書かれる
- 必要なら `/kiro-validate-design <spec名>` で設計レビューを受けられる

**確認すること**
- 採用したツールや構成に納得できるか。理由が書かれているか
- 「この spec の範囲外」とされたものが正しいか（並行開発する他の spec とぶつからないか）
- 要件のすべてが設計のどこかで扱われているか

### ステップ 4: タスク（tasks）

```
/kiro-spec-tasks <spec名>
```

- `tasks.md` に `1.1`, `1.2` … と番号付きのタスクが並ぶ。並行できるものには `(P)` が付く
- 生成後に「承認しますか？」と聞かれるので、その場で答える

**確認すること**
- 1タスクが小さく、レビューできる大きさか
- 順番（依存関係）がおかしくないか
- すべての要件がどれかのタスクに対応しているか

### ステップ 5: 実装

```
/kiro-impl <spec名>              # 未完了タスクを全部、自動で順に
/kiro-impl <spec名> 1.1 1.2      # 指定タスクだけ
```

自動モードでは、タスク1つごとに次を繰り返す。

```
実装担当のサブエージェントが実装（テストを先に書く）
  → 別のレビュー担当が spec と照らしてレビュー
  → 通れば tasks.md に [x] を付けてコミット
  → 次のタスクへ
```

- レビューに通らないと完了にならない。行き詰まると原因調査（`kiro-debug`）に入り、それでも無理なら人に判断を返してくる
- 最初は番号指定で1〜2タスクずつ進め、結果を見ながら慣れるのがおすすめ

**確認すること**: コミットごとの差分。生成結果は必ず自分でレビューしてから main に入れる。

### ステップ 6: 仕上げの検証

```
/kiro-validate-impl <spec名>
```

- 全タスク完了後に、タスク間の整合性・テスト・要件の網羅を spec 全体で確認する

## 4. いつでも使うコマンド

| コマンド | 用途 |
| -------- | ---- |
| `/kiro-spec-status <spec名>` | 今どの段階か、何が承認済みか、タスクの進み具合 |
| `/kiro-spec-quick "説明"` | init から tasks までを続けて実行（段階ごとに確認あり）。慣れてから使う |
| `/kiro-discovery "アイデア"` | 何を作るか自体が曖昧なとき。複数 spec に分けるなら `roadmap.md` まで作る |
| `/kiro-spec-batch` | `roadmap.md` の複数 spec をまとめて作る |

## 5. 承認のしくみ

承認状態は `.kiro/specs/<spec名>/spec.json` の `approvals` に記録される。次の段階のコマンドは、前の段階が承認済みでないと止まる。

```json
"approvals": {
  "requirements": { "generated": true, "approved": true },
  "design":       { "generated": true, "approved": false },
  "tasks":        { "generated": false, "approved": false }
}
```

- **requirements / design**: 文書を読んで問題なければ、`approved` を `true` にする（自分で書き換えるか、Claude に「requirements を承認して」と頼む）。その後、次のコマンドを実行する
- **tasks**: `/kiro-spec-tasks` の最後にその場で聞かれる
- **`-y` オプション**: 前段階を自動承認して進む。このリポジトリでは **使わない**（各段階を人が確認する方針）
- 承認後に直したくなったら、該当の文書を直して再承認し、後ろの段階（design や tasks）も作り直す

## 6. このリポジトリでの並行開発

spec は **触るディレクトリ（影響範囲）** で分ける。

| spec             | 範囲 | 進め方 |
| ---------------- | ---- | ------ |
| `monorepo-setup` | リポジトリ直下の設定、`apps/*` の雛形 | 最初に main で実装まで終える |
| `redirect-rules` | `apps/extension` | worktree で並行 |
| `blocked-page`   | `apps/web`, `.github/workflows` | worktree で並行 |

```
1. main で monorepo-setup を requirements → design → tasks → 実装まで完了
2. main で redirect-rules と blocked-page を tasks の承認まで進める
3. spec ごとにブランチと worktree を作る
     git worktree add ../site-blocker-wt/redirect-rules -b feat/redirect-rules
     cd ../site-blocker-wt/redirect-rules && pnpm install
4. それぞれの worktree で /kiro-impl <spec名>
5. プルリクを出して main にマージ
```

- steering・spec・URL の契約（`/blocked#<元URL>`）は分岐前に main で確定させる
- 実装中に spec を変えたくなったら、main で直してから各ブランチに取り込む
- `pnpm-lock.yaml` が衝突したら手で直さず、マージ後に `pnpm install` で作り直す
- コミット・ブランチ・プルリクの形式は `.claude/rules/rule-git.md` に従う

## 7. よくある迷い

**Q. 要件と設計の境目がわからない**
要件は「何ができればいいか」（例: ルートで一括 lint できる）、設計は「何を使ってどう実現するか」（例: Biome を使い、ルートの `package.json` にスクリプトを置く）。ツール名が出てきたら設計の話。

**Q. 生成された文書が長くて読みきれない**
全部を精読しなくてよい。各ステップの「確認すること」だけ見て、違和感があれば Claude に「この要件はなぜ必要？」と聞く。

**Q. 途中で方針を変えたい**
一番前の影響する段階に戻る。要件が変わるなら requirements から、ツール選定だけなら design から直し、以降を作り直す。

**Q. steering と spec のどちらに書くべき？**
複数の spec に共通する前提は steering、その機能だけの話は spec。

## 8. 注意点

- `.claude/skills/kiro-*` の steering ファイル名は `guide-` 付きに書き換えてある。cc-sdd を更新・再インストールすると元の名前（`product.md` など）に戻るので、その場合は置換し直す
- APIキーなどの秘密情報は steering・spec・コミットに含めない
