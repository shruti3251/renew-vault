import { useState } from 'react';
import { Eye, EyeOff, ShieldHalf } from 'lucide-react';
import { Button, Card, inputCls } from './ui';
import { MIN_PASSWORD, USERNAME_RE, normalizeUsername } from '../lib/supabase';

export function PasswordInput({ id, value, onChange, autoComplete, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${inputCls} pr-12`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-white"
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function validateNewCredentials(username, password, confirm) {
  if (!USERNAME_RE.test(normalizeUsername(username))) return 'Username must be 3–32 characters: letters, numbers, dot, dash or underscore.';
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (confirm !== undefined && password !== confirm) return 'The two passwords do not match.';
  return null;
}

const shell =
  'flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-fuchsia-50 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-slate-100';

function Brand() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30">
        <ShieldHalf className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="text-2xl font-extrabold tracking-tight">
        Renewal<span className="text-indigo-600 dark:text-indigo-400">Vault</span>
      </span>
    </div>
  );
}

const labelCls = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

/** Login, first-run admin setup, and "no access" screens. */
export default function AuthScreen({ auth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (auth.status === 'loading') {
    return (
      <div className={shell}>
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 motion-reduce:animate-none" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (auth.status === 'noAccess') {
    return (
      <div className={shell}>
        <Card className="w-full max-w-sm p-6 text-center sm:p-8">
          <Brand />
          <h1 className="text-lg font-bold">No access</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">This account is not set up for RenewalVault. Ask your admin to create a user for you.</p>
          <Button className="mt-5 w-full" variant="secondary" onClick={auth.signOut}>
            Sign out
          </Button>
        </Card>
      </div>
    );
  }

  const isSetup = auth.status === 'setup';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (isSetup) {
      const problem = validateNewCredentials(username, password, confirm);
      if (problem) return setError(problem);
    } else if (!username.trim() || !password) {
      return setError('Enter your username and password.');
    }
    setBusy(true);
    try {
      if (isSetup) await auth.setup(username, password);
      else await auth.signIn(username, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className={shell}>
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <Brand />
        <h1 className="text-center text-xl font-bold">{isSetup ? 'Create the admin account' : 'Sign in'}</h1>
        <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">
          {isSetup
            ? 'First-time setup. This account can add and manage other users from Settings.'
            : 'Use the username and password your admin gave you.'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="auth-username" className={labelCls}>
              Username
            </label>
            <input
              id="auth-username"
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
            {isSetup && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">3–32 characters: letters, numbers, dot, dash or underscore.</p>}
          </div>
          <div>
            <label htmlFor="auth-password" className={labelCls}>
              Password
            </label>
            <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete={isSetup ? 'new-password' : 'current-password'} />
            {isSetup && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">At least {MIN_PASSWORD} characters.</p>}
          </div>
          {isSetup && (
            <div>
              <label htmlFor="auth-confirm" className={labelCls}>
                Confirm password
              </label>
              <PasswordInput id="auth-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : isSetup ? 'Create admin and sign in' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
