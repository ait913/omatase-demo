---
title: OMATASE-demo Pre-design Research Summary
category: library
project: omatase-demo
tags: [pre-design, better-auth, hono, drizzle, sqlite, tanstack-query, polling, feature-plugin, polymorphic]
created: 2026-05-26
sources:
  - https://www.better-auth.com/docs/plugins/anonymous
  - https://www.better-auth.com/docs/integrations/hono
  - https://www.better-auth.com/docs/adapters/drizzle
  - https://www.better-auth.com/docs/concepts/session-management
  - https://www.better-auth.com/docs/concepts/cookies
  - https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/anonymous/index.ts
  - https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/anonymous/types.ts
  - https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/db/internal-adapter.ts
  - https://github.com/LovelessCodes/hono-better-auth (Hono+Drizzle+better-auth SQLite 実動)
  - https://tanstack.com/query/latest/docs/framework/react/guides/polling
  - https://www.dbpro.app/blog/sqlite-json-virtual-columns-indexing
  - https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
  - https://www.pkgpulse.com/blog/tanstack-router-vs-react-router-v7-2026
  - npm view (2026-05-26): better-auth@1.6.11, hono@4.12.23, drizzle-orm@0.45.2, react@19.2.6, react-leaflet@5.0.0, @tanstack/react-query@5.100.14, @tanstack/react-router@1.170.8
---

## Context

OMATASE (URL 共有で待ち合わせ・イベント進行) MVP の設計**前**リサーチ。Hono + Drizzle + SQLite + better-auth(anonymous) を初採用するため、各 API の存在確認・連携パターン・設計上の落とし穴を確定する。

既存 [`library/better-auth-2026.md`](../../../knowledge/library/better-auth-2026.md) は **Next.js + Prisma 前提**。Hono + Drizzle 版の差分はこの doc に集約。

## 1. better-auth anonymous plugin の API (確定)

### 提供形態

- ✅ **公式 plugin として存在**: `import { anonymous } from "better-auth/plugins"` (`@better-auth/anonymous` という別パッケージは**存在しない**、本体に同梱)
- クライアント側: `import { anonymousClient } from "better-auth/client/plugins"` → `authClient.signIn.anonymous()`
- 公式 docs: <https://www.better-auth.com/docs/plugins/anonymous>

### サーバ endpoint 仕様 (`POST /api/auth/sign-in/anonymous`)

ソース [`packages/better-auth/src/plugins/anonymous/index.ts`](https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/anonymous/index.ts) を確認した:

- **body schema が無い** — `signInAnonymous` endpoint は body を取らない (ctx.body 未参照)。**つまり「クライアントから名前を渡す」公式 API は存在しない**
- 内部処理: `generateName(ctx)` で名前生成 → `generateRandomEmail()` で dummy email 生成 → `internalAdapter.createUser({ email, name, isAnonymous: true, ... })` → `createSession(userId)` → `setSessionCookie(ctx, { session, user })` → `ctx.json({ token, user })`

### `AnonymousOptions` 完全シグネチャ (verbatim from source)

```ts
export interface AnonymousOptions {
  emailDomainName?: string;
  generateRandomEmail?: () => string | Promise<string>;
  onLinkAccount?: (data: {
    anonymousUser: { user: UserWithAnonymous; session: Session };
    newUser: { user: User; session: Session };
    ctx: GenericEndpointContext;
  }) => Awaitable<void>;
  disableDeleteAnonymousUser?: boolean;
  generateName?: (
    ctx: EndpointContext<"/sign-in/anonymous", { method: "POST" }, AuthContext>
  ) => Awaitable<string>;
  schema?: InferOptionSchema<typeof schema>;
}
```

★ **重要**: `generateName` は `ctx` (request コンテキスト) を受け取るので、**カスタムヘッダから name を読み取れる**:

```ts
anonymous({
  generateName: (ctx) => ctx.request?.headers.get("x-guest-name") ?? "Anonymous",
})
```

### User 表に必須追加されるフィールド

- `isAnonymous` (boolean, optional)
- email は **必須 + unique** のままなので、anonymous user 用に `generateRandomEmail()` で `<uuid>@anon.local` 等を生成 (デフォルト挙動でも生成される)

### 実装方針: 3案比較

