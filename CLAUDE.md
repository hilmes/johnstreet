# Claude Code Project Standards  
**Unified Telemetry, Caching, and UI Conventions (Node + Browser + Edge)**  
_See **DESIGN.md** for **visual design & UX** (components, layout, tokens, and viewer UI)._

## Platform Priorities
1. **Caching:** Always prefer `UnifiedCacheService` for reads/writes/invalidation. Do **not** wire multiple bespoke caches in a project.  
2. **Runtime:** Default to **Vercel Edge Runtime** compatibility. Avoid Node‑only APIs in shared utilities.  
3. **UI:** Use **HeroUI** (formerly ReactUI) as the default component library in React projects.

---

## Quick Start

### Server / API Entry (Edge‑safe)
```ts
// ESM/TS recommended; CJS variants available
import { initializeLogger } from '@hilmes/unified-logging';
import { UnifiedCacheService } from '@hilmes/unified-cache'; // runtime-aware cache facade

const logger = initializeLogger();               // honors hot-fix defaults in dev
const cache  = UnifiedCacheService.initialize(); // picks best backend per runtime

export { logger, cache };
```

### Next.js (App Router) – Route Handler (Edge)
```ts
// app/api/users/route.ts
export const runtime = 'edge';
export const revalidate = 60; // ISR-like cache for static-ish responses

import { logger, cache } from '~/server/init';

export async function GET() {
  const key = 'users:list:v1';
  const data = await cache.wrap(key, { ttl: 60 }, async () => {
    // Use fetch with Next.js request cache hints (Edge-safe)
    const res = await fetch('https://api.example.com/users', {
      cache: 'force-cache',
      next: { revalidate: 60 }
    });
    return res.json();
  });

  logger.info({ category: 'http', meta: { key } }, 'Served users list');
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
  });
}
```

### Express (Node) – Optional
```js
const { expressMiddleware } = require('@hilmes/unified-logging');
app.use(expressMiddleware({ captureRequestBodySample: true }));

app.get('/_ops/cache/purge', async (req, res) => {
  await require('@hilmes/unified-cache').UnifiedCacheService.invalidateByTag(req.query.tag);
  res.sendStatus(204);
});
```

---

## UnifiedCacheService

> **Goal:** One dead‑simple API that auto‑selects the fastest safe cache for the current runtime (Edge or Node) without adding complexity.

### Why this first?
- Eliminates multiple caching patterns.
- Ensures Edge compatibility by default.
- Centralizes TTLs, keying, tagging, and invalidation.

### Runtime‑Aware Backends (auto‑selected)
- **Edge (Vercel):**  
  - Primary: **Vercel KV (Edge)** via REST.  
  - Secondary: **Next.js fetch cache hints** (`next.revalidate`) + `Cache-Control` for CDN layer.  
  - Config (typical): `VERCEL_KV_REST_API_URL`, `VERCEL_KV_REST_API_TOKEN`.
- **Node:**  
  - Primary: Redis (e.g., Upstash/Redis or ioredis).  
  - Secondary (local dev only): in‑memory LRU (size‑capped, TTL).

> **Not used at Edge:** Local filesystem caches or Node‑only libs.

### Minimal API
```ts
type CacheOptions = { ttl?: number; tags?: string[] };

await cache.set(key: string, value: any, opts?: CacheOptions): Promise<void>;
const v = await cache.get<T>(key: string): Promise<T | null>;
await cache.del(key: string): Promise<void>;

// Atomic get-or-set with TTL
const value = await cache.wrap<T>(key, { ttl: 60, tags: ['users'] }, async () => {
  // compute/fetch
});

// Tag-based invalidation (fan-out handled internally)
await cache.invalidateByTag(tag: string): Promise<void>;

// Namespacing helper
const key = cache.key(['users', userId, 'profile'], { v: 3 }); // => users:123:profile:v3
```

### Defaults & Conventions
- **TTL defaults:** 60s for API lists, 300s for detail pages, 10s for highly dynamic dashboards.  
- **Keying:** `scope:subscope:identifier:v{schemaVersion}`.  
- **Tags:** Use broad tags for bulk purges: `users`, `aircraft:phenom300`, `pricing`.  
- **Edge safety:** All methods work in Edge; binary values are JSON‑serialized unless base64 is specified.

### Invalidation Triggers
- On **POST/PUT/DELETE** handlers, call:
  - `cache.invalidateByTag('users')` or
  - `cache.del(cache.key(['users', id], { v: 1 }))`

---

## Vercel Edge Runtime: What Changes

### Logging
- **No local file writes** at Edge.  
- Use **stdout** + optional **shipping** to a log gateway (`UNIFIED_LOG_SHIP_URL`).  
- Capture `x-vercel-id` / `x-request-id` when present and map to `request_id`.

