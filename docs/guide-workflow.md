# 開発の進め方

このリポジトリは Claude Code で開発する。**requirements → design → tasks → 実装**の仕様駆動開発で進める。

## 1. 考え方

いきなりコードを書かせるのではなく、**「何を作るか」→「どう作るか」→「どう分けて作るか」を文書にして、人が確認してから実装させる**。

```
/spec <機能名>
   requirements.md  何を満たすか   ← 確認
   design.md        どう作るか     ← 確認
   tasks.md         どう分けるか   ← 確認
   │
   ▼
/impl <機能名>
   タスクを上から実装 → タスクごとに実際に検証 → 次へ
   （コミットしない）
   │
   ▼
人が通しでコードをレビューしてコミット
```

- **人がやること**: 各段の文書を読んで意図と合っているか判断する。最後にコードを通しでレビューする
- **Claude がやること**: 文書の生成、実装、検証、レビュー
- 確認前の段に戻るのは安い。実装後に「そもそも要件が違った」と気づくのが一番高くつく

### cc-sdd（Kiro 形式）との違い

流れは同じだが、Kiro 固有の仕組みを外している。

| | cc-sdd | このリポジトリ |
| --- | --- | --- |
| 文書の置き場所 | `.kiro/specs/` | `docs/specs/` |
| 承認の記録 | `spec.json` の `approvals`。未承認だとコマンドが止まる | 会話で確認する。状態ファイルは持たない |
| コマンド数 | 17スキル | `spec` / `impl` の2つ（＋補助3つ） |
| 文書 | requirements / design / tasks / research | requirements / design / tasks（research は design に畳む） |
| 分量 | 制限なし（`monorepo-setup` で612行になった） | 80 / 150 / 100 行の上限 |
| 実装の単位 | タスクごとにレビュー→コミット | タスクごとに検証。コミットは最後に人が |

## 2. ファイルの置き場所

Claude Code が起動時に自動で読み込むもの。

| 場所 | 中身 |
| ---- | ---- |
| `CLAUDE.md` | 進め方のルール |
| `.claude/rules/guide-*.md` | 判断の前提になる知識・背景（製品・技術・構成） |
| `.claude/rules/rule-*.md` | 必ず守る作業ルール（コミット形式など） |

読み込まないもの。必要なときに読む。

| 場所 | 中身 |
| ---- | ---- |
| `docs/specs/<機能名>/` | `requirements.md` / `design.md` / `tasks.md` |
| `.claude/skills/spec/templates/` | 3文書のテンプレート |
| `.claude/skills/*/SKILL.md` | スキル本体 |

`.claude/rules/` に置いたものは**全文が毎回読まれる**。増やしすぎない（目安: 合計300行以内）。旧 `.kiro/steering/` をここへ移したのは、`.kiro/` は指示経由でしか読まれず、読まれない可能性があったため。

## 3. 全体の流れ

### ステップ 0: 前提を整える（変更があったときだけ）

製品・技術・構成の前提が変わったら `.claude/rules/guide-*.md` を直す。ここが間違っていると以降のすべての機能に波及する。分野別の前提（テスト方針など）は `guide-<分野>.md` を追加する。

### ステップ 1: spec を作る

```
/spec redirect-rules
```

3段を順に実行し、**各段の終わりで停止する**。直したい段があれば、その段だけ再実行できる。

```
/spec redirect-rules design    # design だけ作り直す
```

#### requirements で確認すること

- 欲しいものが漏れていないか、要らないものが入っていないか
- 「範囲外」が正しいか（別の機能でやることが混ざっていないか）
- 各要件が「できた / できていない」を判定できる書き方になっているか
- **「未決事項」に挙がった論点** — ここは Claude が勝手に決めず聞いてくる。答えるのは人

#### design で確認すること

- 「決定と理由」に納得できるか。却下した案とその理由が書かれているか
- 「変えるときの影響」が書かれているか（配布した拡張に焼き込まれる値など）
- 「他機能との境界」が正しいか（並行開発する機能とぶつからないか）
- **「検証方法」の割り当てが妥当か** — 回帰が要るものにブラウザ検証が割り当てられていないか

#### tasks で確認すること

- 1タスクが小さく、実装と検証がセットで終わる大きさか
- 全タスクに `_検証:_` が書かれているか
- 順序（依存関係）がおかしくないか。検証基盤を作るタスクが後ろに来ていないか
- すべての要件がどれかのタスクの `_要件:_` に現れているか

### ステップ 2: 実装

```
/impl redirect-rules          # 未完了タスクを全部
/impl redirect-rules 1.1 2.1  # 指定タスクだけ
```

タスクごとにこれを繰り返す。

```
実装 → _検証:_ を実際に実行 → 成功なら [x] を付けて次へ
                            → 失敗なら debug で原因調査 → 修正 → 再検証
                              （3回失敗したら停止して人に返す）
```

- **コミットしない。**差分は最後に通しでレビューする
- 全タスク完了後に `review` と `verify-completion` を通し、報告して停止する

### ステップ 3: レビューとコミット

Claude は止まったまま報告を出す。人がやること。

- `git diff` で変更を通しで読む
- ブラウザ検証で確認した内容の報告を読む（証拠が残らないのはここだけ）
- `review` の指摘と、対応 / 見送りの判断を確認する
- 問題なければ `.claude/rules/rule-git.md` に従ってコミットし、プルリクを出す

