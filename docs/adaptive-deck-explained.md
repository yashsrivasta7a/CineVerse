# Adaptive Deck — Kaise Kaam Karta Hai (Hinglish Guide)

> CineVerse ka Flicks deck ab adaptive hai — har swipe se seekhta hai, turant react
> karta hai, aur khud batata hai jab wo guess kar raha ho. Ye doc poora system
> simple bhasha mein samjhaata hai, plus interview ke sawaal-jawaab.

---

## 1. Ek Line Mein

**Do TMDB queries ek client-side pool bharti hain; ek pure ranking function har
swipe pe pool ko re-sort karta hai; har 4th card jaan-bujh ke taste se hatke hota
hai.** Bas. Baaki sab detail hai.

---

## 2. Architecture

```
TMDB /discover
   │
   ├── MAIN PROBE      teri stated prefs + mood + learned genres
   │                   (popularity order, 20 titles/page)
   │
   └── WILDCARD PROBE  tere top genres ke BAHAR ki acclaimed films
                       (exploration lane)
        │
        ▼
   CANDIDATE POOL      max 60 titles, sirf metadata (~1 KB each)
   (phone ki memory)   judged ids filtered, duplicates filtered
        │
        ▼
   RANKER              scoreTitle(title, vector) — pure function
   (har swipe pe)      top 2 cards LOCKED, baaki sab re-sort
        │
        ▼
   DECK                har 4th card wildcard (chip ke saath)
```

### Files

| File | Kya karti hai |
|---|---|
| `lib/recommend/taste.ts` | **Dimaag.** Taste vector + scoring. Zero React, zero network. Interview mein yahi kholna. |
| `lib/recommend/pool.ts` | Pool ke rules — merge, re-rank, wildcard interleave. Sab pure functions. |
| `lib/queries/deck.ts` | `useDeck` hook — fetching, state, commit. Upar dono ko jodta hai. |
| `db/queries/verdicts.ts` | Har swipe SQLite mein — append-only event log. |

---

## 3. Taste Vector — 5 Axes

Har swipe pe 5 cheezein update hoti hain, **zero extra network request** ke saath
(sab list data mein already aata hai):

| Axis | Kya batata hai | Source |
|---|---|---|
| **Genres** | Action-wala hai ya drama-wala | `genreIds` |
| **Decades** | 90s ka fan ya sirf nayi releases | `date` ka pehla 4 char |
| **Languages** | Hindi/English/Korean kya chalta hai | `original_language` |
| **Reach** | Blockbuster type (+) ya deep-cut type (−) | `popularity` |
| **Acclaim** | High-rating chase karta hai ya nahi | `vote_average` |

### Weights — har swipe barabar nahi hai

```
Watched + liked      +2    (film dekhi, pasand aayi — sabse strong signal)
Interested (right)   +1    (poster accha laga, par film dekhi nahi — weak)
Not for me (left)    −1    (poster pasand nahi — weak)
Watched + disliked   −2    (time diya, phir bhi buri lagi — sabse strong negative)
```

### Input model — har control ka apna kaam, koi duplicate nahi

```
Default screen:   [ CARD ]                    ← swipe left/right = Pass / Vault
                  ( Seen it already? )        ← sirf ek pill

Pill tapped:      [ CARD ]
                  DID YOU LIKE IT?
                  [ 👎 ]   [ 👍 ]             ← ek card ke liye
                  ( Haven't seen it )         ← cancel
```

- **Swipe = intent axis.** Pass / Vault. Bas.
- **Thumbs = taste axis.** Sirf tab dikhte hain jab user bole "maine dekhi hai".
  Ye wo verdict hai jo swipe kar hi **nahi** sakta — isliye duplicate nahi.
- Agla card aate hi pill auto-reset. Koi sticky mode nahi.

**Do design galtiyan theek ki:**
1. Pehle bade keys direct thumbs the → naya user "accha lag raha" samajh ke
   thumbs-up dabata, app record karti "dekh chuka hoon" — galat data + Vault
   mein save bhi nahi.
2. Phir keys ko Pass/Vault banaya → wo **swipe ka hi duplicate** ho gaya, ek
   kaam ke do controls. Ab keys sirf wahi karte hain jo swipe nahi kar sakta.

Screen reader ke liye chaaron outcomes `SwipeDeck` ke `accessibilityActions`
mein hain — pill ka rasta unke liye zaroori hi nahi.

### Score kaise banta hai

```
score = 2 × genre-match  +  decade-match  +  language-match
        + 0.5 × reach-match  +  0.5 × acclaim-match
```

Genre double weight kyunki genre hi film ki pehchaan hai. Empty vector par sab
scores 0 — tab TMDB ka popularity order chalta hai. **Cold start ka special case
likhna hi nahi pada.**

---

## 4. Tere Doubts, Answered

### "15 cards tak preference set karni padegi kya?" — NAHI

Do alag cheezein hain:

- **Re-rank** = ghar ka saamaan aage-peeche karna. **Har swipe pe hota hai.**
  Teri swipe #1 ka asar card #3 pe dikh jaata hai.
