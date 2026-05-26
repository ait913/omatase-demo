# OMATASE-demo MVP 設計

> 関連: 親規約 [Muraki/CLAUDE.md](../../../CLAUDE.md) / PJ CLAUDE.md [omatase-demo/CLAUDE.md](../CLAUDE.md) / 研究 [00-research-summary.md](../.knowledge/00-research-summary.md) / 旧 mock §3-§4 [omatase-design-mock/.designs/20260510-design-mock.md](../../omatase-design-mock/.designs/20260510-design-mock.md)

---

## 1. 目的

URL ひとつで「待ち合わせ → 当日の進行」を全員でなぞれるイベント運営アプリ MVP デモ。**ホスト/ゲストの登録から進行ページ完了まで実 BE で動く** ことを示し、ハッカソン提出 / VC ピッチ / 友人デモで使う。

旧 `omatase-design-mock` は「Plan 語彙 + モック」までで止めていたので、本 PJ は語彙 (Schedule + Feature) + バックエンド + 認証を載せて作り直す (新規スラッグ、コード資産は最小流用)。

---

## 2. 対象ユーザー / ユースケース

### 2.1 ホスト (イベント作成者) 動線

1. ランディング `/` → 「イベントを作る」
2. イベント作成 `/create` で **イベント名 + 自分の表示名** を入力 (`signIn.anonymous` でホストも匿名ユーザー化)
3. 集合場所/時刻設定 `/create/where` で **集合場所 (地図ピンドラッグ)** と **開始時刻** を決める。これが最初の Schedule (`name=集合, kind=meetup feature 自動付与`) として保存
4. イベントホーム `/e/:eventId` (管理者版) — アナウンス textarea / Schedule 一覧 / メンバー / Event チャット / 「URL 共有」ボタン
5. Schedule 追加: `+` → Schedule 編集モーダル (`<ScheduleEditSheet>`) で名前・時刻・場所・メモ・参加メンバー・Feature を追加 (集合 / 持ち物確認をトグル)
6. URL 共有モーダル (`<ShareSheet>`) で QR と URL コピー
7. 開始時刻が来ると、ホストは **通常通りイベントホームに着地** (管理操作優先のため切替なし、進行ページへは "▶ 進行を見る" で遷移可)

### 2.2 ゲスト動線

1. 共有 URL `/e/:eventId/join` → 名前入力 → `signIn.anonymous` (`x-guest-name: ${入力名}` ヘッダ付き) で匿名登録 + Event への参加レコード作成
2. イベントホーム `/e/:eventId` (一般版) — アナウンス読み取り / Schedule 一覧 / メンバー / Event チャット (送信可)
3. **開始時刻以降 (= 現在の Schedule が active)** 、ゲストが `/e/:eventId` を開くと **自動で `/e/:eventId/progress` にリダイレクト** (ホストは留まる)

### 2.3 進行時動線 (全員共通)

1. 進行ページ `/e/:eventId/progress` は **「現在の Schedule (`start_at ≦ now < end_at`)」を 1 画面** に表示
2. Feature (集合 / 持ち物確認) は折り畳んだチップで現れ、タップで `<FeatureDetailSheet>` 展開
3. 次の Schedule (上端ヘッダ下) / 前の Schedule (左フリック or 「← 前へ」) を切替可能
4. 「完了」ボタンでホスト/メンバー誰でも前倒し完了可 (status = completed、自動で次の Schedule に遷移)
5. Schedule 内チャット (`<ScheduleChat>`) は 2 秒 polling
6. ホストはヘッダの「⌂ 全体」でイベントホームへ戻れる

---

## 3. デザインテーマ (旧 mock §3 を踏襲、Tailwind v4 で再定義)

### 3.1 トーン

明るく・やわらかく・ゆるい (Apple Maps × Slack 中間)。シリアスな業務感を出さない。重い drop-shadow / 派手な装飾を使わない。装飾より余白で階層。

### 3.2 カラートークン (Tailwind v4 `@theme` で定義)

| トークン | HEX | 用途 |
|---|---|---|
| `--color-brand-500` | `#FF7A59` | プライマリ CTA、アクティブ状態、共有ボタン |
| `--color-brand-100` | `#FFE6DE` | CTA hover、選択ピル背景 |
| `--color-accent-500` | `#3DB7C5` | リンク、地図ピン (自分マーカー) |
| `--color-bg`        | `#FAFAF7` | アプリ背景 |
| `--color-surface`   | `#FFFFFF` | カード・モーダル・Sheet |
| `--color-ink-900`   | `#1F2937` | 本文 |
| `--color-ink-500`   | `#6B7280` | サブテキスト・タイムスタンプ |
| `--color-border`    | `#E5E7EB` | 区切り線 |
| `--color-success`   | `#10B981` | 「参加」「completed」ステータス |
| `--color-warning`   | `#F59E0B` | 「未定」「未チェック」ステータス |

### 3.3 タイポ / 余白 / 角丸

- フォント: system-ui スタック (`system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`)。**追加 webfont をロードしない**
- 時刻表示: tabular nums (`tabular-nums`)
- 余白: 8px グリッド (`gap-2/4/6`)
- 角丸: カード `rounded-2xl` (16px) / Sheet `rounded-t-3xl` / ボタン `rounded-full`
- シャドウ: `shadow-sm` 〜 `shadow-md`、重ねない
- z-index: **modal/sheet は `z-[1100]`** ([leaflet z-index gotcha 厳守](../../../knowledge/gotcha/leaflet-zindex-vs-modal.md))

### 3.4 モバイル枠 (PC 表示時)

PC で開くと 375×812 のモバイル枠を画面中央配置 (`MobileFrame`)。背景は `#EEEEEC`、フレームは `rounded-3xl shadow-md`。モバイルでは全面。**旧 mock の `MobileFrame` `Avatar` は流用、`MapSection` は依存揃ってるので流用、`ChatBox` は UI 殻のみ参考 (ロジック書き直し)**。

---

## 4. プロジェクト構造

### 4.1 リポジトリ構成: **単一 repo + flat 配置 (apps/api・apps/web に分けない)**

採用根拠:
- 1 機能 MVP、共有型 1 ファイル (`src/shared/types.ts`) で済む
- Vite が `src/` 配下のフロントを build、Hono が `src/server/` でサーバ起動、テストは `src/` 全体に Vitest
- monorepo (turborepo / nx) を入れるほどの分量ではない
- TypeScript の path alias で `@/shared/*` `@/server/*` `@/client/*` を切れば衝突しない

### 4.2 ディレクトリ

```
omatase-demo/
├── package.json
├── tsconfig.json                         # 1 つ。paths で @ alias 定義
├── vite.config.ts                        # @tailwindcss/vite plugin、API proxy 設定
├── vitest.config.ts                      # 環境別 (jsdom / node) で 2 project
├── drizzle.config.ts
├── Dockerfile                            # multi-stage、最終は Node + 静的配信を Hono 自身が serve (§10 参照)
├── .dockerignore
├── .env.example
├── drizzle/                              # drizzle-kit が生成する migration
│   └── *.sql
├── src/
│   ├── shared/
│   │   ├── types.ts                      # API DTO 型 (共通)
│   │   ├── schema.ts                     # zod (共通入力 schema)
│   │   ├── feature-config.ts             # FeatureConfig zod discriminated union
│   │   └── time.ts                       # 時刻判定ヘルパ (純関数、サーバ/クライアント両用)
│   ├── server/                           # Hono + Drizzle (Node 環境)
│   │   ├── app.ts                        # ★ export const app = new Hono()。route mount のみ、serve しない
│   │   ├── index.ts                      # ★ 薄い serve wrapper。テストからは import しない
│   │   ├── auth.ts                       # better-auth インスタンス
│   │   ├── db/
│   │   │   ├── client.ts                 # better-sqlite3 + drizzle、WAL 有効化
│   │   │   ├── schema.ts                 # 全 schema を re-export (drizzle-kit 用)
│   │   │   ├── auth-schema.ts            # user/session/account/verification (better-auth cli で生成)
│   │   │   └── domain-schema.ts          # event/schedule/feature/state/announcement/chat/membership
│   │   ├── routes/
│   │   │   ├── events.ts                 # /api/events
│   │   │   ├── schedules.ts              # /api/events/:eventId/schedules ...
│   │   │   ├── features.ts               # /api/schedules/:sid/features
│   │   │   ├── announcements.ts
│   │   │   ├── chats.ts                  # event chat + schedule chat
│   │   │   ├── progress.ts               # /api/events/:eventId/progress (集約 endpoint)
│   │   │   └── members.ts                # /api/events/:eventId/members
│   │   └── lib/
│   │       ├── error.ts                  # AppError + errorMiddleware
│   │       └── guard.ts                  # 認可ヘルパ (isHost / isMember)
│   ├── client/                           # React + TanStack Router (browser 環境)
│   │   ├── main.tsx
│   │   ├── index.css                     # @import "tailwindcss"; @theme {...}
│   │   ├── router.tsx                    # ★ createAppRouter(queryClient) factory
│   │   ├── routes/
│   │   │   ├── __root.tsx
│   │   │   ├── index.tsx                 # /
│   │   │   ├── create.tsx                # /create
│   │   │   ├── create.where.tsx          # /create/where
│   │   │   ├── e.$eventId.tsx            # /e/:eventId (イベントホーム)
│   │   │   ├── e.$eventId.join.tsx       # /e/:eventId/join (ゲスト名入力)
│   │   │   └── e.$eventId.progress.tsx   # /e/:eventId/progress (進行)
│   │   ├── api/
│   │   │   ├── client.ts                 # fetch wrapper (credentials: "include")
│   │   │   ├── queryKeys.ts              # ★ QK 集約
│   │   │   └── hooks/                    # useEvent / useSchedules / useProgress / useChat / ...
│   │   ├── components/
│   │   │   ├── MobileFrame.tsx           # 旧 mock 流用
│   │   │   ├── MapSection.tsx            # 旧 mock 流用 (react-leaflet ラッパ)
│   │   │   ├── Avatar.tsx                # 旧 mock 流用
│   │   │   ├── ScheduleList.tsx
│   │   │   ├── ScheduleEditSheet.tsx     # 編集モーダル
│   │   │   ├── FeatureDetailSheet.tsx    # 集合 / 持ち物の中身
│   │   │   ├── AnnouncementBoard.tsx
│   │   │   ├── ChatBox.tsx               # 殻のみ流用、polling は hook 側
│   │   │   ├── ShareSheet.tsx            # QR + コピー
│   │   │   ├── ProgressView.tsx
│   │   │   └── ...
│   │   └── lib/
│   │       ├── visibility.ts             # document.visibilityState ラッパ
│   │       └── clipboard.ts
│   └── tests/                            # 後述 §9
│       ├── setup.client.ts
│       ├── setup.server.ts
│       ├── helpers/
│       │   ├── app.ts                    # export { app } from "../../server/app"
│       │   ├── auth-cookie.ts            # Hono signed cookie 生成
│       │   ├── db.ts                     # in-memory SQLite + migration
│       │   ├── render.tsx                # RTL + Router + Query Provider
│       │   └── fixtures.ts
│       ├── server/<...>.test.ts
│       └── client/<...>.test.tsx
```

