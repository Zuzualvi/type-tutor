import { ref, onMounted, computed } from 'vue';
import { store } from '../store.js';
import { getLessons, isUnlocked } from '../curriculum/index.js';
import LessonCard from '../components/LessonCard.js';

export default {
  name: 'HomeView',
  components: { LessonCard },
  setup() {
    const loading = ref(true);
    const lessons = ref([]);
    const lessonMap = ref(new Map());

    onMounted(async () => {
      const { list, map } = await getLessons();
      lessons.value = list;
      lessonMap.value = map;
      loading.value = false;
    });

    const coreLessons  = computed(() => lessons.value.filter(l => l.track === 'core'));
    const codeLessons  = computed(() => lessons.value.filter(l => l.track === 'code'));
    const bonusLessons = computed(() => lessons.value.filter(l => l.track === 'bonus'));

    function unlocked(lesson) {
      return isUnlocked(lesson, store.progress, lessonMap.value);
    }
    function progressFor(id) {
      return store.progress.get(id) || null;
    }

    const totals = computed(() => {
      const passed = lessons.value.filter(l => store.progress.get(l.id)?.passed).length;
      const total  = lessons.value.length;
      return { passed, total, pct: total ? (passed / total) * 100 : 0 };
    });

    return { loading, coreLessons, codeLessons, bonusLessons, unlocked, progressFor, totals, store };
  },
  template: `
    <div v-if="loading" class="text-center text-slate-400 py-12">Loading lessons…</div>
    <div v-else class="space-y-8">
      <section class="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold">Welcome back{{ store.profile?.username ? ', ' + store.profile.username : '' }}.</h1>
            <p class="text-brand-50 text-sm mt-1">Pick up where you left off — every session counts toward your streak.</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-extrabold">{{ totals.passed }}/{{ totals.total }}</div>
            <div class="text-xs text-brand-50">lessons passed</div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-extrabold text-ink-900 mb-3">Core Curriculum</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <LessonCard v-for="l in coreLessons" :key="l.id" :lesson="l" :progress="progressFor(l.id)" :unlocked="unlocked(l)" />
        </div>
      </section>

      <section v-if="codeLessons.length">
        <h2 class="text-lg font-extrabold text-ink-900 mb-3">Code Track</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <LessonCard v-for="l in codeLessons" :key="l.id" :lesson="l" :progress="progressFor(l.id)" :unlocked="unlocked(l)" />
        </div>
      </section>

      <section v-if="bonusLessons.length">
        <h2 class="text-lg font-extrabold text-ink-900 mb-3">Bonus Lessons</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <LessonCard v-for="l in bonusLessons" :key="l.id" :lesson="l" :progress="progressFor(l.id)" :unlocked="unlocked(l)" />
        </div>
      </section>
    </div>
  `,
};