- **Refill** = bazaar se naya laana. Jab bache < 15, tab agli 20 background mein
  aati hain. Ye sirf godown ka alarm hai — preference se koi lena-dena nahi.

### "Re-sort sirf starting 20 pe hoga kya?" — NAHI

Pool **rolling dabba** hai. Naye 20 aate hain to purane bache huon ke saath EK
race mein daudte hain. Naya card better score kare to aage, purana accha ho to
wahi khada rahe. Koi batch boundary nahi. Aur naya maal already teri current
taste ki query se aata hai — **refill hi retune hai.**

### "Onboarding preferences consider ho rahi hain?" — HAAN, sabse upar

```
Layer 1 — DEEWAR (tune bola):    kya FETCH hoga
  liked genres/countries  → query mein jaate hain
  dislikes/blocks         → query se KABHI wapas nahi aate

Layer 2 — INTEZAAM (app ne seekha):  kya PEHLE dikhega
  vector sirf ORDER badalta hai, deewar kabhi nahi todta
```

Tune bola "horror nahi" → horror kabhi fetch nahi hogi, vector chahe kuch bhi
kahe. Tune 5 comedy left ki → comedy neeche khisak jaayegi, par deewar ke andar
rahegi (kyunki tune usse like bola tha). **Stated = decision. Learned = guess.
Guess kabhi decision ko override nahi karta.**

### "Top 2 lock kyun?"

Angoothe ke neeche card badal jaaye to cheating lagti hai. Isliye #1 aur #2
frozen; #3 se aage sab har swipe pe re-sort. Practically: swipe ka asar
**agle-se-agle card** pe dikhta hai — instant bhi, stable bhi.

---

## 5. Wildcard — Har 4th Card

Sirf pasand ki cheez dikhate raho to ~20 swipes mein deck ek hi genre cluster
mein phas jaata hai — **filter bubble**. Fix: har 4th card deliberately
off-taste (epsilon-greedy, ε = 0.25) — acclaimed films tere top genres ke
BAHAR se. Card pe **"Wildcard" chip** lagta hai — app imandaari se bolta hai ki
ye guess hai, confident pick nahi. Home ki "Off your usual" rail isi query se
banti hai — same feature, do jagah.

---

## 6. Numbers (interviewer ke "kitna load hota hai?" ke liye)

| Cheez | Value |
|---|---|
| Ek page fetch | 20 titles, sirf metadata (~20 KB total) |
| Pool cap | 60 titles (~60 KB memory — kuch bhi nahi) |
| Refill trigger | bache < 15 (background mein, deck kabhi khaali nahi) |
| Image prefetch | sirf agle 5 backdrops (w780, ~100-200 KB each) |
| Initial load | 2 requests (main p1 + wildcard p1) |
| Steady state | ~1 request per 15 swipes |
| Re-rank cost | 60 items ka sort + O(genres) update — microseconds |
| Exclusion set | in-memory Set, 1000 swipes = ~8 KB, O(1) lookup |

---

## 7. Home Page — Ab Mirror Hai

Pehle: sabke phone pe same hardcoded rails ("Acclaimed", "Under 100 minutes").
Ab: **har rail tere apne state se paida hoti hai** —

1. **Mood rail** (agar mood set hai)
2. **Top 2 genre rails** — deck ne jo seekha (12+ swipes ke baad); tab tak
   onboarding ke stated likes
3. **"Off your usual"** — wildcard lane, rail ke roop mein

Trending, generic presets — deleted. Premiere hero rehta hai.

Rail subtitles imandaar hain: stated genre pe "Because you like X", learned pe
"You keep saying yes to X" — app kabhi claim nahi karti ki tune kuch *bola* jo
tune sirf *swipe* kiya.

### Profile = taste ka mirror

Profile (home ke top-right avatar se khulta hai, nav bar mein nahi):
- **Your taste** card — top 3 genres (chips), "Mostly 2010s · English first",
  aur stats: judged / saved-or-liked / watched. Sab `buildVector()` replay se.
- "Taste preferences" reset ab **confirm dialog** ke peeche — pehle ek tap pe
  poori preferences bina warning ke udd jaati thi.

---

## 8. System Design Patterns (naam ke saath, interview ke liye)

| Pattern | Kahan | Kya bolna |
|---|---|---|
| **Event Sourcing** | verdicts table | Swipe log hi source of truth hai. `buildVector()` = replay. State kabhi corrupt nahi ho sakti — dobara replay kar lo. |
| **Bounded Buffer** | pool (cap 60) | Memory fixed rehti hai chahe user 10,000 swipes kare. |
| **Demand Paging** | refill < 15 | Data tab aata hai jab zaroorat ho, ek page at a time. |
| **Epsilon-Greedy / Explore-Exploit** | wildcard 1-in-4 | Multi-armed bandit ka simplest form. Filter bubble ka ilaaj. |
| **Write-Ahead Local Store** | SQLite sync writes | Swipe kabhi network ka wait nahi karta. `synced=0` outbox flag Appwrite flush ke liye. |
| **Cache Dedupe** | TanStack `fetchQuery` | Same page do baar kabhi fetch nahi hoti. |

