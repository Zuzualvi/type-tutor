import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?bundle';

const cfg = window.APP_CONFIG || {};

function looksUnconfigured(v) {
  return !v || /PASTE_YOUR_/.test(v);
}

export const isConfigured = !looksUnconfigured(cfg.supabaseUrl) && !looksUnconfigured(cfg.supabaseAnonKey);

export const supabase = isConfigured
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
