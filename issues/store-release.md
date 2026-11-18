---
status: backlog
labels: [spec]
---

# spec: store-release — Chrome ウェブストアで公開する

## 範囲

`apps/extension`, docs

## やること

- 掲載情報（説明文・カテゴリなど）。プライバシーポリシーのページは [privacy-page](privacy-page.md) で作る
- 拡張のアイコン（16 / 32 / 48 / 128px）。今はアイコンがなく、デザインシステム Dawn にもまだない
- ストア用のスクリーンショット（ブロック画面・ポップアップ）
- カスタムドメインの最終決定（[custom-domain](custom-domain.md)）
- 拡張の version 運用を決める

`apps/extension/package.json` の `version` は WXT が manifest に流し込む。開発中は `0.0.0` のままでよいが、**ストアはアップロードのたびに前回より大きい version を要求する**ので、ここで運用（手動で上げるか、タグや CI から流すか）を決める。

前提: [custom-domain](custom-domain.md), [privacy-page](privacy-page.md)
