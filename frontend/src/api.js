import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
export async function api(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api' + path, {
    ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: opts.body && JSON.stringify(opts.body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Request failed');
  return j;
}
