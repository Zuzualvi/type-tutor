// WPM (net) = (chars/5)/minutes - errors/minutes
// Accuracy  = (chars_typed - errors) / chars_typed * 100
// Matches keybr/typing.com convention.

export function netWpm({ chars, errors, ms }) {
  if (!ms || ms <= 0 || !chars) return 0;
  const minutes = ms / 60000;
  const gross = (chars / 5) / minutes;
  const penalty = errors / minutes;
  return Math.max(0, gross - penalty);
}

export function accuracyPct({ chars, errors }) {
  if (!chars) return 100;
  return Math.max(0, ((chars - errors) / chars) * 100);
}

export function roundTo(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
