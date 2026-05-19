import { reactive, computed, ref } from 'vue';
import { netWpm, accuracyPct } from './metrics.js';

export function createEngine(prompt, { onComplete, onError } = {}) {
  const state = reactive({
    prompt,
    typed: '',
    cursorIndex: 0,
    errors: 0,             // monotonic — backspace does NOT decrement
    errorPositions: new Set(),
    keyErrors: {},
    startedAt: null,
    endedAt: null,
    finished: false,
  });

  const nextChar = computed(() =>
    state.finished ? null : state.prompt[state.cursorIndex] ?? null
  );

  const liveStats = ref({ wpm: 0, accuracy: 100 });
  let liveTimer = null;

  function recomputeLive() {
    const now = performance.now();
    const ms = state.startedAt ? (now - state.startedAt) : 0;
    liveStats.value = {
      wpm: netWpm({ chars: state.typed.length, errors: state.errors, ms }),
      accuracy: accuracyPct({ chars: state.typed.length, errors: state.errors }),
    };
  }

  function startLiveTimer() {
    if (liveTimer) return;
    liveTimer = setInterval(recomputeLive, 250);
  }
  function stopLiveTimer() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
  }

  function summary() {
    const ms = (state.endedAt ?? performance.now()) - (state.startedAt ?? performance.now());
    return {
      wpm: netWpm({ chars: state.typed.length, errors: state.errors, ms }),
      accuracy: accuracyPct({ chars: state.typed.length, errors: state.errors }),
      errors: state.errors,
      durationSec: Math.max(0, ms / 1000),
      charsTyped: state.typed.length,
      weakKeys: { ...state.keyErrors },
    };
  }

  function handleKey(e) {
    if (state.finished) return;

    // Modifier-only & navigation keys -> ignore.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' ||
        e.key === 'Meta'  || e.key === 'CapsLock' || e.key === 'Tab' ||
        e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' ||
        e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Escape') {
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.cursorIndex === 0) return;
      state.cursorIndex -= 1;
      state.typed = state.typed.slice(0, -1);
      state.errorPositions.delete(state.cursorIndex);
      return;
    }

    // Single-character keys (printable). Enter -> newline if prompt has them.
    let char;
    if (e.key === 'Enter') char = '\n';
    else if (e.key.length === 1) char = e.key;
    else return;

    e.preventDefault();

    if (state.startedAt == null) {
      state.startedAt = performance.now();
      startLiveTimer();
    }

    const expected = state.prompt[state.cursorIndex];
    const isCorrect = char === expected;

    state.typed += char;
    if (!isCorrect) {
      state.errors += 1;
      state.errorPositions.add(state.cursorIndex);
      const k = expected || '?';
      state.keyErrors[k] = (state.keyErrors[k] || 0) + 1;
      onError && onError({ expected, got: char, index: state.cursorIndex });
    }
    state.cursorIndex += 1;

    if (state.cursorIndex >= state.prompt.length) {
      state.finished = true;
      state.endedAt = performance.now();
      stopLiveTimer();
      recomputeLive();
      onComplete && onComplete(summary());
    }
  }

  function attach() { window.addEventListener('keydown', handleKey); }
  function detach() { window.removeEventListener('keydown', handleKey); stopLiveTimer(); }

  function reset(newPrompt) {
    stopLiveTimer();
    state.prompt = newPrompt ?? state.prompt;
    state.typed = '';
    state.cursorIndex = 0;
    state.errors = 0;
    state.errorPositions = new Set();
    state.keyErrors = {};
    state.startedAt = null;
    state.endedAt = null;
    state.finished = false;
    liveStats.value = { wpm: 0, accuracy: 100 };
  }

  return { state, nextChar, liveStats, attach, detach, reset, summary };
}
