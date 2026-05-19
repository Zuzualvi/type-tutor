import { computed } from 'vue';
import { store } from '../store.js';
import { BADGES } from '../gamification/badges.js';

export default {
  name: 'BadgesView',
  setup() {
    const earnedSet = computed(() => new Set(store.badges.map(b => b.badge_id)));
    const earnedDate = computed(() => {
      const m = new Map();
      for (const b of store.badges) m.set(b.badge_id, b.earned_at);
      return m;
    });
    return { BADGES, earnedSet, earnedDate };
  },
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-extrabold text-ink-900">Badges</h1>
      <p class="text-sm text-slate-600">{{ earnedSet.size }} of {{ BADGES.length }} earned.</p>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="b in BADGES" :key="b.id"
             :class="earnedSet.has(b.id) ? 'bg-white border-brand-200' : 'bg-slate-50 border-slate-200 opacity-60'"
             class="border rounded-xl p-4">
          <div class="flex items-center gap-3 mb-1">
            <div :class="earnedSet.has(b.id) ? 'bg-amber-500' : 'bg-slate-300'"
                 class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold">★</div>
            <div class="font-bold text-ink-900 text-sm">{{ b.title }}</div>
          </div>
          <div class="text-xs text-slate-600">{{ b.desc }}</div>
          <div v-if="earnedSet.has(b.id)" class="text-[10px] text-slate-400 mt-2">
            earned {{ new Date(earnedDate.get(b.id)).toLocaleDateString() }}
          </div>
        </div>
      </div>
    </div>
  `,
};
