// Triangular XP curve: xpForLevel(n) = 100 * n * (n+1) / 2
// Level 1=100, 5=1500, 10=5500.

export function xpForLevel(n) {
  return 100 * n * (n + 1) / 2;
}

export function levelForXp(totalXp) {
  let n = 1;
  while (xpForLevel(n) <= totalXp) n++;
  return n - 1 + 1; // current level = lowest n s.t. xpForLevel(n) > totalXp ... but level 1 starts at 0
}

// Actually clearer: level 1 spans [0, 100), level 2 spans [100, 300), etc.
export function levelInfo(totalXp) {
  let n = 1;
  while (xpForLevel(n) <= totalXp) n++;
  const currentLevel = n;
  const prevThreshold = currentLevel === 1 ? 0 : xpForLevel(currentLevel - 1);
  const nextThreshold = xpForLevel(currentLevel);
  const into = totalXp - prevThreshold;
  const span = nextThreshold - prevThreshold;
  return {
    level: currentLevel,
    xpIntoLevel: into,
    xpForNextLevel: span,
    progressPct: Math.min(100, (into / span) * 100),
  };
}

export function computeXp({ lesson, wpm, accuracy, firstTimePass }) {
  const gate = lesson.unlockGate || { minWpm: 0, minAccuracy: 0 };
  const base = lesson.xpReward || 50;
  const speedBonus = Math.max(0, Math.round((wpm - gate.minWpm) * 2));
  const accBonus = accuracy >= 98 ? 25 : 0;
  const firstBonus = firstTimePass ? 100 : 0;
  return base + speedBonus + accBonus + firstBonus;
}
