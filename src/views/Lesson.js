import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { store, refreshUserData, pushToast } from '../store.js';
import { currentRoute, navigate } from '../router.js';
import { getLesson, lessonPrompt } from '../curriculum/index.js';
import { createEngine } from '../engine/typingEngine.js';
import { baseKeyFor } from '../engine/fingerMap.js';
import { computeXp, levelInfo } from '../gamification/xp.js';
import { updateStreak, daysSince } from '../gamification/streaks.js';
import { evaluateBadges, badgeMeta } from '../gamification/badges.js';
import { insertSession, upsertProgress, updateProfile, insertBadge, getRecentSessions } from '../supabase/db.js';

import TypingArea from '../components/TypingArea.js';
import Keyboard from '../components/Keyboard.js';

export default {
  name: 'LessonView',
  components: { TypingArea, Keyboard },
  setup() {
    const loading = ref(true);
    const lesson = ref(null);
    const engine = ref(null);
    const errorKey = ref(null);
    const submitting = ref(false);
    let errorTimer = null;

    async function load() {
      loading.value = true;
      const id = currentRoute.value.params.id;
      const l = await getLesson(id);
      if (!l) { navigate('/'); return; }
      lesson.value = l;
      const prompt = await lessonPrompt(l);

      engine.value = createEngine(prompt, {
        onError({ expected }) {
          errorKey.value = baseKeyFor(expected);
          if (errorTimer) clearTimeout(errorTimer);
          errorTimer = setTimeout(() => { errorKey.value = null; }, 180);
        },
        onComplete: async (summary) => {
          await handleComplete(summary);
        },
      });
      engine.value.attach();
      loading.value = false;
    }

    onMounted(load);
    onBeforeUnmount(() => {
      if (engine.value) engine.value.detach();
      if (errorTimer) clearTimeout(errorTimer);
    });

    async function handleComplete(summary) {
      if (submitting.value) return;
      submitting.value = true;
      try {
        const l = lesson.value;
        const gate = l.unlockGate || { minWpm: 0, minAccuracy: 0 };
        const passed = summary.wpm >= gate.minWpm && summary.accuracy >= gate.minAccuracy;

        const progressMapBefore = store.progress;
        const prevBest = progressMapBefore.get(l.id);
        const wasFirstPass = !prevBest?.passed && passed;
        const xp = passed ? computeXp({ lesson: l, wpm: summary.wpm, accuracy: summary.accuracy, firstTimePass: wasFirstPass }) : 0;

        const sessionRow = await insertSession({
          user_id: store.user.id,
          lesson_id: l.id,
          wpm: Number(summary.wpm.toFixed(2)),
          accuracy: Number(summary.accuracy.toFixed(2)),
          errors: summary.errors,
          duration_sec: Number(summary.durationSec.toFixed(2)),
          chars_typed: summary.charsTyped,
          weak_keys: summary.weakKeys,
          passed,
          xp_earned: xp,
        });

        await upsertProgress({
          userId: store.user.id, lessonId: l.id,
          wpm: summary.wpm, accuracy: summary.accuracy, passed,
        });

        // Streak + XP update on profile.
        const prof = store.profile || {};
        const streak = updateStreak({
          currentStreak: prof.current_streak,
          longestStreak: prof.longest_streak,
          lastActiveDate: prof.last_active_date,
        });
        const newTotalXp = (prof.total_xp || 0) + xp;
        const oldLevel = levelInfo(prof.total_xp || 0).level;
        const newLevel = levelInfo(newTotalXp).level;

        await updateProfile(store.user.id, {
          total_xp: newTotalXp,
          current_level: newLevel,
          current_streak: streak.currentStreak,
          longest_streak: streak.longestStreak,
          last_active_date: streak.lastActiveDate,
        });

        // Refresh local cache before badge eval (so progressMap reflects this pass).
        await refreshUserData();

        // Compute lifetime chars from recent sessions for the marathon badge.
        const recent = await getRecentSessions(store.user.id, 100).catch(() => []);
        const lifetimeChars = recent.reduce((s, r) => s + (r.chars_typed || 0), 0);

        const badgeSet = new Set(store.badges.map(b => b.badge_id));
        const newBadgeIds = evaluateBadges({
          lesson: l,
          summary,
          sessionRow,
          progressMap: store.progress,
          badgeSet,
          firstTimePass: wasFirstPass,
          newStreak: streak.currentStreak,
          newLevel,
          lifetimeChars,
          daysGap: daysSince(prof.last_active_date),
        });

        for (const bid of newBadgeIds) {
          await insertBadge(store.user.id, bid);
          const meta = badgeMeta(bid);
          pushToast({ type: 'badge', title: 'Badge earned — ' + meta.title, body: meta.desc });
        }
        if (newLevel > oldLevel) {
          pushToast({ type: 'level', title: `Level ${newLevel}!`, body: `You hit ${newTotalXp} XP. Keep going.` });
        }
        if (streak.changed && streak.currentStreak > (prof.current_streak || 0)) {
          pushToast({ type: 'streak', title: `${streak.currentStreak}-day streak`, body: 'Showing up is half the work.' });
        }

        await refreshUserData();
        navigate('/results/' + sessionRow.id);
      } catch (e) {
        console.error(e);
        pushToast({ type: 'error', title: 'Save failed', body: e.message || 'Try again.' });
        submitting.value = false;
      }
    }

    function restart() {
      if (!engine.value || !lesson.value) return;
      engine.value.reset();
      submitting.value = false;
    }

    const state    = computed(() => engine.value?.state);
    const live     = computed(() => engine.value?.liveStats.value || { wpm: 0, accuracy: 100 });
    const nextChar = computed(() => engine.value?.nextChar.value);

    return { loading, lesson, engine, errorKey, state, live, nextChar, restart };
  },
  template: `
    <div v-if="loading" class="text-center text-slate-400 py-12">Loading lesson…</div>
    <div v-else-if="lesson" class="space-y-6">
      <header class="flex items-end justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-wide text-slate-400">Lesson {{ lesson.order }} · {{ lesson.track }}</div>
          <h1 class="text-2xl font-extrabold text-ink-900">{{ lesson.title }}</h1>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl">{{ lesson.description }}</p>
        </div>
        <div class="flex items-center gap-4 text-right">
          <div>
            <div class="text-xs text-slate-400">WPM</div>
            <div class="text-2xl font-extrabold text-ink-900">{{ Math.round(live.wpm) }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Acc</div>
            <div class="text-2xl font-extrabold text-ink-900">{{ Math.round(live.accuracy) }}%</div>
          </div>
          <button @click="restart" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100">Restart</button>
        </div>
      </header>

      <div class="bg-slate-100 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600">
        Pass gate: <strong>{{ lesson.unlockGate.minWpm }} WPM</strong> &amp; <strong>{{ lesson.unlockGate.minAccuracy }}% accuracy</strong>. Just start typing — focus is automatic.
      </div>

      <TypingArea
        :prompt="state.prompt"
        :cursor-index="state.cursorIndex"
        :error-positions="state.errorPositions"
        :finished="state.finished" />

      <div class="flex justify-center">
        <Keyboard :next-char="nextChar" :error-key="errorKey" />
      </div>
    </div>
  `,
};
