import { supabase } from './client.js';

function need() {
  if (!supabase) throw new Error('Supabase not configured.');
  return supabase;
}

// ----- profiles -----

export async function getProfile(userId) {
  const { data, error } = await need()
    .from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await need()
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ----- sessions -----

export async function insertSession(row) {
  const { data, error } = await need()
    .from('lesson_sessions').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function getSession(sessionId) {
  const { data, error } = await need()
    .from('lesson_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentSessions(userId, limit = 20) {
  const { data, error } = await need()
    .from('lesson_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ----- progress -----

export async function getProgressMap(userId) {
  const { data, error } = await need()
    .from('lesson_progress').select('*').eq('user_id', userId);
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.lesson_id, row);
  return map;
}

export async function upsertProgress({ userId, lessonId, wpm, accuracy, passed }) {
  const supa = need();
  const { data: existing } = await supa
    .from('lesson_progress').select('*')
    .eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle();

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    lesson_id: lessonId,
    best_wpm: Math.max(existing?.best_wpm ?? 0, wpm),
    best_accuracy: Math.max(existing?.best_accuracy ?? 0, accuracy),
    attempts: (existing?.attempts ?? 0) + 1,
    passed: (existing?.passed ?? false) || passed,
    first_passed_at: existing?.first_passed_at ?? (passed ? now : null),
    last_attempt_at: now,
  };
  const { error } = await supa.from('lesson_progress').upsert(row);
  if (error) throw error;
  return { row, wasFirstPass: !existing?.passed && passed };
}

// ----- badges -----

export async function getBadges(userId) {
  const { data, error } = await need()
    .from('user_badges').select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function insertBadge(userId, badgeId) {
  const { error } = await need()
    .from('user_badges').insert({ user_id: userId, badge_id: badgeId });
  if (error && error.code !== '23505') throw error; // 23505 = unique violation (already earned)
}

// ----- aggregates -----

export async function getAggregates() {
  const { data, error } = await need()
    .from('lesson_aggregates').select('*');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.lesson_id, row);
  return map;
}
