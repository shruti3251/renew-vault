import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Shared cloud vault. When the env vars are missing (e.g. a quick local
 * checkout), this is null and the app falls back to browser-only storage
 * with no login.
 */
export const supabase = url && key ? createClient(url, key) : null;

/** The shared vault table (see supabase/migrations). */
export const TABLE = 'items';

/** Users sign in with a username; Supabase Auth needs an email, so map it. Keep in sync with the admin-users function. */
const USER_EMAIL_DOMAIN = 'users.renewalvault.invalid';
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD = 8;

export const normalizeUsername = (u) => String(u || '').trim().toLowerCase();
export const usernameToEmail = (u) => `${normalizeUsername(u)}@${USER_EMAIL_DOMAIN}`;

/** Call the admin-users edge function. Resolves with its JSON, or throws an Error with a readable message. */
export async function callAdmin(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
  if (error) {
    let message = 'Could not reach the server. Check your internet connection.';
    try {
      const body = await error.context.json();
      if (body && body.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  return data;
}
