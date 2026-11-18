---
status: backlog
labels: [spec]
---

# spec: privacy-page — ルートにプライバシーポリシーを置く

## 範囲

`apps/web`

## やること

ルート（`/site-blocker/`）にプライバシーポリシーのページを置く。Chrome ウェブストアの掲載にプライバシーポリシーの URL が要る。

- ルートは、公開時に必要なページのためにブロック画面が占有していない（`guide-tech.md`）
- 書くこと: ブロックリストは端末の中だけに保存すること、元URLはフラグメントで渡すのでホスティング側のアクセスログに残らないこと、など

[store-release](store-release.md) から切り出した（`apps/web` を触るため、1 spec = 1 影響範囲に合わせる）。

前提: [custom-domain](custom-domain.md)（掲載する URL のドメインが決まってから）
