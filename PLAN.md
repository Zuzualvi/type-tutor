# Typing Tutor Web App — Implementation Plan

## Context

Zuhayr wants to improve his typing speed without paying for one of the gated typing apps on the market. The build is a static, shareable web app that teaches proper touch-typing technique through a progression of lessons. It runs as a personal side project (personal GitHub account, brand-new Supabase project — no company infrastructure or shared resources) and must stay within Supabase's free tier. Gamification is a stated priority — accounts, streaks, XP, levels, badges — both for personal motivation and to make it feel real when shared with others. End goal: a public URL friends can sign up to and progress through alongside Zuhayr.

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| UI framework | **Vue 3 via CDN (global build)** | Real reactivity (the keyboard + engine fire 5–10 state updates per keystroke), components, no build step. Alpine.js gets messy past ~3 views; vanilla causes drift bugs on per-keystroke state. |
| Styling | **Tailwind CSS via Play CDN** | Course-like UI without a PostCSS pipeline. |
| Charts | **Chart.js 4 via CDN** | Line/bar charts for the dashboard. |
| Auth + DB | **Supabase JS SDK v2 via esm.sh** | ESM build works in `<script type="module">` with no bundler. |
| Routing | **Custom hash router (~40 lines)** | GitHub Pages has no server-side rewrite — history-API routes 404 on refresh. Hash routing always works. |
| Fonts | **Nunito (UI) + JetBrains Mono (typing area)** | Friendly UI, monospace for the prompt so each char has uniform width. |
| Icons | **Lucide via CDN** | Lightweight. |

No build step. No npm. Deploy = `git push`.

---

## Repo Structure

```
typing-tutor/
├── index.html
├── 404.html                        # copy of index.html for hash-route refresh safety
├── .nojekyll
├── config.js                       # window.APP_CONFIG = { supabaseUrl, supabaseAnonKey }
├── assets/                         # favicon, logo, badge SVGs, sounds
├── styles/app.css
├── src/
│   ├── main.js                     # bootstrap, createApp, mount router
│   ├── router.js                   # hash router
│   ├── store.js                    # reactive global store (user, progress, settings)
│   ├── supabase/
│   │   ├── client.js               # createClient(); exports supabase
│   │   ├── auth.js                 # signIn, signUp, signOut, onAuthChange
│   │   └── db.js                   # all DB reads/writes (saveSession, getProgress…)
│   ├── engine/
│   │   ├── typingEngine.js         # core state machine
│   │   ├── metrics.js              # WPM, accuracy
│   │   ├── weakKeys.js             # per-key error aggregation
│   │   └── fingerMap.js            # key → finger → color
│   ├── curriculum/
│   │   ├── index.js                # loads + indexes lessons, unlock evaluation
│   │   ├── manifest.json           # explicit lesson list (GH Pages can't list dirs)
│   │   ├── lessons/                # 30+ lesson JSON files + bonus tracks
│   │   └── wordlists/              # english-top-1000.json, code-snippets.json
│   ├── gamification/
│   │   ├── xp.js
│   │   ├── streaks.js
│   │   └── badges.js
│   ├── components/                 # AppShell, Keyboard, TypingArea, LessonCard, ProgressBar, BadgeToast, Chart
│   └── views/                      # Login, Home, Lesson, Results, Dashboard, FreeType, Badges, Settings
└── scripts/
    └── supabase-schema.sql         # all DDL + RLS + pg_cron job (user runs in SQL editor)
```

---

## Supabase Schema

Five tables, RLS enabled on all.

