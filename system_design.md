# System Design Patterns for CineVerse

These are real, implementable system design concepts that solve actual problems in your app — not just buzzwords. Each one is something you could explain in a system design interview with a working demo.

---

## 🔴 Tier 1 — High Interview Impact

### 1. Rate Limiter (Token Bucket)
**Problem:** TMDB has a 40 req/s rate limit. A power user swiping fast + prefetching + searching can burst past it and get 429'd.

**Pattern:** Token Bucket — a bucket holds N tokens, refills at a fixed rate. Each request consumes one token. If empty, requests queue up instead of firing.

```
┌──────────────────────────────────────┐
│         Token Bucket (40 tokens)     │
│  ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐  ...  ┌─┐     │
│  │●││●││●││●││●││●│       │●│     │
│  └─┘└─┘└─┘└─┘└─┘└─┘       └─┘     │
│  Refill: 40 tokens / second          │
│  If empty → request waits in queue   │
└──────────────────────────────────────┘

Request flow:
  fetch('/movie/123') → takeToken() → has token? → fire
                                     → no token? → queue, wait for refill
```

**Where it lives:** `lib/http.ts` — wraps the existing `tmdbFetch()`.

---

### 2. Circuit Breaker
**Problem:** If TMDB goes down, every screen fires requests that will fail, showing error states everywhere and wasting battery.

**Pattern:** Circuit Breaker — after N consecutive failures, "trip" the circuit and stop sending requests. Serve stale cache instead. Periodically send a single probe request. If it succeeds, close the circuit and resume.

```
         ┌─────────┐
    ●───▶│  CLOSED  │──── failures > threshold ────▶┌──────────┐
         │ (normal) │                                │   OPEN   │
         └────▲─────┘                                │ (refuse  │
              │                                      │  all)    │
              │                                      └────┬─────┘
         probe succeeds                          timeout expires
              │                                      │
         ┌────┴──────────┐◀──────────────────────────┘
         │  HALF-OPEN    │
         │ (1 probe req) │── probe fails ──▶ back to OPEN
         └───────────────┘
```

**Where it lives:** Wraps the rate limiter in `lib/http.ts`. When open, TanStack Query serves `staleTime: Infinity` cached data.

---

### 3. Outbox Pattern (Write-Ahead Log)
**Problem:** Swipe verdicts and bookmarks must feel instant (write to SQLite), but also sync to Appwrite eventually. Network can be unreliable.

**Pattern:** Every mutation writes locally with `synced = 0`. A background worker flushes `WHERE synced = 0` to Appwrite on:
- `AppState → background`
- Every 30s debounce after last write
- On reconnect after offline

```
User swipes RIGHT
    │
    ▼
┌─────────────────────────┐
│  SQLite (synchronous)   │
│  INSERT verdict         │
│  synced = 0             │  ← UI reads from here (instant)
└───────────┬─────────────┘
            │ debounce / AppState.background / reconnect
            ▼
┌─────────────────────────┐
│  Outbox Flush Worker    │
│  SELECT * WHERE         │
│  synced = 0 LIMIT 50    │
│  → batch POST Appwrite  │
│  → UPDATE synced = 1    │
└─────────────────────────┘
```

**Where it lives:** `db/outbox.ts` + `lib/sync/flush.ts`

---

### 4. Bloom Filter (Probabilistic Exclusion Set)
**Problem:** The Filmder deck must never show a movie the user already swiped. After 1000+ swipes, loading all swiped IDs into memory and checking `Set.has()` on every card is wasteful.

