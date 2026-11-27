import { useCallback, useEffect, useState } from 'react';
import { supabase, callAdmin, normalizeUsername, usernameToEmail } from '../lib/supabase';

/**
 * Login state for the shared vault.
 * status: 'loading' | 'setup' (no admin yet) | 'signedOut' | 'signedIn' | 'noAccess'
 */
export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    // Only store the session here: awaiting Supabase calls inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session ? session.user.id : session; // stable across token refreshes

  useEffect(() => {
    if (userId === undefined) return undefined;
    let cancelled = false;
    (async () => {
      if (!userId) {
        setProfile(null);
        try {
          const r = await callAdmin('status');
          if (!cancelled) setStatus(r.needsSetup ? 'setup' : 'signedOut');
        } catch {
          if (!cancelled) setStatus('signedOut');
        }
        return;
      }
      setStatus('loading');
      const { data, error } = await supabase.from('profiles').select('user_id, username, role').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setProfile(null);
        setStatus(error ? 'signedOut' : 'noAccess');
        return;
      }
      setProfile(data);
      setStatus('signedIn');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) {
      throw new Error(/invalid login/i.test(error.message) ? 'Wrong username or password.' : error.message);
    }
  }, []);

  const setup = useCallback(
    async (username, password) => {
      await callAdmin('setup', { username: normalizeUsername(username), password });
      await signIn(username, password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /** Checks the current password first, so an unattended open laptop can't be used to take over the account. */
  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      if (!profile) throw new Error('Please sign in again.');
      const check = await supabase.auth.signInWithPassword({ email: usernameToEmail(profile.username), password: currentPassword });
      if (check.error) throw new Error('Your current password is not correct.');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    [profile],
  );

  return { status, profile, isAdmin: profile?.role === 'admin', signIn, setup, signOut, changePassword };
}
