// Aggregate weak-key counts across multiple session.weak_keys jsonb objects.
export function aggregateWeakKeys(sessions) {
  const totals = {};
  for (const s of sessions) {
    const wk = s.weak_keys || {};
    for (const [k, v] of Object.entries(wk)) {
      totals[k] = (totals[k] || 0) + (Number(v) || 0);
    }
  }
  return totals;
}

export function topWeakKeys(totals, n = 5) {
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}