### 4.3 依存 (`package.json` 主要)

```jsonc
{
  "scripts": {
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite",
    "dev":        "concurrently -k -n SRV,WEB \"npm:dev:server\" \"npm:dev:client\"",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "build":      "npm run build:client && npm run build:server",
    "start":      "node dist/server/index.js",
    "test":       "vitest run",
    "test:watch": "vitest",
    "db:generate":"drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "auth:generate":"better-auth generate --output src/server/db/auth-schema.ts",
    "typecheck":  "tsc --noEmit"
  },
  "dependencies": {
    "@better-auth/drizzle-adapter": "^1.6.11",
    "@hono/node-server": "^2.0.4",
    "@hono/zod-validator": "^0.8.0",
    "@tanstack/react-query": "^5.100.14",
    "@tanstack/react-router": "^1.170.8",
    "better-auth": "^1.6.11",
    "better-sqlite3": "^12.10.0",
    "drizzle-orm": "^0.45.2",
    "hono": "^4.12.23",
    "leaflet": "^1.9.4",
    "qrcode.react": "^4.2.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-leaflet": "^5.0.0",
    "zod": "^4"
  },
  "devDependencies": {
    "@better-auth/cli": "^1.4.21",
    "@tailwindcss/vite": "^4.3.0",
    "@tanstack/router-plugin": "^1.170.8",
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "@testing-library/user-event": "^14",
    "@types/better-sqlite3": "^7",
    "@types/leaflet": "^1.9",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^5",
    "concurrently": "^9",
    "drizzle-kit": "^0.31.10",
    "jsdom": "^25",
    "tailwindcss": "^4.3.0",
    "tsx": "^4",
    "typescript": "^5.7",
    "vite": "^8.0.14",
    "vitest": "^4.1.7"
  }
}
```

### 4.4 Tailwind v4 構成 (CSS-first config)

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), TanStackRouterVite()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" }, // dev 時 API は別 port
  },
  build: { outDir: "dist/client" },
});
```

`src/client/index.css`:
```css
@import "tailwindcss";
@import "leaflet/dist/leaflet.css";

