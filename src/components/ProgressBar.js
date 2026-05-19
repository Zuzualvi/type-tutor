export default {
  name: 'ProgressBar',
  props: {
    value: { type: Number, default: 0 },     // 0..100
    label: { type: String, default: '' },
    color: { type: String, default: 'brand' }, // brand | amber | violet
  },
  computed: {
    barClass() {
      const map = {
        brand:  'bg-brand-500',
        amber:  'bg-amber-500',
        violet: 'bg-violet-500',
        ink:    'bg-ink-700',
      };
      return map[this.color] || map.brand;
    },
  },
  template: `
    <div class="w-full">
      <div v-if="label" class="text-xs text-slate-500 mb-1 flex justify-between">
        <span>{{ label }}</span><span>{{ Math.round(value) }}%</span>
      </div>
      <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div :class="barClass" class="h-full transition-all duration-300" :style="{ width: Math.min(100, Math.max(0, value)) + '%' }"></div>
      </div>
    </div>
  `,
};