**注意**: タスクごとにコミットしないため、途中で壊れたときの切り戻し単位がない。タスク5で問題が出たら1〜4の成果ごと戻すことになる。気になる規模なら、途中で自分でコミットしておく。

## 4. 検証

`tasks.md` の `_検証:_` に手段を書き、`/impl` が実行する。

| 手段 | 使いどころ | 証拠 |
| ---- | ---------- | ---- |
| コマンド | 終了コードで判定できるもの（ビルド、テスト、`--frozen-lockfile`） | 残る |
| Playwright | 回帰させたいもの。リダイレクトの挙動、ブロック画面の表示 | テストとして残る |
| ブラウザ（chrome-devtools MCP） | 見た目や実挙動の初回確認 | 残らない。報告で言語化する |

このリポジトリで必ず Playwright に落とすもの。

- `/blocked/#<元URL>` という URL の形（拡張と Web をつなぐ唯一の契約）
- 元URLに `#` や `&` が含まれる場合の挙動

markdown に書いた仕様は古くなっても誰も気づかないが、テストは壊れて気づく。

### chrome-devtools MCP

`.mcp.json` で設定済み。初回は Claude Code の再起動と、サーバーを信頼するかの確認が要る。

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--categoryExtensions=true", "--isolated=true"]
    }
  }
}
```

| フラグ | 理由 |
| ------ | ---- |
| `--categoryExtensions=true` | 拡張ツール（`install_extension` / `list_extensions` など5つ）を有効にする。既定は無効 |
| `--isolated=true` | 一時プロファイルで起動する。普段の Chrome を汚さない。毎回拡張を読み込み直すことになる |

**拡張の読み込みには `install_extension` を使う。** chrome-devtools MCP は Chrome を `--disable-extensions` 付きで起動するため、`--chromeArg=--load-extension=...` を渡しても効かない。

```
apps/extension をビルド → .output/chrome-mv3/ の絶対パスを install_extension に渡す
→ list_extensions で確認 → 対象 URL へ遷移して挙動を見る
```

拡張ツールは**パイプ接続時のみ**動く。`--browserUrl` で起動中の Chrome に繋ぐ形では使えないので、MCP 側に Chrome を起動させる。

Playwright は MCP ではなくプロジェクトの開発依存として入れる（`monorepo-setup` の成果物）。テストは `pnpm test` で回す。

## 5. スキル

`.claude/skills/<name>/SKILL.md` に置く。

| スキル | 用途 | 呼ぶ人 |
| ------ | ---- | ------ |
| `spec` | requirements → design → tasks を作る | 人 |
| `impl` | tasks.md を実装し、検証まで回す | 人 |
| `review` | 実装を spec・スコープ・検証証拠に照らして敵対的にレビューする | `impl` |
| `debug` | 行き詰まったときに根本原因から調べる | `impl` |
| `verify-completion` | 完了・成功の主張の前に新しい証拠で確認する | `impl` |

## 6. 並行開発

並行は**機能単位**。機能は触るディレクトリ（影響範囲）で分ける。

| 機能 | 範囲 | 進め方 |
| ---- | ---- | ------ |
| `monorepo-setup` | リポジトリ直下の設定、`apps/*` の雛形 | 最初に main で実装まで終える |
| `redirect-rules` | `apps/extension` | worktree で並行 |
| `blocked-page` | `apps/web`, `.github/workflows` | worktree で並行 |

```
1. main で monorepo-setup を実装まで完了
2. main で redirect-rules と blocked-page の spec を tasks まで作る
3. 機能ごとにブランチと worktree を作る
     git worktree add ../site-blocker-wt/redirect-rules -b feat/redirect-rules
     cd ../site-blocker-wt/redirect-rules && pnpm install
4. それぞれの worktree で /impl <機能名>
5. プルリクを出して main にマージ
```

- `.claude/rules/`・spec・URL の契約（`/blocked/#<元URL>`）は分岐前に main で確定させる
- 実装中に spec を変えたくなったら、main で直してから各ブランチに取り込む
- `pnpm-lock.yaml` が衝突したら手で直さず、マージ後に `pnpm install` で作り直す
- `tasks.md` の `_並行: 不可_` は**同一機能内のタスクの順序制約**であり、worktree の単位ではない

## 7. よくある迷い

**Q. 要件と設計の境目がわからない**
要件は「何ができればいいか」（例: ルートで一括 lint できる）、設計は「何を使ってどう実現するか」（例: Biome を使い、ルートの `package.json` にスクリプトを置く）。ツール名が出てきたら設計の話。

**Q. 生成された文書が長くて読みきれない**
上限（80 / 150 / 100 行）を超えていれば、それ自体が差し戻しの理由になる。範囲内なら、各ステップの「確認すること」だけ見て、違和感があれば理由を聞く。

**Q. 途中で方針を変えたい**
一番前の影響する段に戻る。要件が変わるなら requirements から、ツール選定だけなら design から直し、以降を作り直す。

**Q. `.claude/rules/` と spec のどちらに書く？**
複数の機能に共通する前提は `.claude/rules/`、その機能だけの話は spec。

**Q. 未決事項を聞かれたが判断できない**
そこが決まらないと design に進めない論点なので、調べるか、決めなくていい形に要件を変える（「今は決めない」を範囲外に書く）。Claude に決めさせない。

## 8. 注意点

- APIキーなどの秘密情報は文書・コミットに含めない
- `.claude/rules/` は毎回のコンテキストを消費する。長くなってきたら分割ではなく削減を考える