---

## 9. Ponytail Cuts Ledger — "Maine X kyun NAHI banaya"

Interview mein ye section sabse zyada kaam aayega. Senior engineer wo hai jo
bata sake ki kya *nahi* banaya aur kyun:

| Cut | Kyun | Ceiling + upgrade path |
|---|---|---|
| **Rate limiter** | Steady state 1 request/15 swipes — TMDB ka limit 40 req/s hai. Math hi justify nahi karta. | Parallel probes aaye to token bucket `tmdbFetch` ke aage (design system_design.md mein ready hai). |
| **Bloom filter** | 1000 swipes = 8 KB Set, O(1). Bloom yahan over-engineering hai. | ~100k+ ids ya network-shipped set pe zaroorat padegi. |
| **Drift metric** | Refill hi retune hai — har nayi page current vector se banti hai. Alag cosine-distance machinery ka koi kaam nahi. | Agar kabhi mid-pool rebuild chahiye to vector snapshot compare. |
| **Calibration set** (cold start ke curated 5 cards) | Empty vector → popularity order + wildcard lane pehli swipe se mix karti hai. Curation infra free mein mil gayi. | Chahe to fixed spanning set add ho sakta hai. |
| **"Retuned" toast** | App mein toast system hi nahi — ek message ke liye poora infra banana waste. Wildcard chip honesty ka kaam karta hai. | Toast system aaye to `refill()` mein hook point ready hai. |
| **"Almost said yes" rail** | Verdicts mein poster paths store nahi hote — rail ke liye 20 detail fetches lagti. | `posterPath` verdict snapshot mein add karo (v5 migration), rail aage se bharegi. |
| **6 parallel probes** (approach A) | 3× requests, 200-title pool — "kyun itna load?" ka jawab circular hota. 2 probes + client ranking same story kam cost mein deta hai. | Server-side recommender pe scale karna ho to probes wahan jaate hain. |

---

## 10. Interview Q&A

**Q: Walk me through what happens on a swipe.**
A: Verdict writes to SQLite synchronously — the deck never awaits the network.
The taste vector absorbs the verdict in O(genres). The pool re-ranks — top 2
locked, rest sorted by score. If survivors drop below 15, the next page is
fetched in the background, and that query is rebuilt from the current vector,
so every refill is also a retune.

**Q: Why don't you load all candidates upfront?**
A: Bounded pool of 60, demand-paged 20 per request, images windowed to next 5.
Metadata is ~1 KB per title; images are the real cost, so they follow the thumb,
not the pool.

**Q: Where does ranking happen — server or client?**
A: Client. TMDB gives coarse filtering (genre OR-lists, sort orders); the
per-title scoring is a pure function over a 5-axis vector. That's deliberate:
/discover can't express per-user weights, and shipping a server for one user's
ranking is premature.

**Q: Won't it echo-chamber?**
A: Pure exploitation converges on one genre cluster by ~20 swipes. Every 4th
card is epsilon-greedy exploration — acclaimed titles outside the learned top
genres, visibly marked as wildcards. ε = 0.25.

**Q: Cold start?**
A: Empty vector scores everything 0; JS stable sort keeps TMDB popularity
order, and the wildcard lane runs from swipe 1. No special case in code.

**Q: What if the user's stated preferences conflict with learned behaviour?**
A: Stated wins, always. Stated prefs shape the query (the wall); the vector
only orders what's inside it. An inference that overrides a decision reads as
the app ignoring the user.

**Q: How do you make sure a swiped movie never reappears?**
A: Verdict ids live in SQLite; an in-memory Set hydrated at mount filters every
merged page. 1000 swipes ≈ 8 KB, O(1) per check. I considered a Bloom filter
and rejected it — at this scale it's over-engineering; it earns its place at
~100k ids.

**Q: What happens offline mid-session?**
A: Swipes keep committing — SQLite is synchronous and local. The pool serves
what it holds (up to 60 cards). Refill failures are swallowed and retried on the
next swipe. Rows carry `synced = 0` as an outbox flag for the backend flush.

**Q: Why is the vector rebuilt from history instead of persisted?**
A: Event sourcing. The swipe log is the source of truth; the vector is a
derived view — `buildVector()` is literally a replay. Nothing to migrate,
nothing to corrupt, and the replay is O(total swipes) at mount, microseconds at
realistic counts.

**Q: How would you scale this to a million users?**
A: The shape survives: the pool becomes a server-side candidate cache, probes
become fan-out queries, the vector moves to a feature store keyed by user, and
the rate limiter I deliberately skipped client-side becomes mandatory at the
gateway. The event-sourced swipe log is already the right substrate for
offline model training.

---

*Built with the ponytail rule: minimum that works, every cut documented with
its ceiling and upgrade path.*