@theme {
  --color-brand-500: #FF7A59;
  --color-brand-100: #FFE6DE;
  --color-accent-500: #3DB7C5;
  --color-bg: #FAFAF7;
  --color-surface: #FFFFFF;
  --color-ink-900: #1F2937;
  --color-ink-500: #6B7280;
  --color-border: #E5E7EB;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --font-sans: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
}
```

これで `bg-brand-500` `text-ink-900` などの utility が自動生成される。**`tailwind.config.ts` は作らない**。

---

## 5. データモデル (Drizzle schema)

### 5.1 全体図 (mermaid)

```mermaid
erDiagram
  user ||--o{ session : has
  user ||--o{ account : has
  user ||--o{ membership : participates
  event ||--o{ membership : has
  event ||--o{ schedule : has
  event ||--o{ event_chat_message : has
  event ||--o{ announcement : has
  schedule ||--o{ schedule_feature : has
  schedule ||--o{ schedule_chat_message : has
  schedule_feature ||--o{ schedule_feature_state : has
  user ||--o{ membership : ""
  user ||--o{ schedule_member : opt-out/in
  schedule ||--o{ schedule_member : has
```

### 5.2 better-auth schema (auto generated, here for reference)

`npx @better-auth/cli generate --output src/server/db/auth-schema.ts` で生成。anonymous plugin を auth.ts に入れた状態で実行すると `user.isAnonymous` が付与される。

```ts
// src/server/db/auth-schema.ts (生成想定、verbatim 確認後 commit)
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()).notNull(),
});

export const account = sqliteTable("account", { /* ... */ });
export const verification = sqliteTable("verification", { /* ... */ });
```

### 5.3 domain schema

```ts
// src/server/db/domain-schema.ts
import {
  sqliteTable, text, integer, index, primaryKey,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import type { FeatureConfig, ChecklistState } from "@/shared/feature-config";

/** イベント。1 ホスト + N ゲスト */
export const event = sqliteTable("event", {
  id: text("id").primaryKey(),                  // nanoid(10), URL に直接出る
  name: text("name").notNull(),
  hostUserId: text("host_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("event_host_idx").on(t.hostUserId),
]);

/** イベントへの参加。host も 1 行持つ */
export const membership = sqliteTable("membership", {
  eventId: text("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["host", "member"] }).notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.eventId, t.userId] }),
  index("membership_event_idx").on(t.eventId),
]);

/** Schedule (1 イベント内の予定単位) */
export const schedule = sqliteTable("schedule", {
  id: text("id").primaryKey(),                  // nanoid(12)
  eventId: text("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  name: text("name").notNull(),                 // "東京駅集合", "ホテルにチェックイン"
  startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
  /** 位置情報。null 許容 (例: 「ホテルチェックイン」で同建物内なら lat/lng 不要) */
  locationLat: integer("location_lat", { mode: "number" }),    // float OK だが SQLite は REAL に格納
  locationLng: integer("location_lng", { mode: "number" }),
  locationLabel: text("location_label"),
  memo: text("memo"),
  /** "upcoming" | "active" | "completed" の表示用キャッシュ。実時刻判定が優先 (§7.3) */
  status: text("status", { enum: ["upcoming", "active", "completed"] }).default("upcoming").notNull(),
  position: integer("position").notNull().default(0),  // 同時刻のタイブレーカ
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("schedule_event_time_idx").on(t.eventId, t.startAt, t.endAt),
  index("schedule_event_status_idx").on(t.eventId, t.status),
]);

/**
 * Schedule の参加メンバー絞り込み。
 * デフォは「Schedule に行が無い = Event 全員参加」、明示行がある時のみその行を使う (opt-in override)。
 * UI 上「全員」トグル OFF → 個別チェック制に切り替わり、行が作成される。
 */
export const scheduleMember = sqliteTable("schedule_member", {
  scheduleId: text("schedule_id").notNull().references(() => schedule.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.scheduleId, t.userId] }),
]);

/** polymorphic Feature (pattern/polymorphic-feature-plugin-sqlite.md 準拠) */
export const scheduleFeature = sqliteTable("schedule_feature", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedule.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),                 // ❗ enum で固定しない (将来 plugin 追加に備える)
  config: text("config", { mode: "json" }).$type<FeatureConfig>().notNull(),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("schedule_feature_schedule_idx").on(t.scheduleId, t.position),
]);

/** Feature の per-user 状態 (持ち物チェック等)。config と life cycle が違うので分離 */
export const scheduleFeatureState = sqliteTable("schedule_feature_state", {
  featureId: text("feature_id").notNull().references(() => scheduleFeature.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  state: text("state", { mode: "json" }).$type<ChecklistState | Record<string, never>>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.featureId, t.userId] }),
]);

/** 管理者→全員のアナウンス。Event ホーム/進行ページのトップに常時表示 */
export const announcement = sqliteTable("announcement", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("announcement_event_idx").on(t.eventId, t.createdAt),
]);

/** Event 全体チャット */
export const eventChatMessage = sqliteTable("event_chat_message", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("event_chat_event_idx").on(t.eventId, t.createdAt),
]);

/** Schedule 内チャット */
export const scheduleChatMessage = sqliteTable("schedule_chat_message", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedule.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("schedule_chat_schedule_idx").on(t.scheduleId, t.createdAt),
]);
```

`src/server/db/schema.ts` は全部 re-export するだけ (drizzle-kit 用):
```ts
export * from "./auth-schema";
export * from "./domain-schema";
```

### 5.4 FeatureConfig (zod discriminated union)

```ts
// src/shared/feature-config.ts
import { z } from "zod";

export const meetupConfigSchema = z.object({
  kind: z.literal("meetup"),
  /** 場所の出どころ。inherit:true なら schedule.location* を使う。false なら独自指定 */
  location: z.discriminatedUnion("inherit", [
    z.object({ inherit: z.literal(true) }),
    z.object({
      inherit: z.literal(false),
      lat: z.number(),
      lng: z.number(),
      label: z.string().min(1).max(80),
    }),
  ]),
  /** 集合チェックイン (旧 QR 出欠を吸収)。ボタン式 ("到着しました" を押す)、QR は MVP では出さない */
  checkInEnabled: z.boolean().default(true),
});

export const checklistConfigSchema = z.object({
  kind: z.literal("checklist"),
  items: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(80),
    required: z.boolean().default(true),
  })).min(1).max(50),
});

export const featureConfigSchema = z.discriminatedUnion("kind", [
  meetupConfigSchema,
  checklistConfigSchema,
]);
export type FeatureConfig = z.infer<typeof featureConfigSchema>;
export type MeetupConfig    = z.infer<typeof meetupConfigSchema>;
export type ChecklistConfig = z.infer<typeof checklistConfigSchema>;

/** state */
export const checklistStateSchema = z.object({
  kind: z.literal("checklist"),
  checked: z.record(z.string(), z.boolean()),   // item.id → checked
});
export const meetupStateSchema = z.object({
  kind: z.literal("meetup"),
  checkedInAt: z.number().nullable(),           // null = まだ
});
export type ChecklistState = z.infer<typeof checklistStateSchema>;
export type MeetupState = z.infer<typeof meetupStateSchema>;
```

### 5.5 Feature kind 表 (現存 plugin)

| kind | config schema | state schema | UI Sheet | 集計関心 |
|---|---|---|---|---|
| `meetup` | `meetupConfigSchema` | `meetupStateSchema` | `<MeetupSheet>` | 「集合済み人数 / メンバー数」をホストへ |
| `checklist` | `checklistConfigSchema` | `checklistStateSchema` | `<ChecklistSheet>` | 「全アイテム済人数 / メンバー数」をホストへ + 個人別チェック |

新 kind 追加手順 (再掲): zod schema に 1 entry 追加 + UI コンポーネント追加。**DB migration 不要**。

### 5.6 共通 DTO 型 (`src/shared/types.ts`)

```ts
export type Iso = string;     // ISO8601 string (API では時刻を ms epoch ではなく ISO で返す)

export interface EventDTO {
  id: string; name: string; hostUserId: string;
  createdAt: Iso; updatedAt: Iso;
  /** 呼び出しユーザーが host か */ viewerIsHost: boolean;
}
export interface MemberDTO  { userId: string; name: string; role: "host"|"member"; joinedAt: Iso; }
export interface ScheduleLocationDTO { lat: number; lng: number; label: string; } 
export interface ScheduleDTO {
  id: string; eventId: string; name: string;
  startAt: Iso; endAt: Iso;
  location: ScheduleLocationDTO | null;
  memo: string | null;
  status: "upcoming"|"active"|"completed";
  position: number;
  members: string[];   // userId[]、空配列 = 「Event 全員」(scheduleMember 行が無いケース) を意味させない: API レイヤで全展開した結果を返す
  featureSummaries: FeatureSummaryDTO[];
}
export interface FeatureSummaryDTO {
  id: string; kind: "meetup"|"checklist"; position: number;
  /** 集計 (例: checklist は `{ doneCount, totalMembers }`, meetup は `{ checkedInCount, totalMembers }`) */
  summary: { doneCount: number; totalMembers: number };
}
export interface FeatureDTO {
  id: string; scheduleId: string; kind: "meetup"|"checklist"; position: number;
  config: FeatureConfig;          // 上で定義
  state: Record<string, unknown>; // 呼び出しユーザー自身の state
  aggregate?: { doneCount: number; totalMembers: number; /* checklist のみ: per-item count */ perItem?: Record<string, number> };
}
export interface ChatMessageDTO { id: string; authorUserId: string; authorName: string; body: string; createdAt: Iso; }
export interface AnnouncementDTO { id: string; authorUserId: string; authorName: string; body: string; createdAt: Iso; }

/** /api/events/:id/progress 集約レスポンス (進行ページ 1 リクで全部取る) */
export interface ProgressDTO {
  event: EventDTO;
  members: MemberDTO[];
  current: ScheduleWithFeaturesDTO | null;
  prev:    ScheduleDTO | null;
  next:    ScheduleDTO | null;
  latestAnnouncement: AnnouncementDTO | null;
  serverNow: Iso;
}
export interface ScheduleWithFeaturesDTO extends ScheduleDTO {
  features: FeatureDTO[];
}
```

---

## 6. API 設計 (Hono routes)

### 6.1 規約

- **REST + JSON。 RPC は採用しない** (URL で対象が見える方が curl/log デバッグしやすい、TanStack Query の queryKey も URL ベースで揃う)
- リクエスト body は `zod` validate via `@hono/zod-validator`
- レスポンス: 成功は `200/201`、エラーは `{ "code": "STR_UPPER", "message": string }` を `4xx/5xx` で返す
- 認可: Hono middleware で `c.var.user` を読み、必要 route で `requireUser()` / `requireHost(eventId)` を呼ぶ
- 全 endpoint は `/api/` prefix。better-auth は `/api/auth/**` を専有
- 時刻は **ISO8601 string で送受信** (JS の Date インスタンス化を明示的にする、TZ ズレ防止)

### 6.2 エラーコード一覧 (明示。example ではなく**全列挙**)

| HTTP | code | 発生条件 |
|---|---|---|
| 400 | `BAD_REQUEST` | zod validate 失敗 (詳細は `details` に zod issues) |
| 401 | `UNAUTHENTICATED` | session 不在で要 auth route を叩いた |
| 403 | `FORBIDDEN_NOT_HOST` | host 限定 route をメンバーが叩いた |
| 403 | `FORBIDDEN_NOT_MEMBER` | member 限定 route を非参加者が叩いた |
| 404 | `EVENT_NOT_FOUND` | eventId 不在 |
| 404 | `SCHEDULE_NOT_FOUND` | scheduleId 不在 or event mismatch |
| 404 | `FEATURE_NOT_FOUND` | featureId 不在 or schedule mismatch |
| 409 | `ALREADY_MEMBER` | 既参加ユーザーが /join を叩いた (冪等扱いで 200 にしても良いが、明示) |
| 409 | `INVALID_SCHEDULE_TIME` | endAt ≦ startAt |
| 500 | `INTERNAL` | 想定外。errorMiddleware が他の例外を全部ここに丸める |

[Hono errorMiddleware で AppError の status を読み損ねると 500 になる gotcha](../../../knowledge/gotcha/hono-error-middleware-apperror-status.md) に従い、`AppError` は `class AppError extends Error { constructor(public status: number, public code: string, message?: string){ super(message); } }`、errorMiddleware で `if (err instanceof AppError) return c.json({ code: err.code, message: err.message }, err.status)` を**明示**。

### 6.3 endpoint 一覧

#### 6.3.1 認証 (better-auth が提供、参考)

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/auth/sign-in/anonymous` | 名前ヘッダ込みで匿名登録 (詳細 §8) |
| POST | `/api/auth/sign-out` | サインアウト |
| GET  | `/api/auth/get-session` | 現セッション取得 |

#### 6.3.2 Event

| Method | Path | auth | body / params | response |
|---|---|---|---|---|
| POST | `/api/events` | user | `{ name: string }` | `201 { event: EventDTO }`。**呼び出しユーザーが自動で host membership 取得**、最初の Schedule (`name="集合"`) は **作らない** (`/create/where` 後の `POST /schedules` で作る) |
| GET  | `/api/events/:eventId` | user (member or 公開) | — | `200 { event: EventDTO; members: MemberDTO[]; viewerIsMember: boolean }`。**非メンバーが叩いても OK** (これにより `/join` 画面でイベント名を出せる)、ただし `viewerIsMember=false` の時 schedules/chat 等は別 endpoint で 403 |
| POST | `/api/events/:eventId/join` | user | — | `200 { membership: MemberDTO }`。`x-guest-name` 不要 (登録時に注入済み)。既参加なら `409 ALREADY_MEMBER` |
| GET  | `/api/events/:eventId/members` | member | — | `200 { members: MemberDTO[] }` |

#### 6.3.3 Schedule

| Method | Path | auth | body | response |
|---|---|---|---|---|
| GET | `/api/events/:eventId/schedules` | member | — | `200 { schedules: ScheduleDTO[] }` (時刻昇順、`position` でタイブレーク) |
| POST | `/api/events/:eventId/schedules` | host | `{ name, startAt, endAt, location: ScheduleLocationDTO\|null, memo?, members?: string[]\|null }` (`members=null` で「Event 全員」、配列で個別指定) | `201 { schedule: ScheduleDTO }` |
| GET | `/api/schedules/:scheduleId` | member | — | `200 { schedule: ScheduleWithFeaturesDTO }` |
| PATCH | `/api/schedules/:scheduleId` | host | partial body | `200 { schedule: ScheduleDTO }`。`endAt ≦ startAt` で 409 |
| DELETE | `/api/schedules/:scheduleId` | host | — | `204` |
| POST | `/api/schedules/:scheduleId/complete` | member | — | `200 { schedule: ScheduleDTO }`。status を `completed` に WRITE (前倒し完了) |

#### 6.3.4 Feature

| Method | Path | auth | body | response |
|---|---|---|---|---|
| POST | `/api/schedules/:scheduleId/features` | host | `{ kind: "meetup"\|"checklist", config: FeatureConfig }` | `201 { feature: FeatureDTO }`。config は zod 検証 |
| GET  | `/api/features/:featureId` | member | — | `200 { feature: FeatureDTO }` |
| PATCH | `/api/features/:featureId` | host | `{ config?: FeatureConfig, position?: number }` | `200 { feature: FeatureDTO }` |
| DELETE | `/api/features/:featureId` | host | — | `204` |
| PUT | `/api/features/:featureId/state` | member | `{ state: <ChecklistState\|MeetupState> }` | `200 { state }`。upsert (`schedule_feature_state` の primary key) |

#### 6.3.5 Announcement

| Method | Path | auth | body | response |
|---|---|---|---|---|
| GET  | `/api/events/:eventId/announcements` | member | — | `200 { announcements: AnnouncementDTO[] }` (最新降順、最大 20) |
| POST | `/api/events/:eventId/announcements` | host | `{ body: string (1..500 chars) }` | `201 { announcement: AnnouncementDTO }` |

#### 6.3.6 Chat (Event / Schedule の 2 層)

| Method | Path | auth | body | response |
|---|---|---|---|---|
| GET  | `/api/events/:eventId/chat?afterId=<id>?` | member | — | `200 { messages: ChatMessageDTO[] }` (作成昇順、最大 100、`afterId` 指定で差分取得) |
| POST | `/api/events/:eventId/chat` | member | `{ body: string (1..2000) }` | `201 { message: ChatMessageDTO }` |
| GET  | `/api/schedules/:scheduleId/chat?afterId=<id>?` | member | — | `200 { messages: ChatMessageDTO[] }` |
| POST | `/api/schedules/:scheduleId/chat` | member | `{ body: string (1..2000) }` | `201 { message: ChatMessageDTO }` |

#### 6.3.7 Progress (集約 endpoint — polling の主役)

| Method | Path | auth | response |
|---|---|---|---|
| GET | `/api/events/:eventId/progress` | member | `200 ProgressDTO` (§5.6 参照) |

**1 リクで** event / members / current schedule + features / prev / next / latest announcement / serverNow を返す。**進行ページの polling は基本これ 1 本** (10s)。チャットは別途 schedule 単位で 2s polling、announcement は 30s 別 polling は不要 (progress に同梱)。

#### 6.3.8 Hono 主要 route signature (抜粋、TypeScript)

```ts
// src/server/routes/events.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireUser, requireHost, requireMember } from "../lib/guard";
import { AppError } from "../lib/error";

const events = new Hono<AppEnv>();

events.post(
  "/",
  requireUser,
  zValidator("json", z.object({ name: z.string().min(1).max(80) })),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");
    const id = nanoid(10);
    await db.transaction(async (tx) => {
      await tx.insert(event).values({ id, name: body.name, hostUserId: user.id, createdAt: new Date(), updatedAt: new Date() });
      await tx.insert(membership).values({ eventId: id, userId: user.id, role: "host", joinedAt: new Date() });
    });
    return c.json({ event: toEventDTO(await loadEvent(id), user.id) }, 201);
  }
);

events.get("/:eventId", requireUser, async (c) => { /* ... */ });
events.post("/:eventId/join", requireUser, async (c) => { /* 409 if already */ });
export default events;
```

`src/server/app.ts`:
```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import events from "./routes/events";
// ... 他 routes

