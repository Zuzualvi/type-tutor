import { reactive } from 'vue';
import { supabase, isConfigured } from './supabase/client.js';
import { getProfile, getProgressMap, getBadges, getAggregates } from './supabase/db.js';

export const store = reactive({
  ready: false,
  configured: isConfigured,
  session: null,
  user: null,
  profile: null,
  progress: new Map(),   // lessonId -> progress row
  badges: [],            // [{ badge_id, earned_at }]
  aggregates: new Map(), // lessonId -> aggregate row
  toasts: [],            // [{ id, type, title, body }]
  toastSeq: 0,
});

export function pushToast({ type = 'info', title = '', body = '' }) {
  const id = ++store.toastSeq;
  store.toasts.push({ id, type, title, body });
  setTimeout(() => {
    const i = store.toasts.findIndex(t => t.id === id);
    if (i >= 0) store.toasts.splice(i, 1);
  }, 4500);
  return id;
}

export async function refreshUserData() {
  if (!store.user) return;
  const [profile, progress, badges, aggregates] = await Promise.all([
    getProfile(store.user.id).catch(() => null),
    getProgressMap(store.user.id).catch(() => new Map()),
    getBadges(store.user.id).catch(() => []),
    getAggregates().catch(() => new Map()),
  ]);
  store.profile = profile;
  store.progress = progress;
  store.badges = badges;
  store.aggregates = aggregates;
}

export async function initAuth() {
  if (!isConfigured || !supabase) { store.ready = true; return; }
  const { data } = await supabase.auth.getSession();
  store.session = data.session ?? null;
  store.user = store.session?.user ?? null;
  if (store.user) await refreshUserData();
  store.ready = true;

  supabase.auth.onAuthStateChange(async (_event, session) => {
    store.session = session ?? null;
    store.user = session?.user ?? null;
    if (store.user) await refreshUserData();
    else {
      store.profile = null;
      store.progress = new Map();
      store.badges = [];
    }
  });
}