- **`profiles`** — 1 per user. Mirrors `auth.users.id`. Stores `username`, `current_level`, `total_xp`, `current_streak`, `longest_streak`, `last_active_date`, `preferences` (jsonb).
- **`lesson_sessions`** — 1 per completed attempt (the main write target). `user_id`, `lesson_id`, `wpm`, `accuracy`, `errors`, `duration_sec`, `chars_typed`, `weak_keys` (jsonb: `{e: 4, i: 3, …}`), `passed`, `xp_earned`. Immutable log. Indexed on `(user_id, lesson_id, created_at desc)` and `(lesson_id, passed)`.
- **`lesson_progress`** — 1 per user-per-lesson. Denormalized best score for fast unlock checks. PK `(user_id, lesson_id)`. Upserted on completion.
- **`user_badges`** — `(user_id, badge_id)` PK, `earned_at`.
- **`lesson_aggregates`** — 1 per lesson. `avg_wpm`, `avg_accuracy`, `sample_size`. Powers "vs average at your stage."

### RLS

- `profiles`: SELECT for any authed user; INSERT/UPDATE only where `id = auth.uid()`.
- `lesson_sessions`, `lesson_progress`, `user_badges`: SELECT/INSERT/UPDATE only where `user_id = auth.uid()`.
- `lesson_aggregates`: SELECT for all authed users; no client writes.

### "vs Average" — Free-Tier Safe

**Don't** scan `lesson_sessions` on every dashboard load. **Do** maintain `lesson_aggregates` via a **pg_cron** job (free on Supabase) that runs once per day at 03:00 UTC and upserts averages from `lesson_sessions WHERE passed = true GROUP BY lesson_id`. Dashboard reads one cheap row per lesson. Stale by up to 24h — fine for the framing.

### Write Volume

- Engine writes nothing during a session — pure in-memory state.
- On completion: 1 INSERT (`lesson_sessions`) + 1 UPSERT (`lesson_progress`) + 1 UPDATE (`profiles` for XP/streak) + 0–N INSERTs (`user_badges`).
- Typical user: ~200–500 writes/month. Comfortably within free tier (50K MAU, 500MB DB, 5GB bandwidth).

---

## Routing

Hash router. Routes: `#/login`, `#/`, `#/lesson/:id`, `#/results/:sessionId`, `#/dashboard`, `#/freetype`, `#/badges`, `#/settings`. All require auth except `#/login`. Implemented in `src/router.js` listening to `hashchange` + `DOMContentLoaded`, exposing a reactive `currentRoute` ref.

---

## Typing Engine

`src/engine/typingEngine.js` — single reactive object:

```
{ prompt, typed, cursorIndex, errors, errorPositions, keyErrors,
  startedAt, endedAt, finished, nextChar }
```