| 案 | クライアント側操作 | サーバ実装 | 評価 |
|---|---|---|---|
| **A: 2 リクエスト** | `signIn.anonymous()` → `auth.api.updateUser({ name })` | デフォルトの anonymous plugin のみ | シンプル。失敗ハンドリングが 2 段 |
| **B: 独自 endpoint** | `POST /api/guest { name }` の 1 リクエスト | Hono に独自 route。内部で `auth.api.signInAnonymous` + `updateUser` を順次呼ぶ | アトミック・1 ラウンドトリップ |
| **C: カスタムヘッダ** | `signIn.anonymous({ fetchOptions: { headers: { "x-guest-name": name } } })` | `generateName: ctx => ctx.request.headers.get("x-guest-name") ?? ...` | 1 リクエスト・公式 plugin そのまま使う。**推奨** |

★ **設計含意**: **C 案が最もシンプルで betterauth の流儀に沿う**。`updateUser` を後追いするケースは「途中で名前変更したい」場合に温存。

### Session TTL & Cookie 設定

ソース [`packages/better-auth/src/db/get-tables.ts`](https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/db/get-tables.ts) と docs より:

- デフォルト: `session.expiresIn = 60*60*24*7` (7日), `updateAge = 60*60*24` (1日ごとに延長)
- 数週間〜数ヶ月の cookie 保持要件は `expiresIn: 60*60*24*30` (30日) など簡単に設定可
- cookie maxAge は session の expiresAt に追随 (`updateAge` 経過時に session 行と cookie の両方更新)
- cookie 名: デフォルト `better-auth.session_token` (HMAC-signed via `BETTER_AUTH_SECRET`、形式は [既存 gotcha](../../../knowledge/gotcha/better-auth-test-cookie-must-match-hono-signed-format.md) 参照)

★ **設計含意**: 「Cookie 保持 = 数週間 OK」要件は `betterAuth({ session: { expiresIn: 60*60*24*30, updateAge: 60*60*24 } })` で達成。

## 2. Hono + Drizzle + SQLite + better-auth 最小構成 (確定)

実動 reference: <https://github.com/LovelessCodes/hono-better-auth> (better-auth 1.4.x、libsql、Bun 想定)。better-auth 1.6.x への素直な置換 + better-sqlite3 + Node.js 化が可能。

### 依存 (2026-05-26 時点 npm 最新版)

```json
{
  "dependencies": {
    "better-auth": "^1.6.11",
    "@better-auth/cli": "^1.4.21",
    "@better-auth/drizzle-adapter": "^1.6.11",
    "drizzle-orm": "^0.45.2",
    "better-sqlite3": "^12.10.0",
    "hono": "^4.12.23",
    "@hono/node-server": "^2.0.4",
    "@hono/zod-validator": "^0.8.0",
    "zod": "^4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.10",
    "@types/better-sqlite3": "^7"
  }
}
```

★ 注: better-auth 公式が依存に `kysely@0.28`, `zod@4` を持ち込む。zod は v4 を採用 (これは Architect が `@hono/zod-validator@0.8` も同じ zod v4 系を使うため安全)。

### `src/auth.ts` (verbatim 参照 + anonymous 追加)

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { anonymous } from "better-auth/plugins";
import { db } from "./db";
import * as authSchema from "./db/auth-schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge:  60 * 60 * 24,     // refresh once a day
  },
  plugins: [
    anonymous({
      generateName: (ctx) => ctx.request?.headers.get("x-guest-name") ?? "ゲスト",
      // emailDomainName: "omatase.local" → email は <uuid>@omatase.local 形式に
    }),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL!, ...(process.env.ALLOWED_ORIGINS?.split(",") ?? [])],
});
```

### `src/db/auth-schema.ts` (anonymous フィールド追加版)

LovelessCodes/hono-better-auth から流用 + anonymous plugin が要求する `isAnonymous` を追加:

```ts
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
// session / account / verification は LovelessCodes 版そのまま
```

★ **更に簡単な方法**: `npx @better-auth/cli generate` を auth.ts に対して走らせると、anonymous plugin 込みの drizzle schema を自動生成してくれる (公式 docs に明記)。手書きで間違える前にこれを実行する。

### `src/index.ts` (Hono mount)

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "./auth";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use("/api/*", cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
  credentials: true,
  allowMethods: ["GET","POST","PATCH","DELETE","OPTIONS"],
}));

// session を c.var に load する middleware
app.use("/api/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

// better-auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// 業務 API routes
// app.route("/api/events", eventsRouter);
// ...

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) });
}
```

