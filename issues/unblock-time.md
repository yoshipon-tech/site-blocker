---
status: backlog
labels: [question]
---

# ブロック画面に解除時刻を渡す方法を決める

デザインシステム Dawn には、解除までの残り時間（Countdown）と、残り時間に応じて昇る太陽（Horizon）がある。しかし今の URL の契約（`/site-blocker/blocked/#<元URL>`）では、ブロック画面に解除時刻を渡せない。

時間帯ブロック（[schedule-blocking](schedule-blocking.md)）で、初めて「いつ開けるようになるか」が決まる。リダイレクト先の URL は配布した拡張に埋め込まれるので、ストア公開の前に決める。

## 決めること

- そもそも渡すか（渡さないなら、ブロック画面は今のまま残り時間を出さない）
- 渡し方（URL に含めるか、ブロック画面から拡張に問い合わせるか）。URL に含める場合、元URLに `#` が含まれても壊れない形にする
- ブロック画面側の改修を、blocked-page の追加の spec にするか

## 成果物

`.claude/rules/guide-tech.md` の URL の契約に追記して、main で確定させる。

解くタイミング: [schedule-blocking](schedule-blocking.md) の design の前

## 経緯

- 2026-10-04: [schedule-blocking](schedule-blocking.md) で、ブロックする時間帯はユーザーが定義し、ブロックリスト全体に1つ（サイトごとには設定しない）と決めた。解除時刻はサイトによらず「今の時間帯の終わり」1つになるので、渡すならサイトごとの値ではなく1つの時刻でよい。