type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export const app = new Hono<AppEnv>();

app.use("/api/*", cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  credentials: true,
  allowMethods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
}));

app.use("/api/*", async (c, next) => {
  const s = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", s?.user ?? null);
  c.set("session", s?.session ?? null);
  await next();
});

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.route("/api/events", events);
// app.route("/api/schedules", schedules);
// app.route("/api/features", features);
// app.route("/api", progress);  // /api/events/:eventId/progress

// 静的配信 (production のみ、§10 参照)
if (process.env.SERVE_STATIC === "1") {
  app.get("*", serveStatic({ root: "./dist/client" }));
  app.get("*", serveStatic({ path: "./dist/client/index.html" })); // SPA fallback
}

// errorMiddleware (最後)
app.onError((err, c) => {
  if (err instanceof AppError) return c.json({ code: err.code, message: err.message }, err.status);
  console.error("[unhandled]", err);
  return c.json({ code: "INTERNAL", message: "internal error" }, 500);
});
```

`src/server/index.ts` (薄い wrapper):
```ts
import { serve } from "@hono/node-server";
import { app } from "./app";

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) }, (info) => {
  console.log(`[server] listening on :${info.port}`);
});
```

★ **app export 規約厳守** ([gotcha](../../../knowledge/gotcha/design-must-specify-app-export-path-for-tests.md)): テストは `import { app } from "@/server/app"` → `app.request(path, init)` で叩く。`src/server/index.ts` をテストから import しない。

---

## 7. 挙動仕様 (Reviewer のテスト根拠 — 「○○ のとき △△」)

### 7.1 認証 / 登録

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.1.1 | 未ログイン状態で `POST /api/auth/sign-in/anonymous` を `x-guest-name: たんり` ヘッダ付きで呼ぶ | `user.name = "たんり"`、`isAnonymous=true`、`email = <uuid>@omatase.local`、session cookie が `Set-Cookie` で返り、30 日有効 |
| 7.1.2 | `x-guest-name` を付けずに `sign-in/anonymous` | `user.name = "ゲスト"` (fallback) で作成、それ以外は同じ |
| 7.1.3 | `x-guest-name` の値が空文字 | `user.name = "ゲスト"` (fallback、空文字は `??` を通過するため `.trim()` で空判定し fallback に流す) |
| 7.1.4 | `x-guest-name` の値が 80 文字超過 | 先頭 80 文字に truncate (UI 側も `maxLength=40` で守るが、防御的) |
| 7.1.5 | 認証済み cookie 持参で `GET /api/auth/get-session` | session オブジェクト + user を返す |
| 7.1.6 | 認証必須 route (`POST /api/events`) を cookie 無しで叩く | `401 UNAUTHENTICATED` |

### 7.2 Event / Membership

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.2.1 | ログイン後 `POST /api/events { name: "大阪旅行" }` | `201`、event 作成、呼び出しユーザーが `role="host"` で membership 作成、レスポンス `event.viewerIsHost=true` |
| 7.2.2 | 別ユーザーがその eventId で `GET /api/events/:id` | `200`、`viewerIsMember=false`、`event.name` は見える (joinゲートで使うため公開) |
| 7.2.3 | 非メンバーが `GET /api/events/:id/members` | `403 FORBIDDEN_NOT_MEMBER` |
| 7.2.4 | 非メンバーが `POST /api/events/:id/join` | `200`、membership 行作成、自動で `role="member"` |
| 7.2.5 | 既メンバーが再度 `POST /api/events/:id/join` | `409 ALREADY_MEMBER` |
| 7.2.6 | 不在 eventId で操作 | `404 EVENT_NOT_FOUND` |

### 7.3 Schedule 操作 / 進行判定

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.3.1 | host が `POST /api/events/:id/schedules` で `endAt > startAt` | `201`、`status="upcoming"` |
| 7.3.2 | host が `endAt ≦ startAt` で送る | `409 INVALID_SCHEDULE_TIME` |
| 7.3.3 | member (非 host) が `POST /api/events/:id/schedules` | `403 FORBIDDEN_NOT_HOST` |
| 7.3.4 | `GET /api/events/:id/schedules` | startAt 昇順、同時刻なら position 昇順 |
| 7.3.5 | `GET /api/events/:id/progress` 呼び出し時、サーバ現在時刻が **複数 schedule の `[startAt, endAt)` に該当** (overlapping) | **`startAt` が最も早いものを current** とする。tie の場合 `position` 昇順 |
| 7.3.6 | `progress` 呼び出し時、`startAt > now` の schedule のみ存在 (= イベント開始前) | `current=null`、`next=最初の schedule`、`prev=null` |
| 7.3.7 | `progress` 呼び出し時、すべての schedule が `endAt ≦ now` | `current=null`、`prev=最後の schedule`、`next=null` |
| 7.3.8 | `progress` の `current` 判定は **schedule.status を見ない、サーバ時刻で計算**。ただし `status="completed"` の schedule は **current 判定から除外** (前倒し完了されている) |
| 7.3.9 | `POST /api/schedules/:id/complete` を member が叩く | `200`、`status="completed"` に WRITE。次回 progress 呼び出しで自動的に **次の schedule** が current 候補 |
| 7.3.10 | 自動 completed は **サーバが backfill しない**。`endAt` 経過した schedule は `progress` で current 候補から外れるが、`status` 列はそのまま `upcoming` のまま (UI 上は `endAt < now` で「終了」と表示)。書き換えは手動 complete のみ。理由: cron / scheduler を入れない MVP 縛り |
| 7.3.11 | progress の `serverNow` は ISO8601 で必ず返す。クライアントは `current` 判定にこれを使い、ブラウザの local clock を信用しない |

### 7.4 Schedule メンバー

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.4.1 | POST 時 `members` 未指定 or `null` | `schedule_member` 行ゼロ。`ScheduleDTO.members` は **Event の全 membership.userId** を展開して返す |
| 7.4.2 | POST 時 `members: [u1, u2]` | `schedule_member` に 2 行 insert、`ScheduleDTO.members = [u1, u2]` |
| 7.4.3 | PATCH で `members: []` (明示空配列) | 全 `schedule_member` 行を delete し、行ゼロ状態に戻す = 「Event 全員」扱い (UI 上「全員に戻す」操作で空配列を送る規約) |
| 7.4.4 | PATCH で `members: null` | `members` を変更しない (省略と同義) |

### 7.5 Feature

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.5.1 | host が `POST /api/schedules/:id/features` で `kind="meetup"` + `config.location.inherit=true` | 作成成功。FeatureDTO の表示 location は **Schedule.location を継承** (server 側で展開してレスポンス) |
| 7.5.2 | host が `kind="meetup"` + `inherit=true` だが schedule.location が null | `400 BAD_REQUEST` (`details: "schedule has no location to inherit"`) |
| 7.5.3 | host が `kind="checklist"` で `items=[]` | `400 BAD_REQUEST` (zod min(1)) |
| 7.5.4 | member が `PUT /api/features/:id/state` で自分の state を更新 (例 `{ state: { kind: "checklist", checked: { item-1: true } } }`) | `200`、`schedule_feature_state` に upsert (PK = featureId + userId)。次回 `GET /api/features/:id` で `state` が反映 |
| 7.5.5 | 別 member の state は他人が見られない (privacy)。`GET /api/features/:id` の `state` フィールドは **呼び出しユーザーの state のみ**、他人の集計は `aggregate.doneCount` のみ |
| 7.5.6 | checklist の「全員揃った判定」: `doneCount` = `state.checked` 内で **すべての `required=true` アイテムが true** な member 数。`required=false` のアイテムは集計に含めない |
| 7.5.7 | meetup の「集合済み」: `state.checkedInAt !== null` な member 数 |
| 7.5.8 | host が `DELETE /api/features/:id` | `204`、`schedule_feature` + cascade で `schedule_feature_state` 行も消える |
| 7.5.9 | member (非 host) が `POST /features` or `DELETE /features` | `403 FORBIDDEN_NOT_HOST` |

### 7.6 Announcement

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.6.1 | host が `POST /api/events/:id/announcements` `{ body: "明日だよー" }` | `201`、最新として返る |
| 7.6.2 | member (非 host) が POST | `403 FORBIDDEN_NOT_HOST` |
| 7.6.3 | `GET /api/events/:id/announcements` | createdAt 降順、最大 20 件。`progress` レスポンスでは **最新 1 件のみ** (`latestAnnouncement`) |
| 7.6.4 | body が空文字 or 501 文字 | `400 BAD_REQUEST` |

### 7.7 Chat

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.7.1 | member が `POST /api/events/:id/chat { body: "hi" }` | `201`、authorName は user.name |
| 7.7.2 | `GET /api/events/:id/chat` (`afterId` 無し) | 最新 100 件を **createdAt 昇順** で返す (UI 側で下端に追加されるため) |
| 7.7.3 | `GET ...?afterId=<id>` | その id 以降 (排他、createdAt > target.createdAt) を昇順で返す。**polling 差分取得用** |
| 7.7.4 | 非 member が POST or GET | `403 FORBIDDEN_NOT_MEMBER` |
| 7.7.5 | Schedule chat の場合 | 上記と同じだが、schedule の所属 event の membership で判定 |
| 7.7.6 | body が 2001 文字 or 空 | `400` |

### 7.8 Progress 集約 endpoint

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.8.1 | member が `GET /api/events/:id/progress` | `200 ProgressDTO`、§7.3 の判定で current 決定 |
| 7.8.2 | レスポンスに `serverNow` を必ず含む | クライアントが時刻計算に使う |
| 7.8.3 | `current.features[*]` には呼び出しユーザーの state + aggregate を同梱 (1 リクで FeatureDetailSheet 開けるよう先読み) |
| 7.8.4 | 非 member | `403 FORBIDDEN_NOT_MEMBER` |

### 7.9 クライアントルーティング (リダイレクト挙動)

| # | 条件 | 期待挙動 |
|---|---|---|
| 7.9.1 | 未ログインで `/e/:eventId` を開く | `/e/:eventId/join` にリダイレクト (router guard) |
| 7.9.2 | ログイン済み・非 member で `/e/:eventId` | `/e/:eventId/join` にリダイレクト |
| 7.9.3 | ログイン済み・member (non-host) で `/e/:eventId`、`serverNow` 時点で active schedule **あり** | `/e/:eventId/progress` にリダイレクト |
| 7.9.4 | ログイン済み・**host** で `/e/:eventId`、active schedule あり | リダイレクトしない (ホームに留まる、ヘッダの「▶ 進行を見る」で手動遷移) |
| 7.9.5 | `/e/:eventId/progress` を開いたが active schedule 無し | "イベント開始前" or "全 Schedule 完了" の空状態 UI |
| 7.9.6 | 共有 URL `/e/:eventId/join` を未ログインで開く | 名前入力フォーム → submit で `signIn.anonymous` → join → イベントホームへ |

### 7.10 polling 周期 / 停止条件 (TanStack Query)

| 場面 | queryKey | refetchInterval | 停止条件 |
|---|---|---|---|
| `/api/events/:id/progress` | `QK.progress(eventId)` | `10000` | `document.visibilityState !== "visible"`、もしくは event 全 schedule completed |
| `/api/schedules/:sid/chat` (進行ページの schedule chat) | `QK.scheduleChat(sid)` | `2000` | visibility 非表示、schedule.status === "completed" |
| `/api/events/:id/chat` (イベントホームの event chat) | `QK.eventChat(eventId)` | `5000` | visibility 非表示 |
| `/api/events/:id/schedules` (イベントホーム) | `QK.schedules(eventId)` | `30000` | visibility 非表示 |
| `/api/events/:id/members` | `QK.members(eventId)` | `30000` | visibility 非表示 |
| `/api/events/:id/announcements` | `QK.announcements(eventId)` | `30000` | visibility 非表示 |

すべて `refetchIntervalInBackground: false` を明示。`staleTime: 0`。

### 7.11 Mutation → Invalidate マトリクス

| Mutation | invalidate queryKey |
|---|---|
| `POST /api/events` | `QK.session`, `QK.event(newId)` |
| `POST /api/events/:id/join` | `QK.event(id)`, `QK.members(id)`, `QK.session` |
| `POST /api/events/:id/schedules` | `QK.schedules(eventId)`, `QK.progress(eventId)` |
| `PATCH /api/schedules/:sid` | `QK.schedule(sid)`, `QK.schedules(eventId)`, `QK.progress(eventId)` |
| `DELETE /api/schedules/:sid` | 同上 |
| `POST /api/schedules/:sid/complete` | `QK.schedule(sid)`, `QK.schedules(eventId)`, `QK.progress(eventId)` |
| `POST /api/schedules/:sid/features` | `QK.schedule(sid)`, `QK.progress(eventId)` |
| `PATCH /api/features/:fid` | `QK.feature(fid)`, `QK.schedule(sid)`, `QK.progress(eventId)` |
| `DELETE /api/features/:fid` | 同上 |
| `PUT /api/features/:fid/state` | `QK.feature(fid)`, `QK.progress(eventId)` |
| `POST /api/events/:id/announcements` | `QK.announcements(id)`, `QK.progress(id)` |
| `POST /api/events/:id/chat` | `QK.eventChat(id)` |
| `POST /api/schedules/:sid/chat` | `QK.scheduleChat(sid)` |

queryKey 集約は `src/client/api/queryKeys.ts` の `QK` object。`as const`。

---

## 8. 認証フロー詳細 (better-auth + anonymous + 名前注入)

### 8.1 `src/server/auth.ts`

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { anonymous } from "better-auth/plugins";
import { db } from "./db/client";
import * as authSchema from "./db/auth-schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,           // dev: http://localhost:5173, prod: https://omatase.appily.run
  secret:  process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge:  60 * 60 * 24,
  },
  plugins: [
    anonymous({
      emailDomainName: "omatase.local",            // <uuid>@omatase.local
      generateName: (ctx) => {
        const raw = ctx.request?.headers.get("x-guest-name") ?? "";
        const trimmed = raw.trim().slice(0, 80);
        return trimmed.length > 0 ? trimmed : "ゲスト";
      },
    }),
  ],
  trustedOrigins: [
    process.env.BETTER_AUTH_URL!,
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
  ],
});
```

