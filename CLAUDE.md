# Typing Tutor — Project Context

## What this is
Personal side project. A free, shareable web app that teaches touch typing through a progression of lessons, with gamification (XP, levels, streaks, badges). Built so Zuhayr can practice without paying for keybr/typing.com, and so others can sign up and progress too.

## Build approach
- **No build step.** Vanilla ES modules + CDN-loaded libs (Vue 3, Tailwind, Chart.js, Supabase, Lucide). Deploy = `git push`.
- **Hosting:** GitHub Pages on Zuhayr's **personal** GitHub account (not the company one). Be mindful of this when configuring git remotes.
- **Backend:** Supabase free tier on a brand-new project (no shared infra, no company resources). Cost-conscious — minimize writes (only on lesson completion, not per-keystroke).

## Source of truth
**`PLAN.md`** in this directory has the full architecture: tech stack, file layout, Supabase schema + RLS, typing engine design, visual keyboard spec, curriculum data model, gamification mechanics, setup steps, and verification plan. Read it first.

## Build order
Full build in one go — not phased. See PLAN.md "Verification Plan" for the end-to-end test checklist.

## What Zuhayr does himself
- Create the Supabase project, run `scripts/supabase-schema.sql`, paste keys into `config.js`.
- Create the personal GitHub repo, enable GitHub Pages.
- (See PLAN.md "Setup Steps Zuhayr Does Himself" for the full walkthrough.)

## What Claude does
Everything else — code all the files in the structure laid out in PLAN.md, including 30+ lesson JSON files, the SQL schema script, all Vue components, the typing engine, the visual keyboard, gamification logic, and the dashboard.
