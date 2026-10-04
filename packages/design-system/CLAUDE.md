# Dawn — サイトブロッカー拡張のデザイン規約

この拡張の UI を書くときは、必ず `packages/design-system/README.md` を先に読むこと。
色・余白・角丸・文字サイズは `packages/design-system/tokens.css` の CSS 変数だけを使い、
生のカラーコードやピクセル値を新しく書かない。

## 守ること

- 新しい色を足さない。足したくなったら既存の 9 色で表現できないかを先に疑う。
- 禁止の記号（赤、×印、錠前、警告枠）を使わない。削除ボタンも赤くしない。
- 操作の強さは色ではなく階層で表す（Primary / Ghost / Quiet → `packages/design-system/components/button.md`）。
- 角丸はピル（`--radius-pill`）が基本。角丸の四角（`--radius-md`）は入力欄だけ。
- 影は使わない。例外は太陽の `--sun-glow` のみ。
- 地平線（空・地面・太陽）は**残り時間を持つ画面にだけ**置く。太陽の高さは進捗そのものなので、
  進捗のない画面（ポップアップ、設定画面）に風景を持ち込まない。
- タップ領域は 44px 以上。アイコンだけのボタンには `aria-label` を付ける。
- フォントは Zen Kaku Gothic New 1 書体。

## ファイル

| パス | 中身 |
| --- | --- |
| `packages/design-system/README.md` | 方針と全体の決めごと |
| `packages/design-system/tokens.css` | CSS 変数（これを import して使う） |
| `packages/design-system/tokens.json` | 同じ値の元データ |
| `packages/design-system/components/*.md` | 部品ごとのガイドライン |
| `packages/design-system/reference/*.jpg` | 完成形の見本。新しい画面を作る前に近いものを見る |