### 8.2 client 側

```ts
// src/client/api/auth.ts
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  plugins: [anonymousClient()],
});

export async function signInAsGuest(name: string) {
  await authClient.signIn.anonymous({
    fetchOptions: { headers: { "x-guest-name": name } },
  });
}
```

`POST /api/auth/sign-in/anonymous` 1 リクで `user.name` まで決まる。後追い updateUser は不要。

### 8.3 認可ヘルパ

```ts
// src/server/lib/guard.ts
import type { MiddlewareHandler } from "hono";
import { AppError } from "./error";
import { db } from "../db/client";
import { membership } from "../db/domain-schema";
import { and, eq } from "drizzle-orm";

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.var.user) throw new AppError(401, "UNAUTHENTICATED");
  await next();
};

export async function getRoleOrThrow(eventId: string, userId: string) {
  const row = await db.select().from(membership)
    .where(and(eq(membership.eventId, eventId), eq(membership.userId, userId))).get();
  if (!row) throw new AppError(403, "FORBIDDEN_NOT_MEMBER");
  return row.role;
}

export const requireMember: (eventIdParam: string) => MiddlewareHandler<AppEnv> =
  (p) => async (c, next) => { /* ... */ };

export const requireHost: (eventIdParam: string) => MiddlewareHandler<AppEnv> =
  (p) => async (c, next) => {
    const role = await getRoleOrThrow(c.req.param(p)!, c.var.user!.id);
    if (role !== "host") throw new AppError(403, "FORBIDDEN_NOT_HOST");
    await next();
  };
```

