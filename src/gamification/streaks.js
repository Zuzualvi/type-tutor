// Streak math. All dates are interpreted in the user's local timezone.

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

export function updateStreak({ currentStreak, longestStreak, lastActiveDate }) {
  const today = toYMD(new Date());
  if (!lastActiveDate) {
    const cs = 1;
    return { currentStreak: cs, longestStreak: Math.max(longestStreak || 0, cs), lastActiveDate: today, changed: true };
  }
  const diff = daysBetween(lastActiveDate, today);
  let cs = currentStreak || 0;
  let changed = false;
  if (diff === 0) {
    // same day — no change
  } else if (diff === 1) {
    cs = (cs || 0) + 1;
    changed = true;
  } else {
    cs = 1;
    changed = true;
  }
  return {
    currentStreak: cs,
    longestStreak: Math.max(longestStreak || 0, cs),
    lastActiveDate: today,
    changed,
  };
}

export function daysSince(lastActiveDate) {
  if (!lastActiveDate) return Infinity;
  return daysBetween(lastActiveDate, toYMD(new Date()));
}
