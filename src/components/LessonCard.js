import { navigate } from '../router.js';

export default {
  name: 'LessonCard',
  props: {
    lesson:   { type: Object, required: true },
    progress: { type: Object, default: null },
    unlocked: { type: Boolean, default: false },
  },
  computed: {
    passed()    { return !!this.progress?.passed; },
    bestWpm()   { return Number(this.progress?.best_wpm || 0); },
    bestAcc()   { return Number(this.progress?.best_accuracy || 0); },
    attempts()  { return this.progress?.attempts || 0; },
    statusLabel() {
      if (!this.unlocked) return 'Locked';
      if (this.passed)    return 'Passed';
      if (this.attempts)  return 'In progress';
      return 'New';
    },
    statusClass() {
      if (!this.unlocked) return 'bg-slate-200 text-slate-500';
      if (this.passed)    return 'bg-brand-100 text-brand-700';
      if (this.attempts)  return 'bg-amber-100 text-amber-700';
      return 'bg-slate-100 text-slate-600';
    },
  },
  methods: {
    open() {
      if (!this.unlocked) return;
      navigate(`/lesson/${this.lesson.id}`);
    },
  },
  template: `
    <button @click="open" :disabled="!unlocked"
            class="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-brand-300 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-slate-200 w-full">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wide text-slate-400">Lesson {{ lesson.order }}</div>
          <div class="font-bold text-ink-900 truncate">{{ lesson.title }}</div>
        </div>
        <span class="text-[10px] font-bold px-2 py-1 rounded-full" :class="statusClass">{{ statusLabel }}</span>
      </div>
      <p class="text-xs text-slate-600 mt-2 line-clamp-2">{{ lesson.description }}</p>
      <div class="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span>Gate: {{ lesson.unlockGate.minWpm }} WPM · {{ lesson.unlockGate.minAccuracy }}%</span>
        <span v-if="bestWpm > 0">Best: {{ bestWpm }} WPM · {{ bestAcc }}%</span>
      </div>
    </button>
  `,
};
