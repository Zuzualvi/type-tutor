// Renders the prompt with per-character classes driven by the engine's state.
export default {
  name: 'TypingArea',
  props: {
    prompt:         { type: String, required: true },
    cursorIndex:    { type: Number, required: true },
    errorPositions: { type: Object, required: true }, // Set<number>
    finished:       { type: Boolean, default: false },
  },
  computed: {
    chars() {
      const out = [];
      for (let i = 0; i < this.prompt.length; i++) {
        const ch = this.prompt[i];
        let cls = 'char';
        if (ch === ' ') cls += ' space';
        if (ch === '\n') cls += ' newline';
        if (i < this.cursorIndex) cls += this.errorPositions.has(i) ? ' wrong' : ' done';
        else if (i === this.cursorIndex && !this.finished) cls += ' cursor';
        out.push({ ch, cls, i });
      }
      return out;
    },
  },
  methods: {
    render(ch) {
      if (ch === '\n') return '↵\n';
      if (ch === ' ')  return ' ';
      return ch;
    },
  },
  template: `
    <div class="typing-prompt bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-3xl mx-auto scrollbar-thin">
      <template v-for="c in chars" :key="c.i"><span :class="c.cls">{{ render(c.ch) }}</span></template>
    </div>
  `,
};