**Pattern:** A Bloom Filter uses K hash functions and a bit array. It can tell you "definitely NOT swiped" (safe to show) or "probably swiped" (filter out). False positives (filtering a movie they haven't swiped) are acceptable — the user just never sees it. False negatives (showing a swiped movie) are impossible.

```
Bloom Filter (m = 1024 bits, k = 3 hash functions)

  add(movieId: 550)
    h1(550) = 23  → set bit[23] = 1
    h2(550) = 891 → set bit[891] = 1
    h3(550) = 456 → set bit[456] = 1

  mightContain(movieId: 678)
    h1(678) = 23  → bit[23] = 1 ✓
    h2(678) = 102 → bit[102] = 0 ✗  →  DEFINITELY NOT IN SET
                                        → safe to show in deck
```

**Where it lives:** `lib/recommend/bloom.ts`, hydrated from SQLite verdict IDs on boot.

---

## 🟡 Tier 2 — Solid Engineering Patterns

### 5. Priority Request Queue
**Problem:** When a user scrolls the home screen, visible posters should load before off-screen prefetches. Right now everything fires at the same priority.

**Pattern:** Two queues — HIGH (visible viewport) and LOW (prefetch). HIGH always drains first.

```
┌─────────────────┐     ┌─────────────────┐
│   HIGH Queue    │     │   LOW Queue     │
│  (visible imgs) │     │  (prefetch)     │
│  ▸ poster A     │     │  ▸ poster X     │
│  ▸ poster B     │     │  ▸ poster Y     │
└────────┬────────┘     └────────┬────────┘
         │ drain first           │ drain when HIGH is empty
         ▼                       ▼
    ┌──────────────────────────────┐
    │     Rate Limiter (40/s)      │
    └──────────────────────────────┘
```

---

### 6. Stale-While-Revalidate Cache Strategy
**Problem:** Movie data rarely changes, but you still want freshness. TanStack Query supports this natively, but making it *explicit and configurable* per data type is the system design move.

```
Cache Tiers:

  STATIC (staleTime: Infinity, gcTime: 7d)
    → Genre lists, country lists, configuration
    → Never refetch. Seed once.

  WARM (staleTime: 5min, gcTime: 24h)
    → Movie detail, person detail
    → Serve stale instantly, revalidate in background

  HOT (staleTime: 0, gcTime: 1h)
    → Trending, discover pages
    → Always revalidate, but show cached while loading

  VOLATILE (staleTime: 0, gcTime: 0)
    → Search results
    → Never cache across sessions
```

---

### 7. Event Sourcing for Swipe History
**Problem:** You want to answer questions like "what did the user like last week?" or "show me a timeline of swipes" without complex queries.

**Pattern:** Store swipes as an append-only event log. Derive current state (bookmarks, stats, recommendations) from replaying events.

```
Events Table (append-only):
  ┌──────────┬──────────┬─────────┬──────────┬───────────────┐
  │ event_id │ movie_id │ action  │ reaction │  timestamp    │
  ├──────────┼──────────┼─────────┼──────────┼───────────────┤
  │ 1        │ 550      │ LIKE    │ "fire"   │ 2026-08-15... │
  │ 2        │ 680      │ PASS    │ null     │ 2026-08-15... │
  │ 3        │ 550      │ BOOKMARK│ null     │ 2026-08-16... │
  └──────────┴──────────┴─────────┴──────────┴───────────────┘

Derived views (materialized on read):
  → Bookmarks = SELECT DISTINCT movie_id WHERE action = 'BOOKMARK'
  → Stats     = SELECT action, COUNT(*) GROUP BY action
  → Timeline  = SELECT * ORDER BY timestamp DESC
```

---

### 8. Exponential Backoff with Jitter
**Problem:** If 100 users all get a 429 from TMDB and retry at exactly the same time, they'll all fail again simultaneously.

**Pattern:** Each retry waits `min(baseDelay * 2^attempt + random_jitter, maxDelay)`.

```
Attempt 1: wait 1s + random(0-500ms)  = ~1.3s
Attempt 2: wait 2s + random(0-500ms)  = ~2.1s
Attempt 3: wait 4s + random(0-500ms)  = ~4.4s
Attempt 4: wait 8s + random(0-500ms)  = ~8.2s
         (capped at 30s max)
```

---

## 🟢 Tier 3 — Bonus Points

### 9. Image Prefetch Pipeline
Already partially implemented. The deck prefetches `w780` backdrops for the next 5 cards. System design angle: explain the **resolution ladder** (`w342` for thumbnails, `w780` for deck, `original` only for full-screen) and why it matters for data plans.

### 10. Debounced Search with Request Cancellation
Already implemented via TanStack Query's `queryKey` invalidation. System design angle: explain why the old `useFetch` approach caused **race conditions** (results for a query the user already backspaced past).

---

## What I'd Recommend Building

> [!IMPORTANT]
> If you want the most impressive system design demo, build these 3 in order:

1. **Rate Limiter** (~1-2 hours) — Tangible, testable, explains well in interviews
2. **Circuit Breaker** (~1-2 hours) — Builds on rate limiter, shows resilience thinking
3. **Outbox Pattern** (~2-3 hours) — Shows you understand distributed systems / eventual consistency

Together they form a complete **"resilient client-side networking stack"** story that's interview gold.

Hit **Proceed** and tell me which ones you want to build!
