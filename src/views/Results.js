import { ref, onMounted, computed } from 'vue';
import { store } from '../store.js';
import { currentRoute, navigate } from '../router.js';
import { getSession } from '../supabase/db.js';
import { getLesson } from '../curriculum/index.js';

export default {
  name: 'ResultsView',
  setup() {
    const loading = ref(true);
    const session = ref(null);
    const lesson  = ref(null);
    const aggregate = ref(null);

    onMounted(async () => {
      const sid = currentRoute.value.params.sessionId;
      const s = await getSession(sid);
      if (!s) { navigate('/'); return; }
      session.value = s;
      lesson.value = await getLesson(s.lesson_id);
      aggregate.value = store.aggregates.get(s.lesson_id) || null;
      loading.value = false;
    });

    const passed = computed(() => session.value?.passed);
    const gate   = computed(() => lesson.value?.unlockGate);

    function next() {
      // Find the next lesson by order in same track.
      // (Quick path: just go home.)
      navigate('/');
    }
    function retry() {
      navigate('/lesson/' + lesson.value.id);
    }

    return { loading, session, lesson, aggregate, passed, gate, next, retry };
  },
  template: `
    <div v-if="loading" class="text-center text-slate-400 py-12">Loading results…</div>
    <div v-else class="max-w-2xl mx-auto space-y-6">
      <div :class="passed ? 'bg-brand-50 border-brand-200' : 'bg-amber-50 border-amber-200'"
           class="border rounded-2xl p-6 text-center">
        <div class="text-xs uppercase tracking-wide font-bold" :class="passed ? 'text-brand-700' : 'text-amber-700'">
          {{ passed ? 'Lesson Passed' : 'Almost there' }}
        </div>
        <h1 class="text-2xl font-extrabold text-ink-900 mt-1">{{ lesson.title }}</h1>
        <div class="mt-1 text-sm text-slate-600">
          Gate: {{ gate.minWpm }} WPM · {{ gate.minAccuracy }}% accuracy
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">WPM</div>
          <div class="text-3xl font-extrabold text-ink-900">{{ Math.round(session.wpm) }}</div>
          <div v-if="aggregate" class="text-[10px] text-slate-400 mt-1">avg: {{ Math.round(aggregate.avg_wpm) }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">Accuracy</div>
          <div class="text-3xl font-extrabold text-ink-900">{{ Math.round(session.accuracy) }}%</div>
          <div v-if="aggregate" class="text-[10px] text-slate-400 mt-1">avg: {{ Math.round(aggregate.avg_accuracy) }}%</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">Errors</div>
          <div class="text-3xl font-extrabold text-ink-900">{{ session.errors }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">XP earned</div>
          <div class="text-3xl font-extrabold text-brand-600">+{{ session.xp_earned }}</div>
        </div>
      </div>

      <div class="flex gap-2 justify-center">
        <button @click="retry" class="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-100 font-bold text-sm">Retry</button>
        <button @click="next" class="px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm">Back to lessons</button>
      </div>
    </div>
  `,
};