★ **app export の作法** ([既存 gotcha](../../../knowledge/gotcha/design-must-specify-app-export-path-for-tests.md) 参照): 設計 doc に **`src/app.ts` から `export const app`、`src/index.ts` は薄い serve wrapper** を必ず明記すること。テスト時 `import { app } from "../../src/app"` → `app.request(path, init)` で叩く。

### Migrations: `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts", // auth-schema + 業務 schema 全部 re-export
  dialect: "sqlite",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:dev.db" },
});
```

運用: `bunx drizzle-kit generate` で migration SQL 生成 → `bunx drizzle-kit migrate` で適用。

### 既存 `better-auth-2026.md` (Next.js+Prisma) との差分まとめ

| 項目 | Next.js + Prisma 版 | Hono + Drizzle 版 |
|---|---|---|
| adapter | `prismaAdapter(prisma, { provider: "sqlite" })` | `drizzleAdapter(db, { provider: "sqlite", schema: authSchema })` |
| Handler mount | `app/api/auth/[...all]/route.ts` で `toNextJsHandler(auth)` | `app.on(["POST","GET"], "/api/auth/**", c => auth.handler(c.req.raw))` |
| Cookie plugin | `nextCookies()` を `plugins` に追加 | **不要** (Hono raw response で完結) |
| Session 取得 | `auth.api.getSession({ headers: await headers() })` (Server Component) | `auth.api.getSession({ headers: c.req.raw.headers })` (middleware) |
| Schema 生成 | `npx @better-auth/cli generate --output prisma/schema.prisma` | `npx @better-auth/cli generate` → drizzle schema 出力 |
| CORS | App Router で middleware.ts | `app.use("/api/*", cors({...credentials: true}))` |

## 3. TanStack Query Polling 設計 (確定)

### 推奨 refetchInterval 値

| 場面 | 値 | 根拠 |
|---|---|---|
| Schedule チャット (active) | `2000` (2s) | 公式 docs に「リアルタイム性が必要な場面の典型値」として記載 |
| Event チャット (background tab 可能) | `5000` (5s) | active 時より緩く |
| 進行ページ「現在の Schedule」 | `10000` (10s) | 時刻ベース判定なので 10 秒粒度で十分 |
| アナウンス・参加者リスト | `30000` (30s) | 更新頻度低い |
| 持ち物チェック (集計) | `5000` (5s, 集合直前) / `15000` (それ以外) | dynamic interval |

### 動的制御パターン (★推奨)

```ts
useQuery({
  queryKey: QK.scheduleChat(scheduleId),
  queryFn: ...,
  refetchInterval: (query) => {
    // タブが見えてない時は止める (default で window focus 制御するが、明示しても良い)
    if (document.visibilityState !== "visible") return false;
    // Schedule が completed なら止める
    if (query.state.data?.scheduleStatus === "completed") return false;
    return 2000;
  },
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  staleTime: 0, // polling 時は stale 即時
});
```

★ 設計含意:
1. **チャット polling は visibility と schedule status の 2 条件で停止**
2. `refetchIntervalInBackground: false` (デフォ) を**明示**して、tab が背景の時 SQLite 負荷をかけない
3. `staleTime: 0` で polling 結果を即時反映

### SQLite 負荷見積もり (Polling 1req = read 1〜3 SQL)

- better-sqlite3 + WAL mode で読み込みは **microsec 〜 1ms 単位**、Node.js 単一 worker でも 5000 req/sec は捌ける (公式 perf 記述)
- 想定スケール: MVP 同時 50 イベント × 平均 10 接続 = 500 client active = 500/2s = 250 req/sec のチャット polling → 余裕
- 書き込み (メッセージ送信) は serialize される (WAL でも writer は単一) が、毎秒数十のメッセージなら詰まらない
- **★ WAL mode を必ず有効化**: `db.pragma("journal_mode = WAL")` を Drizzle 接続時に実行

### SSE / WebSocket と比較した Polling 採用根拠

| 観点 | SSE | WebSocket | Polling (Touri 確定) |
|---|---|---|---|
| Coolify 単一 container 運用 | 接続数で FD 上限詰まる | 同上 + 状態管理重い | ✅ stateless |
| 切断検出 | hard (heartbeat 必要) | easy (ping/pong) | ✅ next poll で気付く |
| 実装コスト | 中 | 高 (再接続 / 認証) | ✅ low |
| 遅延 | <1s | <100ms | 2-30s (用途別) |
| デバッグ | network tab で見える | binary 多くて辛い | ✅ network tab で完全可視 |

★ **Polling 採用の正当化**: MVP・遅延数秒許容・Coolify 1 container・SQLite 単一書き込み → Polling 一択。SSE/WS は Phase 2 で再考可能 (フロント側 hook を入れ替えるだけ)。

別 knowledge 化候補: [`pattern/tanstack-query-polling-strategy.md`](#) (本書から内容コピー、generalize)。

## 4. Feature プラグイン基盤 DB 設計 (確定)

### 3 案比較

| 案 | スキーマ | Pros | Cons |
|---|---|---|---|
| **A: 単一テーブル + JSON** | `schedule_feature(id, schedule_id, kind, config_json, position)` | ✅ 新 kind 追加で migration 不要<br>✅ Drizzle 1 テーブル定義<br>✅ JSON で柔軟 | 型安全は zod スキーマで補強必要 |
| **B: per-kind テーブル** | `meetup_feature(...)`, `checklist_feature(...)`, ... | 強い型 | ✅ kind 追加毎に migration<br>✅ 取得時に N 種 JOIN |
| **C: manifest + per-kind** | `schedule_feature(id, schedule_id, kind, position)` + `meetup_feature_data(feature_id, ...)` | バランス | A の柔軟性 + B の手間 |

### 推奨: A 案 (単一テーブル + JSON)

```ts
export const scheduleFeature = sqliteTable("schedule_feature", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedule.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["meetup", "checklist"] }).notNull(), // 将来 enum を緩める
  config: text("config", { mode: "json" }).$type<FeatureConfig>().notNull(),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("schedule_feature_schedule_idx").on(t.scheduleId),
]);
```

`FeatureConfig` は discriminated union (zod):

```ts
const meetupConfigSchema = z.object({
  kind: z.literal("meetup"),
  location: z.union([
    z.object({ inherit: z.literal(true) }), // schedule.location を継承
    z.object({ inherit: z.literal(false), lat: z.number(), lng: z.number(), label: z.string() }),
  ]),
  qrCheckIn: z.boolean().default(true),
});
const checklistConfigSchema = z.object({
  kind: z.literal("checklist"),
  items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    required: z.boolean().default(true),
  })),
});
export const featureConfigSchema = z.discriminatedUnion("kind", [
  meetupConfigSchema, checklistConfigSchema,
]);
export type FeatureConfig = z.infer<typeof featureConfigSchema>;
```

★ **設計含意**:
1. **新 kind 追加は zod schema に 1 行 + (必要なら) UI コンポーネント追加のみ**。DB migration ゼロ
2. **kind enum を Drizzle 側で緩める** ことで「テーブル定義は触らず plugin 追加可」を実現
3. **state (checklist の個人別チェック状態) は別テーブル**: `schedule_feature_state(feature_id, user_id, state_json, updated_at)`。理由は state は per-user で更新頻度が高く、config と life cycle が違うため

### 集合 Feature の「場所継承」表現

config_json で `{ kind: "meetup", location: { inherit: true } }` または `{ inherit: false, lat, lng, label }` を持つ。クエリ時は backend で:

```ts
const f = await db.select().from(scheduleFeature).where(eq(scheduleFeature.id, id));
const s = await db.select().from(schedule).where(eq(schedule.id, f.scheduleId));
const location = f.config.location.inherit ? s.location : f.config.location;
```

`json_extract(config, '$.location.inherit')` を index 化したくなる場面は MVP 想定では無い (1 schedule あたり Feature ~5、件数少)。

### State テーブル設計 (持ち物チェック例)

```ts
export const scheduleFeatureState = sqliteTable("schedule_feature_state", {
  featureId: text("feature_id").notNull().references(() => scheduleFeature.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  state: text("state", { mode: "json" }).$type<ChecklistState>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.featureId, t.userId] }),
]);
```

集計 (「全員揃った?」) は `SELECT COUNT(*) FROM schedule_feature_state WHERE feature_id = ? AND json_extract(state, '$.allChecked') = 1` で取れる。MVP では Feature コード側で集計しても良い。

別 knowledge 化候補: [`pattern/polymorphic-feature-plugin-sqlite.md`](#)

## 5. SQLite で「現在の Schedule」効率取得 (確定)

### Index 戦略

```ts
export const schedule = sqliteTable("schedule", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
  // ... location, members, memo (json)
  status: text("status", { enum: ["upcoming", "active", "completed"] }).default("upcoming").notNull(),
}, (t) => [
  index("schedule_event_time_idx").on(t.eventId, t.startAt, t.endAt),
  index("schedule_event_status_idx").on(t.eventId, t.status),
]);
```

クエリ:
```sql
SELECT * FROM schedule
WHERE event_id = ? AND start_at <= ? AND ? < end_at
ORDER BY start_at LIMIT 1;
```

`(event_id, start_at, end_at)` 複合 index は左端マッチで効く。Schedule 数 20-30/event、Event 数 1000 規模なら microsec 単位で返る。

### "前/次の Schedule" 取得

```sql
-- 前の Schedule (現在より過去で最も近い)
SELECT * FROM schedule WHERE event_id = ? AND end_at <= ? ORDER BY end_at DESC LIMIT 1;
-- 次の Schedule (現在より未来で最も近い)
SELECT * FROM schedule WHERE event_id = ? AND start_at > ? ORDER BY start_at ASC LIMIT 1;
```

同じ index でカバー。

### Polling 1 req のコスト見積もり

進行ページ 1 req = 以下を 1 transaction で:
1. event 1 行
2. 現在の schedule 1 行 (前述クエリ)
3. その schedule の features (~5 行)
4. announcement 最新 1 件
5. (オプション) 現在ユーザーの checklist state ~5 行

5-10 row read、すべて index hit、better-sqlite3 で **1ms 未満** が現実的。10 req/sec/event × 100 events で 1000 req/sec 余裕。

★ **設計含意**: schedule.status カラムを持たせるが、**実時刻判定を優先**してフォールバック (= status カラムは最終手段 / 表示キャッシュ)。理由: 時計同期前提でリアルタイム計算が確実。「completed への手動前倒し」のみ status を WRITE。

## 6. 旧 mock コード資産の流用 (確定)

旧 PJ: `Muraki/projects/omatase-design-mock/` (依存: React 19, react-leaflet 5, react-router-dom 7, leaflet 1.9.4)

### 流用判断

| コンポーネント | 流用可否 | 理由 |
|---|---|---|
| `MapSection` (react-leaflet ラッパー) | ✅ そのまま | 依存バージョン整合済 |
| `MobileFrame` (mockup 用 frame) | ✅ DEMO 用に流用 | DEMO 訴求に有用 |
| `ChatBox` (UI 部分のみ) | ⚠ ロジック書き直し | mock は in-memory、本実装は TanStack Query polling |
| `Avatar` | ✅ そのまま | 依存ゼロ |
| `lib/` の mock 関数 | ❌ 全削除 | 本 PJ は実 BE |
| `mocks/` data | ❌ 全削除 | 同上 |
| `pages/` の構成 | ⚠ 参考に新規 | Plan 語彙残存、Schedule に書き直し |

### Router 選択: ★ TanStack Router を新規採用 (推奨)

理由:
- Event > Schedule > 進行 の段階遷移で **search params の型安全** が効く (`/event/:id?currentSchedule=...`)
- TanStack Query と作者が同じで cache 連携 ([gotcha: factory test memory history](../../../knowledge/gotcha/tanstack-router-factory-test-memory-history.md) 既知)
- Atender で既に採用実績 → Reviewer / Developer が同パターンで動ける
- react-router-dom v7 は framework mode が full-stack 寄り、本 PJ の純 SPA 用途には冗長

★ **設計含意**:
1. 旧 mock の `MapSection` `MobileFrame` `Avatar` は流用、`ChatBox` は UI 殻のみ
2. **Router は TanStack Router に切り替え**、旧 react-router-dom 依存は持ち込まない
3. テスト helper は `createAppRouter(queryClient)` factory パターン + memory history 注入 (既存 gotcha 通り)

### バージョン整合チェック (2026-05-26 npm 最新)

| パッケージ | 推奨バージョン | 旧 mock | 備考 |
|---|---|---|---|
| react | 19.2.6 | ^19.1.0 | 互換 |
| react-leaflet | 5.0.0 | 5.0.0 | OK |
| leaflet | 1.9.4 | 1.9.4 | OK |
| vite | 8.0.14 | 6.3.5 | ★ **v8 採用** (新規 PJ なら最新で) |
| vitest | 4.1.7 | 3.1.4 | ★ **v4 採用** |
| tailwindcss | 4.3.0 | 3.4.17 | ★ **v4 採用** (CSS-first config に変わるので注意) |
| @tanstack/react-query | 5.100.14 | 未使用 | 新規 |
| @tanstack/react-router | 1.170.8 | 未使用 | 新規 |

★ **設計含意**: **Tailwind v4 の CSS-first config (PostCSS plugin 不要、`@theme` directive)** に切り替わる。旧 mock の `tailwind.config.ts` 流儀は使わない。Architect は v4 流儀で書く ([Tailwind v4 docs](https://tailwindcss.com/blog/tailwindcss-v4)) 必要があれば次フェーズで再リサーチ。

## 設計への含意 (Architect 向け要点)

1. ★ **anonymous + 名前**: C 案 (カスタムヘッダ `x-guest-name` + `generateName` で読む) を採用、独自 endpoint 不要
2. ★ **app export 規約**: `src/app.ts` から `export const app`、`src/index.ts` は薄い serve wrapper (既存 gotcha 厳守)
3. ★ **session TTL**: `expiresIn: 30日, updateAge: 1日` で Cookie 持続要件達成
4. ★ **Feature プラグイン DB**: 単一テーブル + JSON config + 別 state テーブル (per-user state 用)
5. ★ **WAL mode 必須**: `db.pragma("journal_mode = WAL")` を接続時に
6. ★ **Polling refetchInterval**: dynamic (visibility + schedule status で停止)、IntervalInBackground:false 明示
7. ★ **Router 切替**: react-router-dom → TanStack Router (旧 mock からの移行)
8. ★ **Tailwind v4 採用**: 設定方式が CSS-first に変わる点を設計 doc に明記
9. ★ **better-auth schema 生成**: 手書きせず `npx @better-auth/cli generate` を migration 前に実行
10. ★ **CORS**: 開発時は credentials:true 必須 (cookie 含むため)、`trustedOrigins` も同時設定

## 関連既存 knowledge (再掲)

- [`library/better-auth-2026.md`](../../../knowledge/library/better-auth-2026.md) — Next.js+Prisma 版、本 doc が Hono+Drizzle 差分
- [`library/lucia-deprecated-2025.md`](../../../knowledge/library/lucia-deprecated-2025.md) — Lucia 不採用
- [`pattern/tanstack-query-invalidation-matrix.md`](../../../knowledge/pattern/tanstack-query-invalidation-matrix.md) — mutation 後の invalidate
- [`gotcha/better-auth-test-cookie-must-match-hono-signed-format.md`](../../../knowledge/gotcha/better-auth-test-cookie-must-match-hono-signed-format.md) — テスト時 cookie 形式
- [`gotcha/tanstack-router-factory-test-memory-history.md`](../../../knowledge/gotcha/tanstack-router-factory-test-memory-history.md) — Router テスト
- [`gotcha/design-must-specify-app-export-path-for-tests.md`](../../../knowledge/gotcha/design-must-specify-app-export-path-for-tests.md) — app export 必須明示
- [`gotcha/leaflet-zindex-vs-modal.md`](../../../knowledge/gotcha/leaflet-zindex-vs-modal.md) — modal z-index
- [`gotcha/jsdom-getboundingclientrect-zero.md`](../../../knowledge/gotcha/jsdom-getboundingclientrect-zero.md) — テスト時の jsdom 制限

## 不確定事項

- **Tailwind v4 の CSS-first config 詳細**: 採用したが、設計 doc 執筆時に Architect が改めて調査要 (postcss.config.js / vite.config.ts の書き方変更)
- **Vitest v4 の breaking changes**: v3 → v4 で `vi.hoisted` API 周辺変更ありえる、Reviewer 召集前に要確認
- **`auth.api.signInAnonymous` の呼び出し可否**: 公式 docs に明記なし。client (browser) からは `authClient.signIn.anonymous()` を使う想定。server から呼ぶ独自 endpoint で `auth.api.signInAnonymous({ headers, asResponse: true })` が動くかは未検証 (anonymous plugin の endpoint 命名が完全に固定なら呼べる、要 1 リクエスト試作)
- **react-leaflet v5 + TanStack Router の SSR 互換性**: 本 PJ は SPA なので問題なし、念のため
