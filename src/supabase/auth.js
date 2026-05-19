import { supabase } from './client.js';

function siteRedirect() {
  // Land back on the app root (hash routes survive the redirect).
  const { origin, pathname } = window.location;
  const base = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]+$/, '');
  return origin + base;
}

export async function sendMagicLink(email) {
  if (!supabase) throw new Error('Supabase not configured.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: siteRedirect() },
  });
  if (error) throw error;
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Supabase not configured.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email, password, username) {
  if (!supabase) throw new Error('Supabase not configured.');
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: siteRedirect(),
    },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
