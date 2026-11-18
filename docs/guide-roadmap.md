# ロードマップ

**これから何を、どの順で、どのレーンで作るか**を決めた文書。着手前にここを見て、順序と並行できる組を確認する。

- 開発の手順そのものは [guide-workflow.md](guide-workflow.md)、issue で並行させる手順は [issues/README.md](../issues/README.md)
- **確定した spec の影響範囲は `.claude/rules/guide-structure.md` が正**。この文書は計画なので、実装が始まったら guide-structure.md を更新する

## この文書と issue の分担

重複させない。置き場所を分ける。

| | 置くもの |
| ---- | ---- |
| **この文書** | 順序・依存関係・並行できる組（状態を持たない判断の前提） |
| **`issues/`** | 個々の機能と未決事項。`status`（`backlog` / `ready` / `done`）で状態を持つ |

思いついた機能は `issues/` に `status: backlog` で積む。順序と依存を変えるときだけこの文書を直す。

GitHub の issue は使わない。`#12` のような番号は、移す前の GitHub issue と PR を指す（[issues/README.md](../issues/README.md)）。

## 現在地

| spec | 状態 |
| ---- | ---- |
| `monorepo-setup`・`blocked-page`・`redirect-rules`・`lint-setup` | 完了（第一段階: x.com を開くとブロック画面に飛び、元URLが出る） |
| `blocklist-storage`・`blocklist-ui` | 完了（ポップアップでブロックリストを編集できる） |
| `service-worker-cleanup`・`current-tab-add` | 完了（service worker によるすり抜けの対策、今開いているページの追加） |
| `ci`・一時解除（`temporary-unblock-*`） | 見送り（#9・#13〜#15）。一時解除の代わりに [settings-lock](../issues/settings-lock.md) を入れる |

## これから

| issue | 種類 | 範囲 | 前提 |
| ---- | ---- | ---- | ---- |
| [custom-domain](../issues/custom-domain.md) | 決めること | URL の契約（main） | なし |
| [unblock-time](../issues/unblock-time.md) | 決めること | URL の契約（main） | なし |
| [schedule-blocking](../issues/schedule-blocking.md) | spec | `apps/extension` | unblock-time。パスワードの要否は settings-lock と合わせる |
| [settings-lock](../issues/settings-lock.md) | spec | `apps/extension` | なし |
| [privacy-page](../issues/privacy-page.md) | spec | `apps/web` | custom-domain |
| [store-release](../issues/store-release.md) | spec | `apps/extension`, docs | custom-domain, privacy-page |

「決めること」は spec を作らず、main で相談して `.claude/rules/guide-tech.md` に書いて閉じる。URL の契約は配布した拡張に埋め込まれるので、レーンを分ける前に確定させる。

## 順序と並行できる組

```
[main] custom-domain と unblock-time を決める（URL の契約）
   ↓
  ┌ レーンA apps/extension: schedule-blocking → settings-lock
  └ レーンB apps/web:       privacy-page
   ↓
  store-release（両方のマージ後）
```

- **レーンA と B は並行できる。** 触るディレクトリが `apps/extension` と `apps/web` で分かれている。これを最初の並行の題材にする
- **レーンA の中は直列。** schedule-blocking と settings-lock はどちらも `apps/extension`（ポップアップと storage）を触る。決めることが残っていない schedule-blocking を先にする
- **unblock-time で「ブロック画面に解除時刻を渡す」と決めたら、`apps/web` 側の改修も要る。** そのときは privacy-page と同じ `apps/web` になるので、レーンB に直列で積む
- どのレーンも依存を足さない見込み。足すことになったら、ほかのレーンと同時に走らせない（`pnpm-lock.yaml` が衝突する。[issues/README.md](../issues/README.md) の「範囲が重なるかの判断」）

## spec を切る基準

1. **1 spec = 1 影響範囲（ディレクトリ）** — worktree で並行実装できるように
2. **共有するものは分岐前に main で確定** — `.claude/rules/`、URL の契約、ルート設定
3. **分量上限 80 / 150 / 100 行** — 超えるなら機能を分割する

この3つから「触るディレクトリが同じ spec は並行できない」が決まる。機能が `apps/extension` に集中するため、レーンA は直列になる。**並行させるために無理に分割しない。**

## 拡張を Chrome で確認する

開発者モードで読み込む。ビルド成果物は `apps/extension/.output/chrome-mv3/`。

```bash
pnpm --filter @site-blocker/extension run build
```

1. Chrome で `chrome://extensions` を開く
2. 右上の**デベロッパーモード**を ON にする
3. **パッケージ化されていない拡張機能を読み込む**をクリック
4. `apps/extension/.output/chrome-mv3` を選ぶ

コードを変えたら**再ビルドしてから、`chrome://extensions` のリロードボタンを押す**。background のログは、拡張カードの **Service Worker** リンクから DevTools で見る。`wxt dev` を使えば、変更の検知と拡張のリロードが自動になる。

Claude に検証させる場合は chrome-devtools MCP を使う。`--isolated=true` なので毎回まっさらなプロファイルで起動し、**拡張は `install_extension` で毎回読み込む**（`--load-extension` は効かない）。普段使いの Chrome プロファイルは汚れない。