### 8.4 認可テーブルを増やさない判断

**Permission テーブルは作らない**。MVP では `role: "host" | "member"` の 2 値で足りる (host 権限 = アナウンス投稿 / Schedule CRUD / Feature CRUD)。`event.hostUserId` でも判定可能だが、将来「共同ホスト」を増やす時のため **`membership.role`** を権限の真実とする。

---

## 9. テスト基盤

### 9.1 全体構成

- **Vitest v4** 1 プロセスで 2 project (client = jsdom / server = node) を分ける
- `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "client",
            include: ["src/tests/client/**/*.test.tsx"],
            environment: "jsdom",
            setupFiles: ["src/tests/setup.client.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "server",
            include: ["src/tests/server/**/*.test.ts"],
            environment: "node",
            setupFiles: ["src/tests/setup.server.ts"],
          },
        },
      ],
    },
  });
  ```

### 9.2 Server テスト

- **入口**: `import { app } from "@/server/app"` → `app.request(path, { method, headers, body })` ([app export gotcha](../../../knowledge/gotcha/design-must-specify-app-export-path-for-tests.md) 厳守)
- **DB**: 各テスト前に **in-memory SQLite** を作って drizzle migration を流す
  ```ts
  // src/tests/helpers/db.ts
  import Database from "better-sqlite3";
  import { drizzle } from "drizzle-orm/better-sqlite3";
  import { migrate } from "drizzle-orm/better-sqlite3/migrator";
  export function makeTestDb() {
    const sqlite = new Database(":memory:");
    sqlite.pragma("journal_mode = MEMORY");        // in-memory なので WAL 不可
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle" });
    return { db, sqlite };
  }
  ```
  `src/server/db/client.ts` は env で in-memory / file を切り替えられる factory にしておく。テストでは `DATABASE_URL=":memory:"` を `setup.server.ts` で設定。
- **better-auth テスト cookie**: signed cookie 形式 ([gotcha](../../../knowledge/gotcha/better-auth-test-cookie-must-match-hono-signed-format.md))。helper:
  ```ts
  // src/tests/helpers/auth-cookie.ts
  import { createHmac } from "node:crypto";
  export function signedSessionCookie(token: string, secret = process.env.BETTER_AUTH_SECRET!) {
    const sig = createHmac("sha256", secret).update(token).digest("base64");
    return `better-auth.session_token=${token}.${sig}`;
  }
  ```
  もしくは、より素直な方法: **テスト中に `app.request("/api/auth/sign-in/anonymous", { method: "POST", headers: { "x-guest-name": "u1" } })` を叩いて Set-Cookie を取り出し、後続リクエストでそのまま転送**。helper はこちらを推奨 (better-auth の内部仕様変更に強い)。
  ```ts
  // helpers/auth-cookie.ts (推奨パス)
  export async function loginAsGuest(name: string): Promise<string /* cookie header */> {
    const res = await app.request("/api/auth/sign-in/anonymous", {
      method: "POST",
      headers: { "content-type": "application/json", "x-guest-name": name },
    });
    const setCookie = res.headers.get("set-cookie")!;
    // "better-auth.session_token=abc.def; Path=/; ..." → name=value のみ抜く
    return setCookie.split(";")[0];
  }
  ```
- **テスト粒度**: §7 の各「○○ のとき △△」を 1 it ごとに対応させる。endpoint × 認可マトリクス (host / member / non-member / unauth) を網羅
- **時刻固定**: `vi.setSystemTime(new Date("2026-06-01T10:00:00Z"))` を § 7.3 のテスト前に使う。`serverNow` は `Date.now()` 経由なので fake timer で固定可能

### 9.3 Client テスト

- **render helper**: TanStack Router の factory ([gotcha](../../../knowledge/gotcha/tanstack-router-factory-test-memory-history.md) 通り、memory history 注入)
  ```tsx
  // src/tests/helpers/render.tsx
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
  import { createAppRouter } from "@/client/router";
  import { render } from "@testing-library/react";

  export async function renderApp(initialPath = "/") {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createAppRouter(queryClient);
    (router as any).history = createMemoryHistory({ initialEntries: [initialPath] });
    await router.navigate({ to: initialPath }).catch(() => {});
    const utils = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
    return { ...utils, router, queryClient };
  }
  ```
- **react-leaflet モック** ([jsdom + canvas 不在対策](../../../knowledge/gotcha/jsdom-getboundingclientrect-zero.md) 同様):
  ```ts
  // src/tests/setup.client.ts
  import "@testing-library/jest-dom";
  vi.mock("react-leaflet", () => ({
    MapContainer: ({children}: any) => <div data-testid="map-section">{children}</div>,
    TileLayer:   () => null,
    Marker:      ({children}: any) => <div data-testid="map-marker">{children}</div>,
    Popup:       ({children}: any) => <div>{children}</div>,
    useMap:      () => ({}),
    useMapEvents:() => null,
  }));
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
  ```
- **API モック**: MSW は採用しない (理由 §11)。`vi.spyOn(global, "fetch")` で十分。queryClient で `queries.retry: false` を default 化
- **挙動仕様の検証は class 名と DOM 構造ベース** ([jsdom getBoundingClientRect=0 gotcha](../../../knowledge/gotcha/jsdom-getboundingclientrect-zero.md))。サイズや位置の assertion は書かない。レイアウト系の検証が必須になったら **vitest browser mode + Playwright** を別ジョブで足す (MVP では入れない)

### 9.4 テストの最低カバレッジ

- §7 の各行に最低 1 テスト
- §7.11 invalidate マトリクスは、`vi.fn()` で `invalidateQueries` を mock してマトリクス通り呼ばれるか assert (各 mutation hook につき 1 it)
- snapshot テストは使わない

---

## 10. デプロイ構成 (appily レーン / Coolify)

### 10.1 1 コンテナ構成を採用 (api + 静的 web を Hono が両方 serve)

採用根拠:
- ファイル数極小・遅延要件ゆるい・1 リソースで運用したい (Coolify の管理単位を増やさない)
- Hono の `serveStatic` で `dist/client` を返す + SPA fallback を 1 endpoint で
- 別途 nginx を立てない (Atender 等他 PJ の 1 container 構成と統一)

不採用: **2 コンテナ (nginx + Hono)** は CORS + cookie domain 両方 `omatase.appily.run` に揃える手間が無視できるほどの利益がない (内部リバプロも増える)。

### 10.2 Dockerfile (multi-stage)

```dockerfile
# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build                   # build:client → dist/client、build:server → dist/server

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_STATIC=1
COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
EXPOSE 8080
CMD ["node", "dist/server/index.js"]
```

`.dockerignore`:
```
node_modules
dist
.git
.designs
.knowledge
.env*
*.log
```

### 10.3 環境変数

| 名前 | 例 | 用途 |
|---|---|---|
| `PORT` | `8080` | listen port |
| `DATABASE_URL` | `file:/data/omatase.db` | better-sqlite3 ファイル (Coolify Volume `/data`) |
| `BETTER_AUTH_URL` | `https://omatase.appily.run` | better-auth cookie domain |
| `BETTER_AUTH_SECRET` | (random 32+ chars) | HMAC secret |
| `ALLOWED_ORIGINS` | (= BETTER_AUTH_URL) | CORS allow + trustedOrigins |
| `SERVE_STATIC` | `1` | Hono に静的配信を有効化 |

`.env.example` を repo に置く (secret は空文字)。

### 10.4 Coolify 設定

- Build Pack: **Dockerfile**
- Port: **8080**
- `is_force_https_enabled: false` (Cloudflare 配下 307 ループ防止、memory `feedback_coolify_force_https_off.md` 規約)
- `redirect: both`
- Volume: `/data` (SQLite 永続化)
- ドメイン: `omatase.appily.run`
- Auto Deploy: ON (main push)
- 関連 SKILL: [`appily`](../../../.claude/skills/appily/SKILL.md)

### 10.5 起動時マイグレーション

`src/server/index.ts` で起動時に `migrate(db, { migrationsFolder: "./drizzle" })` を呼ぶ。手動で `drizzle-kit migrate` を Coolify shell で叩く運用にしない (デモなので起動時 migration で十分、データ消失リスクは MVP で許容)。

---

## 11. 不採用案 (再検討ループ防止)

