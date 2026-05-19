import { store } from '../store.js';

export default {
  name: 'BadgeToast',
  setup() {
    return { store };
  },
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 w-80">
      <div v-for="t in store.toasts" :key="t.id"
           class="animate-popIn bg-white border border-slate-200 shadow-lg rounded-lg p-3 flex gap-3 items-start">
        <div :class="iconBg(t.type)" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {{ iconChar(t.type) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm text-ink-900">{{ t.title }}</div>
          <div class="text-xs text-slate-600 mt-0.5">{{ t.body }}</div>
        </div>
      </div>
    </div>
  `,
  methods: {
    iconBg(type) {
      return {
        badge:  'bg-amber-500',
        level:  'bg-violet-500',
        streak: 'bg-orange-500',
        info:   'bg-brand-500',
        error:  'bg-red-500',
      }[type] || 'bg-brand-500';
    },
    iconChar(type) {
      return { badge: '★', level: '↑', streak: '◆', info: 'i', error: '!' }[type] || 'i';
    },
  },
};