### Caching
- Prefer **UnifiedCacheService**.  
- Use **Next.js cache hints** (`next.revalidate`) and **CDN cache headers** (`Cache-Control: s-maxage, stale-while-revalidate`) to layer CDN caching on top of KV.  
- Avoid Node‑only libs; use **Edge‑compatible fetch + REST**.

### APIs to Avoid at Edge
- Local FS (`fs`), `net`, `tls`, child process, native Node streams.  
- Replace with Web APIs or platform services (KV/Edge Config/fetch cache).

---

## HeroUI (formerly ReactUI)

**Policy:** Use **HeroUI** for all new React UI unless a component is missing. Contribute upstream before adding one‑off UI kits.

**Standards**
- **Theming & tokens**: Read from the shared theme and tokens defined in **DESIGN.md**.  
- **App Router friendly**: Prefer Server Components; mark client interactivity with `"use client"`.  
- **Accessibility**: HeroUI components must be used with proper labels/roles; no raw div soup.  
- **Edge‑safe**: Avoid Node‑only imports in client code (e.g., `fs`, `crypto` Node polyfills).  
- **Styling**: Tailwind/utility classes per DESIGN.md; keep overrides minimal.

---

## Unified Logging (recap) + Hot‑Fix Defaults

- **Centralized by default**: JSONL at `~/logs/unified.log` on Node; **stdout + ship** on Edge.  
- **Privacy-first**: Redaction, sampling, header allowlists.  
- **Correlation**: `request_id` propagated browser → server → SQL.

**Hot‑Fix (Dev)**
- Toggle levels, sampling, and redaction **without restart** via watched files:
  - `./.unified-logging.local.json`
  - `~/Projects/.unified-logging.json`
- Admin endpoints (dev only):
  - `POST /_ops/log-level { level }`
  - `POST /_ops/logger/reload`
- Signals: `HUP` (reload), `USR2` (toggle debug/info).

> For Edge deployments, "hot‑fix" means toggling **shipping filters**/levels via environment or a small admin route guarded by an allowlist.

---

## Operational Commands

```bash
# Logging
make tail-logs
make tail-errors
make tail-sql
make tail-http
make tail-browser
make log-stats
make search-logs SEARCH="pattern"
make clear-logs
make rotate-logs
make archive-logs

# Hot-fix logger behavior (dev)
make log-level LEVEL=debug
make reload-logger
make toggle-debug

# Cache ops (via cache admin route or CLI wrappers)
make cache-del KEY="users:123:profile:v3"
make cache-invalidate TAG="users"
```

---

## Configuration (selected)

**ENV (Edge & Node)**
- Logging: `UNIFIED_LOG_LEVEL`, `UNIFIED_LOG_SHIP_URL`, `UNIFIED_LOG_HTTP_BODY_SAMPLE_RATE`
- Edge cache: `VERCEL_KV_REST_API_URL`, `VERCEL_KV_REST_API_TOKEN`
- Node cache: `REDIS_URL`
- Hot‑fix: `UNIFIED_HOTFIX_DEFAULTS=true`

**Programmatic Types** remain as previously documented for logging; `UnifiedCacheService` exposes:
```ts
type CacheBackend = 'edge:vercel-kv' | 'edge:fetch-cache' | 'node:redis' | 'local:lru';
type CacheInit = { prefer?: CacheBackend[]; defaultTTL?: number; namespace?: string; };
UnifiedCacheService.initialize(init?: CacheInit)
```

---

## Testing

- **Cache**: Provide a **memory backend** in tests for isolation:  
  `UnifiedCacheService.initialize({ prefer: ['local:lru'] })`  
- **Logger**: Use in‑memory sink + redaction fixtures; set `UNIFIED_LOG_LEVEL=error` in CI.  
- **Next.js App Router**: Route handlers use `runtime = 'edge'` in tests with `miniflare`‑style mocks or Next's built‑in test utils.

---

## Conventions & Do's / Don'ts

- **Do**: Use `cache.wrap` for all cacheable data access.  
- **Do**: Add a **tag** whenever data might need bulk invalidation later.  
- **Do**: Use HeroUI components before custom UI.  
- **Don't**: Write custom Redis or LRU code in app layers.  
- **Don't**: Use Node‑only APIs in shared modules that can run at Edge.  
- **Don't**: Log secrets or PII; rely on redaction and header allowlists.

---

## DESIGN.md (Scope Reminder)

- **DESIGN.md = Visual Design & UX**: component usage (HeroUI), typography, spacing, tokens, theming, state visualizations, log viewer/table behaviors, responsive patterns, and examples/screens.  
- Architecture, transports, and runtime specifics live in **this standards doc**.