| 案 | 不採用理由 |
|---|---|
| **monorepo (turborepo / nx)** | apps/api と apps/web に分けるほどの分量ではない。flat + path alias で十分。turborepo の cache 利益も低い (build 1 回) |
| **2 コンテナ (nginx + Hono)** | CORS / cookie domain を分けるコストの方が高い。Hono が静的配信できるので 1 コンテナで済む (§10.1) |
| **shadcn/ui** | コンポーネント数が少なく Tailwind 直書きで足りる。CLI セットアップ + RSC 由来の細かい問題回避コストの方が高い |
| **Storybook** | 7 画面 + 数 Sheet、Vite dev server で実機遷移で十分。導入コスト > 効用 |
| **MSW** | server 側は `app.request()` で叩けるので fetch mock 不要。client は `vi.spyOn(global, "fetch")` で十分 (テスト 1 ファイルあたり 2-3 個の fetch しか mock しない) |
| **Playwright (E2E)** | MVP・1 機能・実機遷移確認できる。BE が安定したら追加検討。MVP で Reviewer の負荷を増やさない |
| **WebSocket / SSE** | research summary §3 結論通り。Coolify 1 container・SQLite 単一書き込み・遅延数秒許容で polling 一択。Phase 2 で hook 入れ替えれば移行可 |
| **email/password 認証** | MVP デモ範囲外。anonymous + 名前のみで動線完結。Phase 2 で linkAccount で昇格可 (better-auth 標準) |
| **Permission テーブル過設計** | `membership.role: "host"\|"member"` の 2 値で MVP は足りる。Notion DB 案にあった「複数 permission row」は将来共同ホスト機能で展開可 |
| **旧 mock コードベース流用** | 語彙 (Plan) と Router (react-router-dom) が違う。React/Tailwind/Vitest のバージョンも上がる。`MobileFrame` `Avatar` `MapSection` 3 コンポーネントだけコピーして残りは新規構築 |
| **react-router-dom v7** | TanStack Router の方が search params 型安全 + Query との作者共通 + Atender 採用実績。新規 PJ で過去資産に縛られない |
| **Tailwind config (JS)** | v4 以降は `@theme` directive (CSS-first) が公式推奨。`tailwind.config.ts` は作らない |
| **schedule の自動 completed cron** | サーバ側に cron / scheduler を入れない縛り。`current` 判定は実時刻で計算し、UI 表示は「終了」フラグで間に合う (§7.3.10) |
| **QR 出欠の QR コード生成** | MVP は「到着しました」ボタンで集合チェックインに統一 (旧 mock の QR 出欠を吸収・簡略化)。QR は ShareSheet (URL 共有) のみで使う |
| **factory pattern (server side `createApp(deps)`)** | Reviewer 接続点を増やすだけ。テスト DB は `process.env.DATABASE_URL` 切替で対応 ([app export gotcha](../../../knowledge/gotcha/design-must-specify-app-export-path-for-tests.md)) |
| **react-leaflet を `dynamic import`** | バンドル ~150KB で許容範囲。初回 load 体感差なし |

---

## 12. UI 設計 (画面別、375px モバイル前提、Figma 3 枚を参照しながら)

> 全画面共通: `<MobileFrame>` で囲む。z-index は modal/sheet `z-[1100]`、Leaflet との衝突を避ける ([gotcha](../../../knowledge/gotcha/leaflet-zindex-vs-modal.md))。タイポは旧 mock §3 を踏襲。

### 12.1 `/` ランディング

```
┌─────────────────────────┐
│         🤝              │  ← brand-500 ドット 60px
│       OMATASE           │  ← text-3xl font-bold ink-900
│  URLひとつで、          │  ← ink-500 text-base
│  待ち合わせがまとまる。 │
│                         │
│  ・地図で集合場所を共有 │
│  ・進行を全員でなぞる   │
│  ・持ち物も忘れない     │
│                         │
│  ┌───────────────────┐  │
│  │  + イベントを作る │ │  ← brand-500、`rounded-full`、`/create` へ
│  └───────────────────┘  │
│  既にURLを持っている方は│
│  共有された URL を開く  │  ← ink-500、リンク見た目 (案内テキストのみ)
└─────────────────────────┘
```

### 12.2 `/create` イベント作成

入力 2 項目のみ。

```
┌─────────────────────────┐
│ ← 戻る                  │
│ イベントを作る          │  ← text-2xl font-bold
│                         │
│ イベント名              │  ← ink-500 text-sm
│ ┌─────────────────────┐ │
│ │ 大阪旅行            │ │
│ └─────────────────────┘ │
│                         │
│ あなたの表示名          │
│ ┌─────────────────────┐ │
│ │ たんり              │ │
│ └─────────────────────┘ │
│ メンバーに見える名前    │  ← ink-500 text-xs
│                         │
│ ┌───────────────────┐   │
│ │     つぎへ →       │  │  ← brand-500
│ └───────────────────┘   │
└─────────────────────────┘
```

挙動: 送信時 `signInAsGuest(name)` → `POST /api/events { name }` → `/e/:eventId` に遷移し、続けて `where` フローへ (`/create/where` は内部 query で eventId を保持)。

### 12.3 `/create/where` 集合場所/開始時刻

```
┌─────────────────────────┐
│ ← 戻る                  │
│ 集合場所と時間          │
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │      <Map>          │ │  ← 240px、ピン (中央) ドラッグで lat/lng
│ │                     │ │
│ └─────────────────────┘ │
│ 📍 東京駅 丸の内中央口  │  ← Reverse geocode (Phase 2)、MVP は手入力
│                         │
│ 集合時刻                │
│ ┌─────────────────────┐ │
│ │ 2026-06-01  10:00   │ │  ← <input type="datetime-local">
│ └─────────────────────┘ │
│ 終了予定                │
│ ┌─────────────────────┐ │
│ │ 2026-06-01  10:30   │ │
│ └─────────────────────┘ │
│                         │
│ ┌───────────────────┐   │
│ │   イベントを開始   │  │  ← brand-500
│ └───────────────────┘   │
└─────────────────────────┘
```

挙動: 送信時 `POST /api/events/:eventId/schedules { name: "集合", startAt, endAt, location: {lat,lng,label} }` + その schedule に対し `POST /api/schedules/:sid/features { kind: "meetup", config: { kind:"meetup", location: { inherit: true }, checkInEnabled: true } }` → `/e/:eventId` (ホーム) へ。

### 12.4 `/e/:eventId` イベントホーム (管理者版)

Figma 02 右から 2 列目に対応。

```
┌─────────────────────────┐
│ 大阪旅行           [⋯]  │  ← 22px font-bold、[⋯] で「URL共有」「設定」
│                         │
│ ── アナウンス ─────────  │  ← セクション見出し ink-500
│ ┌─────────────────────┐ │
│ │ ここに textarea     │ │  ← textarea (host のみ表示、send ボタン付き)
│ └─────────────────────┘ │
│             [ 送信 ]    │
│                         │
│ ── スケジュール  + ──── │  ← `+` で Schedule 編集 Sheet を開く
│ ┌─────────────────────┐ │
│ │ 10:00 東京駅集合    │ │  ← 完了未完了でアイコン違う
│ │ 14:00 ホテルチェックイン│ │
│ │ 18:00 居酒屋        │ │
│ └─────────────────────┘ │
│                         │
│ ── メンバー ─────────── │
│ ◯◯◯◯◯ +5             │  ← <Avatar> 横並び
│                         │
│ ── チャット ─────────── │
│ ┌─────────────────────┐ │
│ │ 〔メッセージリスト〕│ │  ← 5s polling
│ │ ┌──────────┐ ┌────┐ │ │
│ │ │ 入力     │ │送信│ │ │
│ │ └──────────┘ └────┘ │ │
│ └─────────────────────┘ │
│                         │
│ [▶ 進行を見る]          │  ← active schedule あり時のみ表示、`/progress` へ
└─────────────────────────┘
```

### 12.5 `/e/:eventId` イベントホーム (一般版)

アナウンス textarea は **読み取り専用カード** に変わる。Schedule 一覧の `+` は出ない。それ以外は同じ。

```
│ ── アナウンス ─────────  │
│ ┌─────────────────────┐ │
│ │ 明日だよー (host より)│ │  ← latest 1 件、`+` で過去 20 件モーダル展開
│ └─────────────────────┘ │
```

`/e/:eventId` を非 host・active schedule あり状態で開いた場合は §7.9.3 で `/progress` リダイレクト。

### 12.6 Schedule 編集 Sheet `<ScheduleEditSheet>`

Figma 02 中央列。Bottom Sheet 形式 (`rounded-t-3xl`、画面下 80% 占有)。

