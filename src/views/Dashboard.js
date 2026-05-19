import { ref, onMounted, computed } from 'vue';
import { store } from '../store.js';
import { getRecentSessions } from '../supabase/db.js';
import { aggregateWeakKeys, topWeakKeys } from '../engine/weakKeys.js';
import { FINGERS, KEY_TO_FINGER } from '../engine/fingerMap.js';
import Chart from '../components/Chart.js';

export default {
  name: 'DashboardView',
  components: { Chart },
  setup() {
    const loading = ref(true);
    const sessions = ref([]);

    onMounted(async () => {
      sessions.value = await getRecentSessions(store.user.id, 50);
      loading.value = false;
    });

    const reversed = computed(() => sessions.value.slice().reverse());

    const wpmChart = computed(() => ({
      labels: reversed.value.map((_, i) => '#' + (i + 1)),
      datasets: [{
        label: 'WPM',
        data: reversed.value.map(s => Number(s.wpm)),
        borderColor: '#049F82',
        backgroundColor: 'rgba(4,159,130,0.15)',
        tension: 0.3,
        fill: true,
      }],
    }));

    const accChart = computed(() => ({
      labels: reversed.value.map((_, i) => '#' + (i + 1)),
      datasets: [{
        label: 'Accuracy %',
        data: reversed.value.map(s => Number(s.accuracy)),
        borderColor: '#173740',
        backgroundColor: 'rgba(23,55,64,0.12)',
        tension: 0.3,
        fill: true,
      }],
    }));

    const weakTop = computed(() => topWeakKeys(aggregateWeakKeys(sessions.value.slice(0, 20)), 7));

    const totals = computed(() => {
      const cnt = sessions.value.length;
      if (!cnt) return { sessions: 0, avgWpm: 0, avgAcc: 0, lifetimeChars: 0 };
      const sum = sessions.value.reduce((acc, s) => {
        acc.wpm += Number(s.wpm); acc.acc += Number(s.accuracy); acc.chars += Number(s.chars_typed || 0);
        return acc;
      }, { wpm: 0, acc: 0, chars: 0 });
      return {
        sessions: cnt,
        avgWpm: sum.wpm / cnt,
        avgAcc: sum.acc / cnt,
        lifetimeChars: sum.chars,
      };
    });

    function fingerColor(key) {
      const f = FINGERS[KEY_TO_FINGER[key]];
      return f?.borderHex || '#cbd5e1';
    }

    return { loading, sessions, wpmChart, accChart, weakTop, totals, store, fingerColor };
  },
  template: `
    <div v-if="loading" class="text-center text-slate-400 py-12">Loading dashboard…</div>
    <div v-else class="space-y-6">
      <h1 class="text-2xl font-extrabold text-ink-900">Your Progress</h1>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">Sessions</div>
          <div class="text-2xl font-extrabold text-ink-900">{{ totals.sessions }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">Avg WPM</div>
          <div class="text-2xl font-extrabold text-ink-900">{{ Math.round(totals.avgWpm) }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">Avg accuracy</div>
          <div class="text-2xl font-extrabold text-ink-900">{{ Math.round(totals.avgAcc) }}%</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="text-xs text-slate-400">Lifetime chars</div>
          <div class="text-2xl font-extrabold text-ink-900">{{ totals.lifetimeChars.toLocaleString() }}</div>
        </div>
      </div>

      <div v-if="sessions.length === 0" class="text-center text-slate-500 py-10 bg-white rounded-xl border border-slate-200">
        No sessions yet. Complete a lesson to populate your dashboard.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="font-bold text-ink-900 mb-2">WPM over time</h2>
          <Chart type="line" :data="wpmChart" />
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="font-bold text-ink-900 mb-2">Accuracy over time</h2>
          <Chart type="line" :data="accChart" />
        </div>
      </div>

      <div v-if="weakTop.length" class="bg-white rounded-xl border border-slate-200 p-4">
        <h2 class="font-bold text-ink-900 mb-3">Weak keys (last 20 sessions)</h2>
        <div class="flex flex-wrap gap-2">
          <div v-for="w in weakTop" :key="w.key"
               class="px-3 py-2 rounded-md border-2 font-mono font-bold text-ink-900"
               :style="{ borderColor: fingerColor(w.key), background: fingerColor(w.key) + '20' }">
            <span class="text-lg">{{ w.key === ' ' ? '␣' : w.key }}</span>
            <span class="text-xs text-slate-500 ml-2">×{{ w.count }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
};
