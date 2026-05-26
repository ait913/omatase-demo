# OMATASE Demo — プロジェクト固有メモ

親規約: [Muraki/CLAUDE.md](../../CLAUDE.md)

## プロジェクト要約

OMATASE (URL 共有で待ち合わせ・イベント進行を管理するアプリ) の **クリッカブル + バックエンド付き MVP デモ**。Figma 改訂版 (2026-05) の構造 (Event > Schedule > Feature プラグイン) を反映し、簡易ユーザー登録 → イベント作成 → 共有 → 進行 まで実際に動かせる形にする。ハッカソン提出 / VC ピッチ / 友人デモ用。

旧 `Muraki/projects/omatase-design-mock` (Plan時代の語彙・モックデータのみ) はアーカイブ的に保留。本 PJ は語彙・構造・実 DB が別物のため新規スラッグで切り直し。

GitHub: <TODO: ait913/omatase-demo (新規)>

## 主要ドキュメント

- 設計書: `.designs/<YYYYMMDD>-<feature-slug>.md` (Architect 作成)
- プロジェクト固有ナレッジ: `.knowledge/<topic>.md`
- 参考: 旧モック設計 `Muraki/projects/omatase-design-mock/.designs/20260510-design-mock.md` (Plan時代、UI トーンの参考)

## 技術スタック

- Frontend: Vite + React + TypeScript + Tailwind + react-leaflet + TanStack Query
- Backend: Hono + Drizzle ORM
- DB: SQLite (better-sqlite3)
- 認証: better-auth (匿名 / ゲスト運用、名前のみで登録、Cookie session)
- ホスティング: appily レーン (Coolify、Nginx + Hono の 2 コンテナ or 1 コンテナで Hono が静的配信、設計時確定)

## 規約・やらないこと

- **Plan という語彙を使わない** — 全て Schedule に統一 (旧モック残党を持ち込まない)
- email/password 認証を入れない — 名前のみのゲスト運用に統一 (将来拡張は別 PJ で)
- リアルタイム push を入れない — チャット / 進行表示はすべて Polling
- 重い drop-shadow / 派手な装飾を使わない (旧モックのトーン継承: Apple Maps × Slack の中間)
- 追加 webfont をロードしない (system-ui で十分)

## 主要ワークフロー

### dev 起動

<TODO: 設計確定後にコマンド記載>

### テスト

<TODO: 設計確定後 (Reviewer がテスト基盤を定義)>

### デプロイ

<TODO: appily SKILL 使用、Coolify uuid 取得後追記>

## デプロイ / 外部リソース

- URL: <TODO>
- Coolify app uuid: <TODO>
- 関連 SKILL: [`appily`](../../.claude/skills/appily/SKILL.md)
- Figma board: <https://www.figma.com/board/Ww2agroPoK9lCVd4LvT5sN/OMATASE>
- Notion DB 叩き案 (Plan時代、要変換): <https://www.notion.so/mtg-1-35a6f41832f480e28966f52aeb165f0a>

## 関連

- 旧モック: [`Muraki/projects/omatase-design-mock/`](../omatase-design-mock/)
- [`pattern/aisaba-design-language.md`](../../knowledge/pattern/aisaba-design-language.md)
- [`pattern/tanstack-query-invalidation-matrix.md`](../../knowledge/pattern/tanstack-query-invalidation-matrix.md)
- [`gotcha/better-auth-test-cookie-must-match-hono-signed-format.md`](../../knowledge/gotcha/better-auth-test-cookie-must-match-hono-signed-format.md)
- [`gotcha/leaflet-zindex-vs-modal.md`](../../knowledge/gotcha/leaflet-zindex-vs-modal.md)
- [`gotcha/jsdom-getboundingclientrect-zero.md`](../../knowledge/gotcha/jsdom-getboundingclientrect-zero.md)
- [`gotcha/tanstack-router-factory-test-memory-history.md`](../../knowledge/gotcha/tanstack-router-factory-test-memory-history.md)
- [`gotcha/design-must-specify-app-export-path-for-tests.md`](../../knowledge/gotcha/design-must-specify-app-export-path-for-tests.md)
