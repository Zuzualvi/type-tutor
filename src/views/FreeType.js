import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { createEngine } from '../engine/typingEngine.js';
import { baseKeyFor } from '../engine/fingerMap.js';
import TypingArea from '../components/TypingArea.js';
import Keyboard from '../components/Keyboard.js';

const DEFAULT_TEXT = "Paste any text here, hit Start, and just type. Nothing is saved — pure practice. The keyboard highlight, finger colors, live WPM and accuracy all still work.";

export default {
  name: 'FreeTypeView',
  components: { TypingArea, Keyboard },
  setup() {
    const raw = ref(DEFAULT_TEXT);
    const engine = ref(null);
    const errorKey = ref(null);
    const started = ref(false);
    let errorTimer = null;

    function start() {
      if (engine.value) engine.value.detach();
      engine.value = createEngine(raw.value, {
        onError({ expected }) {
          errorKey.value = baseKeyFor(expected);
          if (errorTimer) clearTimeout(errorTimer);
          errorTimer = setTimeout(() => { errorKey.value = null; }, 180);
        },
      });
      engine.value.attach();
      started.value = true;
    }

    function stop() {
      if (engine.value) { engine.value.detach(); engine.value = null; }
      started.value = false;
    }

    onBeforeUnmount(stop);

    const live  = computed(() => engine.value?.liveStats.value || { wpm: 0, accuracy: 100 });
    const state = computed(() => engine.value?.state);
    const nextChar = computed(() => engine.value?.nextChar.value);

    return { raw, engine, errorKey, started, start, stop, live, state, nextChar };
  },
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-extrabold text-ink-900">Free Type</h1>
      <p class="text-sm text-slate-600">Paste any prose, code, or excerpt below. Nothing here is saved to your progress.</p>

      <div v-if="!started">
        <textarea v-model="raw" rows="6"
                  class="w-full p-3 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-brand-300"></textarea>
        <button @click="start" class="mt-2 px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm">
          Start typing
        </button>
      </div>

      <div v-else class="space-y-4">
        <div class="flex items-center justify-end gap-4">
          <div class="text-right"><div class="text-xs text-slate-400">WPM</div><div class="text-2xl font-extrabold">{{ Math.round(live.wpm) }}</div></div>
          <div class="text-right"><div class="text-xs text-slate-400">Acc</div><div class="text-2xl font-extrabold">{{ Math.round(live.accuracy) }}%</div></div>
          <button @click="stop" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100">Edit text</button>
        </div>
        <TypingArea v-if="state"
          :prompt="state.prompt"
          :cursor-index="state.cursorIndex"
          :error-positions="state.errorPositions"
          :finished="state.finished" />
        <div class="flex justify-center"><Keyboard :next-char="nextChar" :error-key="errorKey" /></div>
      </div>
    </div>
  `,
};
