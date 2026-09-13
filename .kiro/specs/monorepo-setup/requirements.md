# Requirements Document

## Introduction
site-blocker は、Chrome 拡張（ブロック判定）とブロック画面（表示）を1つのリポジトリで開発し、spec ごとに git worktree で並行実装する。現状はワークスペースの設定もアプリの雛形もなく、`redirect-rules` と `blocked-page` を同時に始めると、双方がリポジトリ直下の設定を作って衝突する。

この spec では、後続 spec が分岐する前に main 上でモノレポの土台を確定させる。具体的には、2つのアプリの雛形をワークスペースに収め、リポジトリ直下からビルドとテストを一括実行できるようにする。

## Boundary Context
- **In scope**:
  - Chrome 拡張アプリとブロック画面アプリの、機能を持たない雛形をワークスペースに含めること
  - リポジトリ直下からのビルドとテストの一括実行
- **Out of scope**:
  - リダイレクトルールなどのブロック機能（`redirect-rules`）
  - ブロック画面の表示内容（`blocked-page`）
  - GitHub Pages へのデプロイ（`blocked-page`）
  - プルリクや push をきっかけに自動でチェックを実行する CI
  - lint・format・型チェックの共通設定と一括実行
  - 雛形を Chrome に読み込んだり、ブラウザで表示したりする動作確認
  - 複数アプリで共有するコードの置き場所
  - Node.js・pnpm のバージョンをインストール時に強制すること（バージョンは `mise.toml` で管理する）
- **Adjacent expectations**:
  - 開発者は `mise.toml` で固定された Node.js と pnpm を使う
  - `redirect-rules` と `blocked-page` は、この spec が作る雛形に機能を実装する。追加されたテストとビルドは、この spec の一括実行の対象になる
  - `blocked-page` は、ブロック画面アプリのビルド結果を公開に使う

## Requirements

### Requirement 1: ワークスペース構成
**Objective:** As a site-blocker の開発者, I want 拡張とブロック画面を1つのワークスペースで管理したい, so that 1回のインストールで両方の開発を始められる

#### Acceptance Criteria
1. The Monorepo Workspace shall Chrome 拡張アプリとブロック画面アプリを、それぞれ独立したパッケージとして含む
2. When 開発者がリポジトリ直下で依存関係をインストールする, the Monorepo Workspace shall 両方のアプリの依存関係を1回の操作で導入する
3. When 開発者がインストール済みのリポジトリで再度インストールする, the Monorepo Workspace shall 依存関係の定義を変えずに同じ状態を再現する

### Requirement 2: アプリの雛形
**Objective:** As a 後続 spec を実装する開発者, I want 機能を持たない雛形があらかじめ用意されていてほしい, so that 各 spec が担当のアプリに機能を足すだけで実装を始められる

#### Acceptance Criteria
1. The Monorepo Workspace shall Chrome 拡張アプリの雛形を、ブロック機能を含まない状態で提供する
2. The Monorepo Workspace shall ブロック画面アプリの雛形を、表示内容を含まない状態で提供する
3. The Monorepo Workspace shall 各雛形を、他方のアプリのコードに依存しない状態で提供する

### Requirement 3: 一括ビルド
**Objective:** As a site-blocker の開発者, I want リポジトリ直下から全アプリをまとめてビルドしたい, so that アプリごとにディレクトリを移動せずに成果物を作れる

#### Acceptance Criteria
1. When 開発者がリポジトリ直下でビルドを実行する, the Monorepo Workspace shall 全アプリをビルドし、アプリごとの成果物を出力する
2. When 開発者が雛形のみの状態でビルドを実行する, the Monorepo Workspace shall エラーなくビルドを完了する
3. If いずれかのアプリのビルドが失敗する, the Monorepo Workspace shall コマンド全体を失敗として終了し、失敗したアプリがわかる出力を表示する
4. When 開発者が対象のアプリを指定してビルドを実行する, the Monorepo Workspace shall 指定したアプリだけをビルドする

### Requirement 4: 一括テスト
**Objective:** As a site-blocker の開発者, I want リポジトリ直下から全アプリのテストをまとめて実行したい, so that 後続 spec が追加したテストを1つの操作で確認できる

#### Acceptance Criteria
1. When 開発者がリポジトリ直下でテストを実行する, the Monorepo Workspace shall 全アプリのテストを実行し、結果を表示する
2. While どのアプリにもテストがまだない, the Monorepo Workspace shall テストの実行を失敗として扱わずに完了する
3. If いずれかのテストが失敗する, the Monorepo Workspace shall コマンド全体を失敗として終了し、失敗したアプリとテストがわかる出力を表示する
4. When 開発者が対象のアプリを指定してテストを実行する, the Monorepo Workspace shall 指定したアプリのテストだけを実行する
