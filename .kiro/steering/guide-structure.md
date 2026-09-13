# Project Structure

## Organization Philosophy

**役割ごとのアプリを `apps/` に並べる pnpm workspace のモノレポ**。拡張と Web は URL の契約だけでつながり、互いのコードを import しない。1つの spec は原則1つの影響範囲（ディレクトリ）に対応させ、spec ごとのブランチ・git worktree で並行実装できるようにする。

## Directory Patterns

### Apps
**Location**: `/apps/<name>/`
**Purpose**: デプロイ・配布の単位。それぞれが独立した workspace パッケージ
**Example**: `apps/extension`（WXT, Manifest V3）、`apps/web`（Vite + React のブロック画面）

### Extension Entrypoints
**Location**: `/apps/extension/entrypoints/`
**Purpose**: WXT の規約に従い、background・popup などのエントリを置く。manifest はここの構成から生成される
**Example**: インストール時に dynamic ルールを登録する処理は background に置く

### Deployment Workflows
**Location**: `/.github/workflows/`
**Purpose**: GitHub Actions のワークフローを置く
**Example**: `apps/web` を GitHub Pages へ公開するワークフロー

### Workspace Root
**Location**: `/`
**Purpose**: `package.json`・`pnpm-workspace.yaml`・全パッケージ共通の設定のみ。アプリ固有のコードは置かない

## Spec と影響範囲の対応

| spec             | 範囲                                      |
| ---------------- | ----------------------------------------- |
| `monorepo-setup` | リポジトリ直下の設定、`apps/*` の雛形     |
| `redirect-rules` | `apps/extension`                          |
| `blocked-page`   | `apps/web`, `.github/workflows`           |

- 新しい spec を作るときも、触るディレクトリが既存 spec と重ならないように切る
- 共有するもの（steering、spec、URL の契約、ルート設定）は、分岐前に main で確定させる

## Naming Conventions

- **Directories / Files**: kebab-case（`apps/extension`、`blocked-page`）
- **Spec names**: 影響範囲や機能を表す kebab-case

## Import Organization

- `apps/extension` と `apps/web` の間で import しない（共有するのは URL の形だけ）
- 共通コードが必要になった場合は `packages/<name>/` を作る案とし、作る前に steering を更新する

## Code Organization Principles

- **拡張と Web を疎結合に保つ**: 片方の変更がもう片方のビルドや配布を要求しないようにする
- **ロックファイルは手で直さない**: `pnpm-lock.yaml` が衝突したら、マージ後に `pnpm install` で作り直す
- **spec を変えるときは main で**: 実装中に spec を変えたくなったら、main で直してから各ブランチに取り込む

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