Keystroke handler attached to `window` while LessonView is mounted:
1. Ignore non-character keys except Backspace (Shift, Ctrl, etc.).
2. First char → set `startedAt = performance.now()`.
3. Backspace → decrement cursor, pop from `typed`, drop index from `errorPositions`. Do **not** decrement `errors` (it's monotonic, so accuracy stays honest).
4. Char → compare to `prompt[cursorIndex]`. On miss: still append (renders red), increment `errors`, increment `keyErrors[prompt[cursorIndex]]` (count against the *expected* key — that's what reveals weak keys).
5. When `cursorIndex === prompt.length` → mark finished, call `onComplete(metricsSummary())`.

### Metrics

- **WPM (net)** = `(chars/5) / minutes − errors / minutes`. Show net by default — matches keybr/typing.com convention.
- **Accuracy** = `(chars_typed − errors) / chars_typed × 100`.
- Live stats recomputed every 250ms via `setInterval` on a reactive `liveStats` ref (not per keystroke — cheap).

### Weak Keys

Per session: save `keyErrors` to `lesson_sessions.weak_keys`. Dashboard: pull last 20 sessions, sum by key client-side, render top 5 as a colored heatmap row.

---

## Visual Keyboard

`src/components/Keyboard.js` — pure prop-driven, no imperative DOM.

QWERTY laid out as nested flex rows. Each key is a div with a soft background tint of its finger color + a 4px colored bottom border (gives the "friendly course" look without being garish).

### Finger color map

| Finger | Color | Keys |
|---|---|---|
| L pinky | red-400 | `` ` 1 q a z Tab Caps Shift `` |
| L ring | orange-400 | `2 w s x` |
| L middle | amber-400 | `3 e d c` |
| L index | lime-400 | `4 5 r t f g v b` |
| Thumbs | slate-400 | Space |
| R index | emerald-400 | `6 7 y u h j n m` |
| R middle | cyan-400 | `8 i k ,` |
| R ring | blue-400 | `9 o l .` |
| R pinky | violet-400 | `0 - = p [ ] \ ; ' Enter / Shift Backspace` |

### Next-key highlight

Component receives `nextChar` as a prop from `typingEngine.nextChar`. Matches the key div (case-insensitive). If the next char requires Shift, also highlights the *correct-side* Shift (left Shift for right-half keys, right Shift for left-half keys — proper touch-typing form). Highlighted keys: scale-105, ring-4 ring-yellow-300, soft pulse.

### Error flash

Parent passes transient `errorKey` prop (red ring overlay) cleared after ~150ms.

---

## Curriculum Data Model

Per-lesson JSON (`src/curriculum/lessons/NN-name.json`):

```json
{
  "id": "01-home-row",
  "title": "Home Row Basics",
  "track": "core",
  "order": 1,
  "description": "Learn ASDF JKL; — the anchor keys.",
  "newKeys": ["a","s","d","f","j","k","l",";"],
  "prerequisiteLessonIds": [],
  "unlockGate": { "minWpm": 15, "minAccuracy": 95 },
  "xpReward": 50,
  "drills": [
    { "type": "chars", "content": "asdf jkl; asdf jkl; fff jjj ddd kkk" },
    { "type": "words", "content": "dad sad lad add ask" }
  ]
}
```

Drill types: `chars`, `words`, `sentences`, `paragraph`, `code`, `numpad`, `freq-words`.

### Core sequence (~30 lessons)

Home row → home-row words → top row (e/i/r/u) → bottom row (v/n/m/c) → all-letter drills → capitals + Shift → punctuation (`. , ' "`) → numbers row → symbols → brackets/operators → word drills (increasing length) → sentences → paragraphs → mixed timed challenges.

### Bonus tracks

- **Code typing** (JS/Python snippets) — unlocks after lesson 10
- **Number pad drills** — always available
- **Top 1000 English words by frequency** — unlocks after lesson 15

### Unlock evaluation

A lesson is unlocked iff every prerequisite's best score meets *that prerequisite's* `unlockGate` (minWpm + minAccuracy). Evaluated client-side against `lesson_progress` map.

### Lesson discovery

GitHub Pages can't list directories — maintain an explicit `manifest.json` listing every lesson file. Loader fetches manifest, then each JSON, builds in-memory `Map<lessonId, lesson>`.

---

## Gamification

### XP per session
```
xp = lesson.xpReward
   + max(0, wpm − gate.minWpm) * 2     // exceeding-gate bonus
   + (accuracy >= 98 ? 25 : 0)         // accuracy bonus
   + (firstTimePass ? 100 : 0)         // first-clear bonus
```

### Levels

Triangular curve: `xpForLevel(n) = 100 * n * (n+1) / 2`. Level 1 = 100 XP, Level 5 = 1500, Level 10 = 5500. Stored in `profiles.current_level` + `total_xp`.

### Streaks

On completion, compare `today` vs `profiles.last_active_date`. Same day → no change. Day-after → streak++. Gap → streak resets to 1. Track `longest_streak` separately.

### Badges (declarative rules in `badges.js`)

`first-lesson`, `home-row-master`, `letter-complete`, `streak-3/7/30`, `speed-30/50/80/100`, `accuracy-ace` (100% on a lesson ≥50 chars), `code-typist`, `marathon` (10K lifetime chars), `level-5/10/25`, `bookworm` (first paragraph lesson), `comeback` (resume after 7+ day break).

Evaluated client-side after each completion → toast popup → INSERT into `user_badges`.

### Header always shows

Current level (with progress ring to next), total XP, current streak (flame icon), bell icon for recent badge unlocks.

---

## Setup Steps Zuhayr Does Himself

### A. Supabase project
1. supabase.com → New project. Pick region. Save the DB password.
2. SQL Editor → paste `scripts/supabase-schema.sql` → Run.
3. Authentication → Providers → enable Email (magic link). Google OAuth optional (requires OAuth client in Google Cloud Console).
4. Project Settings → API → copy **Project URL** and **anon public key**.

### B. GitHub repo
1. Create public repo on personal account (e.g. `typing-tutor`).
2. Clone, add project files.
3. Edit `config.js` with the Supabase URL + anon key. Commit it — anon key is safe to publish; RLS protects data.
4. Push to `main`.

### C. GitHub Pages
1. Repo → Settings → Pages → Source: `main` / root → Save.
2. Site live at `https://<username>.github.io/typing-tutor/`.

### D. Supabase auth URLs
- Site URL: `https://<username>.github.io/typing-tutor/`
- Redirect URLs: `https://<username>.github.io/typing-tutor/**` and `http://localhost:8000/**`

### E. Local dev
`python3 -m http.server 8000` from repo root. Open `http://localhost:8000`.

---

## Critical Files

- `typing-tutor/index.html` — entry, mounts `#app`, loads CDN libs
- `typing-tutor/src/engine/typingEngine.js` — keystroke state machine
- `typing-tutor/src/components/Keyboard.js` — visual keyboard + finger colors + next-key highlight
- `typing-tutor/src/curriculum/index.js` — lesson loader + unlock evaluation
- `typing-tutor/src/supabase/db.js` — all data reads/writes (one place to audit free-tier usage)
- `typing-tutor/scripts/supabase-schema.sql` — DDL + RLS + pg_cron aggregate job

---

## Verification Plan

**Local (before pushing):**
1. `python3 -m http.server 8000` → open localhost:8000 → login screen, no console errors.
2. Sign up via email magic link → verify `auth.users` + `profiles` row created.
3. Start lesson 1 — type perfectly. Confirm WPM/accuracy plausible, keyboard highlight tracks `nextChar`, finger colors render.
4. Mistype 3 keys, backspace and correct. Errors counter = 3, accuracy reflects it, `weak_keys` increments expected keys (not what you hit).
5. Complete lesson → results screen shows WPM, accuracy, XP, pass/fail. `lesson_sessions`, `lesson_progress`, `profiles.total_xp` all updated in Supabase table editor.

**Unlock gate:**
6. Fail lesson 1 → lesson 2 stays locked with tooltip. Pass lesson 1 → lesson 2 unlocks.

**Gamification:**
7. First completion → `first-lesson` badge toast + row in `user_badges`.
8. Hit XP threshold → level header increments + level-up toast.
9. Complete on consecutive days → streak increments. Skip a day → streak resets.

**Dashboard:**
10. After 5+ sessions → WPM line chart, accuracy trend, weak-keys row all render.
11. Manually run aggregate query in SQL Editor (since pg_cron runs daily) → "vs average" shows a value.

**Cross-user / RLS:**
12. Sign out, sign up as second user, complete lessons. Sign back in as user 1 — only see your own sessions, but vs-average reflects both.

**Free type:**
13. Paste a paragraph → metrics show, no writes to `lesson_sessions` (verify count unchanged).

**Production:**
14. Push → GH Pages deploys → repeat steps 3, 5, 10 against the public URL.
15. Mobile: confirm responsive layout. On-screen keyboard hidden on mobile; replaced with "use a physical keyboard" message (typing tutors aren't really mobile-usable).

**Free-tier sanity:**
16. After a week of personal use: Supabase Reports → DB size < 10MB, bandwidth < 100MB.

**Share test:**
17. Send link to a friend → they sign up + complete lesson 1 → `lesson_aggregates.sample_size` increments after next cron run.
