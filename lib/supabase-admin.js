// Server-only Supabase client using the service-role key.
//
// This bypasses Row Level Security, so it must NEVER be imported into any
// browser/client code — only into API routes (e.g. the episode harvester) that
// run on the server. The service-role key lives in Vercel as
// SUPABASE_SERVICE_ROLE_KEY and is never exposed to the browser.
//
// The public, browser-safe client stays in lib/supabase.js (anon key).

import { createClient } from '@supabase/supabase-js';

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Created lazily so a missing key surfaces a clear error at call time rather
// than crashing unrelated routes at import time.
export function getSupabaseAdmin() {
  if (!url || !serviceKey) {
    throw new Error('Supabase admin not configured (SUPABASE_SERVICE_ROLE_KEY missing)');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
