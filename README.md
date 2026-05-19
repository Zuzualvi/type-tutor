# Typing Tutor

A free, shareable web app for learning touch typing — built as a personal side project.

- **Hosting:** GitHub Pages (Zuhayr's **personal** GitHub account: `Zuzualvi`)
- **Backend:** Supabase free tier (brand-new personal project — no shared infra)
- **Build step:** none. Vanilla ES modules + CDN libs. Deploy = `git push`.
- **Live URL (once published):** https://zuzualvi.github.io/type-tutor/

---

## What's here

```
typing-tutor/
├── index.html                # entry point
├── 404.html                  # copy of index.html (GH Pages hash-route safety)
├── .nojekyll                 # tell GH Pages not to run Jekyll
├── config.js                 # YOU edit this with Supabase keys
├── styles/app.css
├── scripts/
│   └── supabase-schema.sql   # paste into Supabase SQL Editor
└── src/
    ├── main.js               # bootstrap
    ├── router.js             # hash router
    ├── store.js              # global reactive store
    ├── supabase/             # client + auth + db wrappers
    ├── engine/               # typing engine, metrics, weak keys, finger map
    ├── gamification/         # XP, streaks, badges
    ├── curriculum/           # 30+ lessons + manifest + loader
    ├── components/           # AppShell, Keyboard, TypingArea, etc.
    └── views/                # Login, Home, Lesson, Results, Dashboard, …
```

Read `PLAN.md` for the full architecture rationale.

---

## Setup — what YOU need to do

Everything below is on your **personal** GitHub and a **brand-new** Supabase project. No company accounts, no shared infrastructure.

### 1. Create the Supabase project

1. Go to https://supabase.com and sign in (use a personal email, not your work account).
2. Click **New project**. Pick a region close to you. Save the database password somewhere safe.
3. Wait ~1 minute for provisioning to finish.
4. Open the **SQL Editor** (left sidebar) → **New query**.
5. Open `scripts/supabase-schema.sql` from this repo, copy the entire contents, paste into the SQL Editor, click **Run**. You should see `Success. No rows returned.`
6. Open **Authentication** → **Providers** → make sure **Email** is enabled (it is by default). Magic-link sign-in will work out of the box. If you also want a password-based login, that's also enabled by default.
7. Open **Project Settings** → **API**. Copy the two values you'll need:
   - **Project URL** (e.g. `https://abcdefghijkl.supabase.co`)
   - **anon public key** (a long `eyJ...` JWT)

### 2. Paste the keys into `config.js`

Open `config.js` in this folder and replace the two placeholders:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...the-long-anon-key...',
};
```

The anon key is **safe to commit** — it's a public key. The database is protected by row-level security (the SQL script set this up).

### 3. Test locally first

From this directory:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser. You should land on the login screen. Sign up with your email, complete lesson 1, confirm everything works.

If the console shows errors, fix them before pushing.

### 4. Create the GitHub repo (personal account)

1. Go to https://github.com/new while logged in as **Zuzualvi** (not the company account — double-check the avatar in the top-right).
2. Repository name: `type-tutor`. Public. **Do not** initialize with a README, .gitignore, or license (this folder already has them).
3. On the next screen, copy the "push an existing repository from the command line" snippet, or use these commands from this folder:

```bash
git init
git add .
git commit -m "Initial commit: typing tutor"
git branch -M main
git remote add origin git@github.com:Zuzualvi/type-tutor.git
git push -u origin main
```

> **Check before pushing:** `git remote -v` should show `git@github.com:Zuzualvi/type-tutor.git`, **not** any company-account remote.

### 5. Enable GitHub Pages

1. Open the repo on GitHub → **Settings** → **Pages**.
2. **Source:** Deploy from a branch.
3. **Branch:** `main` / `/ (root)`. Save.
4. Wait ~30 seconds. The page will display the live URL: `https://zuzualvi.github.io/type-tutor/`.

### 6. Tell Supabase about the live URL

So magic-link redirects go to the right place:

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://zuzualvi.github.io/type-tutor/`
3. **Redirect URLs:** add both:
   - `https://zuzualvi.github.io/type-tutor/**`
   - `http://localhost:8000/**`

Save.

### 7. Verify on the live site

Open https://zuzualvi.github.io/type-tutor/, sign up, complete lesson 1, check Supabase → **Table Editor** → `lesson_sessions` to confirm the row was written.

---

## Daily use

- Local dev: `python3 -m http.server 8000` from the repo root.
- Deploy: `git push`. GH Pages picks it up in ~30 seconds.

---

## Free-tier safety

The architecture is deliberately cheap:
- No writes during a typing session — pure in-memory state.
- On completion: 1 INSERT (`lesson_sessions`) + 1 UPSERT (`lesson_progress`) + 1 UPDATE (`profiles`) + 0–N INSERTs (`user_badges`).
- "vs Average" reads come from `lesson_aggregates`, which is refreshed daily by a `pg_cron` job — not by scanning the full session log on every page load.

Typical heavy user: ~200–500 writes/month. Well inside Supabase's 50K MAU / 500MB DB / 5GB bandwidth free tier.

---

## Sharing with friends

Just send them the URL: https://zuzualvi.github.io/type-tutor/. They sign up with email, get a magic link, and start lesson 1. Their progress is isolated to their account (row-level security enforces this). The "vs average" stat aggregates across all users.