```
┌─────────────────────────┐
│ ──── スケジュール編集 ──│  ← 上端 grabber
│            保存         │  ← 右上 (brand-500 text)
│ 東京駅集合              │  ← title 入力 (大きめ text-2xl)
│                         │
│ ┌──────┐  ~  ┌──────┐  │  ← 開始 〜 終了 (datetime-local 2 つ)
│ │開始  │     │終了  │   │
│ └──────┘     └──────┘   │
│                         │
│ ── 集合場所 ──────────  │
│ ┌─────────────────────┐ │
│ │    <Map>            │ │  ← 160px
│ │ 📍 東京駅           │ │
│ └─────────────────────┘ │
│                         │
│ ── 機能を追加  + ────── │  ← 行ごとにトグル
│ [集合]            (○──)│  ← トグル ON で meetup feature 追加
│ [持ち物確認]      (──○)│
│                         │
│ ── 参加メンバー ─────── │
│ ◉ 全員                  │  ← トグル
│ ◯ 個別指定 → アバター   │
│                         │
│ ── 概要・メモ ────────  │
│ ┌─────────────────────┐ │
│ │ textarea            │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

挙動:
- `保存` で `POST` or `PATCH` (新規 / 編集分岐)
- 機能トグル ON で **schedule 保存と同時** に feature が追加される (`POST /schedules/:sid/features`)、OFF で削除 (`DELETE`)。トグル UI 自体は楽観更新、失敗時 onError で rollback
- 「集合」trigger は `kind=meetup`、`config.location.inherit=true` を初期値。詳細編集は `<MeetupSheet>` で
- 「持ち物確認」trigger は `kind=checklist`、`config.items = []` 空で作る → `<ChecklistSheet>` で items 入力させる (空のまま `保存` は `400` で弾く)

### 12.7 集合 Feature 詳細 Sheet `<MeetupSheet>`

Figma 01 左下のホテルチェックイン詳細 + Figma 02 左の「集合場所」セクションをハイブリッド。

```
┌─────────────────────────┐
│ ←  集合 (meetup)        │
│            保存         │  ← host: 編集モード時
│                         │
│ ── 集合場所 ──────────  │
│ ◉ Schedule の場所を継承 │  ← トグル
│ ◯ 別の場所を指定        │  ← 選択で下に map + label 入力
│ ┌─────────────────────┐ │
│ │     <Map>           │ │
│ │  📍 東京駅 中央口    │ │
│ └─────────────────────┘ │
│                         │
│ ── 到着しましたか? ──── │  ← member 視点 UI、host も同じ
│ ┌───────────────────┐   │
│ │  到着しました      │  │  ← brand-500 button。押すと PUT state.checkedInAt
│ └───────────────────┘   │
│ あなたは到着済みです    │  ← state.checkedInAt 有りで表示変化
│                         │
│ ── 集合状況 ──────────  │
│ 3 / 5 人が集合済み      │  ← aggregate.checkedInCount / totalMembers
│ ●●●○○                  │
└─────────────────────────┘
```

### 12.8 持ち物確認 Feature 詳細 Sheet `<ChecklistSheet>`

Figma 01 左に対応。

```
┌─────────────────────────┐
│ ←  持ち物確認 (checklist)│
│            保存         │  ← host: 編集モード時のみ
│                         │
│ ── リスト編集 (host) ── │  ← host のみ、member は非表示
│ □ パスポート          ✕│  ← 行ごとに ✕ 削除
│ □ 充電器              ✕│
│ + アイテムを追加        │
│                         │
│ ── あなたのチェック ─── │  ← 全員表示
│ ☑ パスポート            │  ← タップで PUT state.checked[id]
│ ☐ 充電器                │
│                         │
│ ── 全員の進捗 ────────  │
│ 2 / 5 人が完了           │  ← aggregate.doneCount / totalMembers
│ パスポート  4/5         │  ← perItem (host のみ表示)
│ 充電器      3/5         │
└─────────────────────────┘
```

挙動:
- host のみ items の編集可、member は自分の `state.checked` 操作のみ可
- 「完了 (全アイテム済)」判定は `required=true` 全てが true。`required=false` は集計対象外 (§7.5.6)

### 12.9 進行ページ `/e/:eventId/progress`

Figma 03 全体に対応。`current` が null かどうかで 3 状態。

#### 12.9.1 normal (current あり)

```
┌─────────────────────────┐
│ 大阪旅行         [⌂]    │  ← [⌂] でホームへ (host のみ)
│ 現在のスケジュール       │  ← ink-500 text-sm
│ 東京駅集合      10:00   │  ← text-3xl font-bold + 時刻 (tabular-nums)
│                         │
│ ┌── Announcement ─────┐│
│ │ 明日だよー          │  │ ← latest 1、tap で全件 modal
│ └─────────────────────┘ │
│                         │
│ ── 機能 ─────────────── │  ← chip 横並び、tap で各 Sheet
│ [📍 集合] [☑ 持ち物]    │
│                         │
│ ┌─ 集合 (折りたたみ) ──┐│
│ │  3/5 人集合済み       │ ← summary 表示、tap で Sheet 開く
│ └─────────────────────┘ │
│ ┌─ 持ち物 ─────────────┐│
│ │  2/5 人完了          │
│ └─────────────────────┘ │
│                         │
│ ── 次の Schedule ───── │
│ 14:00 ホテルチェックイン │
│                         │
│ ── チャット ─────────── │
│ ┌─────────────────────┐ │
│ │ (schedule chat 2s)  │ │
│ └─────────────────────┘ │
│                         │
│ [← 前へ]   [完了]  [次→]│  ← 前/次は host/member 両方、完了は誰でも
└─────────────────────────┘
```

#### 12.9.2 イベント開始前 (current=null, next あり)

```
│ まだ始まっていません    │
│ 次: 10:00 東京駅集合    │
│ [← ホームへ戻る]        │
```

#### 12.9.3 イベント終了 (current=null, prev あり, next なし)

```
│ おつかれさまでした!     │
│ 最後: 18:00 居酒屋      │
│ [← ホームへ戻る]        │
```

### 12.10 URL 共有 Sheet `<ShareSheet>`

```
┌─────────────────────────┐
│ ────── URL を共有 ───── │
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   <QR code>     │   │  ← qrcode.react、 220x220
│   │                 │   │
│   └─────────────────┘   │
│                         │
│ https://omatase.appily..│  ← ink-500 truncate
│                         │
│ ┌───────────────────┐   │
│ │ URL をコピー       │  │  ← brand-500、押すと `コピー済` → 2s 後復帰
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ 共有...            │  │  ← `navigator.share` 利用可なら brand-100
│ └───────────────────┘   │
└─────────────────────────┘
```

### 12.11 ゲスト参加 `/e/:eventId/join`

```
┌─────────────────────────┐
│ あなたを招待中           │  ← ink-500
│ 大阪旅行                 │  ← text-2xl font-bold
│                         │
│ あなたの表示名           │
│ ┌─────────────────────┐ │
│ │ たんり               │ │  ← maxLength=40
│ └─────────────────────┘ │
│                         │
│ ┌───────────────────┐   │
│ │   参加する          │  │  ← brand-500
│ └───────────────────┘   │
└─────────────────────────┘
```

挙動: 送信時 `signInAsGuest(name)` → `POST /api/events/:eventId/join` → `/e/:eventId` (event hub) へ。既ログイン (anonymous) かつ別 event の場合は同じユーザーで join のみ実行。

---

## 13. 画面遷移図 (mermaid)

```mermaid
stateDiagram-v2
  [*] --> Landing : /
  Landing --> Create : 「+ イベントを作る」
  Create --> CreateWhere : つぎへ (POST /events)
  CreateWhere --> EventHomeHost : イベント開始 (POST /schedules + features)
  EventHomeHost --> ScheduleEditSheet : + or 行 tap
  ScheduleEditSheet --> EventHomeHost : 保存 / 閉じる
  EventHomeHost --> ShareSheet : ⋯ → URL共有
  ShareSheet --> EventHomeHost
  EventHomeHost --> ProgressPage : ▶ 進行 (active 時のみ)
  ProgressPage --> FeatureSheet : feature chip tap
  FeatureSheet --> ProgressPage
  ProgressPage --> EventHomeHost : ⌂ (host のみ)

  Landing --> GuestJoin : 共有URL閲覧
  GuestJoin --> EventHomeMember : 参加 (signIn + join)
  EventHomeMember --> ProgressPage : auto redirect (active 時, non-host)
  EventHomeMember --> ScheduleDetail : 行 tap (read only)
```

---

## 14. 開発手順 (Developer 向け)

1. `npm i` で依存解決
2. `cp .env.example .env`、`BETTER_AUTH_SECRET` を `openssl rand -base64 32` で発行
3. `npx @better-auth/cli generate --output src/server/db/auth-schema.ts` で auth schema 自動生成 (anonymous 込み)
4. `npm run db:generate` → `npm run db:migrate` で SQLite 初期化
5. `npm run dev` (server :8080 + client :5173、Vite proxy で /api → :8080)
6. テスト: `npm test`
7. ビルド検証: `npm run build` → `node dist/server/index.js` で 1 コンテナ動作確認

設計 doc に書かれた **挙動仕様 §7** を Reviewer はそのままテストに落とす。Developer は挙動仕様を実装の真実とし、UI モック (§12) は **配置の正解**、API シグネチャ (§6) は **接続点の正解**、データモデル (§5) は **永続化の正解** として参照する。

---

## 15. ナレッジ追記指針 (Reviewer / Developer の振り返り用)

このプロジェクトで新規に得られそうな知見の格納先:

- **Tailwind v4 CSS-first config を Vite + Vitest で運用するハマり所** → `Muraki/knowledge/library/tailwind-v4-vite-vitest.md`
- **Hono の `serveStatic` + SPA fallback の確定パターン** → `Muraki/knowledge/library/hono-serve-static-spa.md`
- **better-auth anonymous + Hono Drizzle SQLite 実動例** → 既存 `Muraki/knowledge/library/better-auth-hono-drizzle-sqlite.md` に追記
- **TanStack Query polling × visibility × 集約 endpoint** → 既存 `Muraki/knowledge/pattern/tanstack-query-polling-strategy.md` に運用知見追記
- **polymorphic Feature plugin の per-user state テーブル運用** → 既存 `Muraki/knowledge/pattern/polymorphic-feature-plugin-sqlite.md` に追記
- **OMATASE プロダクト固有 (色トークン、語彙、画面遷移)** → `Muraki/projects/omatase-demo/.knowledge/design-tokens.md` 作成可

追記後は `python3 Muraki/scripts/gen-knowledge-index.py` で INDEX 再生成。
