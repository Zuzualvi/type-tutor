import { computed } from 'vue';
import { store } from '../store.js';
import { navigate, currentRoute } from '../router.js';
import { signOut } from '../supabase/auth.js';
import { levelInfo } from '../gamification/xp.js';

export default {
  name: 'AppShell',
  setup() {
    const lvl = computed(() => levelInfo(store.profile?.total_xp || 0));
    const route = currentRoute;
    return { store, lvl, route, navigate };
  },
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <button @click="navigate('/')" class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-md bg-brand-500 text-white font-bold flex items-center justify-center">TT</div>
            <span class="font-extrabold text-ink-900">Typing Tutor</span>
          </button>

          <nav class="hidden md:flex items-center gap-1 ml-4 text-sm">
            <button @click="navigate('/')"          :class="navClass('home')">Lessons</button>
            <button @click="navigate('/dashboard')" :class="navClass('dashboard')">Dashboard</button>
            <button @click="navigate('/freetype')"  :class="navClass('freetype')">Free Type</button>
            <button @click="navigate('/badges')"    :class="navClass('badges')">Badges</button>
          </nav>

          <div class="ml-auto flex items-center gap-3 text-sm">
            <div v-if="store.profile" class="hidden sm:flex items-center gap-3">
              <div class="flex items-center gap-1.5" :title="'Current streak'">
                <span class="text-orange-500 font-bold">●</span>
                <span class="font-bold">{{ store.profile.current_streak }}</span>
                <span class="text-slate-500">day streak</span>
              </div>
              <div class="flex items-center gap-1.5" :title="'Total XP'">
                <span class="text-amber-500 font-bold">★</span>
                <span class="font-bold">{{ store.profile.total_xp }}</span>
                <span class="text-slate-500">XP</span>
              </div>
              <div class="flex items-center gap-1.5" :title="'Level — ' + Math.round(lvl.progressPct) + '% to next'">
                <div class="relative w-7 h-7">
                  <svg viewBox="0 0 36 36" class="w-7 h-7 -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" stroke-width="3"/>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#049F82" stroke-width="3"
                            stroke-dasharray="100" :stroke-dashoffset="100 - lvl.progressPct" stroke-linecap="round"/>
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-ink-900">{{ lvl.level }}</span>
                </div>
              </div>
            </div>
            <button @click="navigate('/settings')" class="text-slate-500 hover:text-ink-900" title="Settings">⚙</button>
            <button @click="logout" class="text-xs text-slate-500 hover:text-red-600">Sign out</button>
          </div>
        </div>
      </header>

      <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <slot />
      </main>

      <footer class="text-center text-xs text-slate-400 py-4">
        Built as a personal side project. Free forever.
      </footer>
    </div>
  `,
  methods: {
    navClass(name) {
      const base = 'px-3 py-1.5 rounded-md';
      const active = 'bg-brand-50 text-brand-700 font-bold';
      const idle = 'text-slate-600 hover:bg-slate-100';
      return `${base} ${this.isActive(name) ? active : idle}`;
    },
    isActive(name) { return this.route.name === name; },
    async logout() {
      await signOut();
      navigate('/login');
    },
  },
};
