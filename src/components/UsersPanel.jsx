import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
import { Button, inputCls } from './ui';
import ConfirmDialog from './ConfirmDialog';
import { PasswordInput, validateNewCredentials } from './AuthScreen';
import { callAdmin, normalizeUsername, MIN_PASSWORD } from '../lib/supabase';

const labelCls = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';
const selectCls =
  'min-h-[40px] rounded-lg border-0 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700';

function ResetPassword({ user, toast, onDone }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const id = `reset-${user.user_id}`;
  const save = async (e) => {
    e.preventDefault();
    if (pw.length < MIN_PASSWORD) return toast.error(`Password must be at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    try {
      await callAdmin('set_password', { user_id: user.user_id, password: pw });
      toast.success(`Password changed for ${user.username}. Share the new one with them privately.`);
      onDone();
    } catch (err) {
      toast.error(err.message, { title: 'Password not changed' });
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor={id} className={labelCls}>
          New password for {user.username}
        </label>
        <PasswordInput id={id} value={pw} onChange={setPw} autoComplete="new-password" autoFocus />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Admin-only: list, add, re-role, reset and delete portal users. */
export default function UsersPanel({ me, toast }) {
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'member' });
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await callAdmin('list');
      setUsers(r.users);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    const problem = validateNewCredentials(form.username, form.password);
    if (problem) return setFormError(problem);
    setBusy(true);
    try {
      const r = await callAdmin('create', { username: normalizeUsername(form.username), password: form.password, role: form.role });
      toast.success(`User ${r.user.username} created. Share their username and password with them privately.`);
      setForm({ username: '', password: '', role: 'member' });
      await load();
    } catch (err) {
      setFormError(err.message);
    }
    setBusy(false);
  };

  const changeRole = async (user, role) => {
    try {
      await callAdmin('set_role', { user_id: user.user_id, role });
      toast.success(`${user.username} is now ${role === 'admin' ? 'an admin' : 'a member'}.`);
      await load();
    } catch (err) {
      toast.error(err.message, { title: 'Role not changed' });
    }
  };

  const remove = (user) =>
    setConfirm({
      title: `Delete user ${user.username}?`,
      message: `${user.username} will no longer be able to sign in. Documents in the vault are kept. This can't be undone, but you can create the user again.`,
      confirmLabel: 'Delete user',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await callAdmin('delete', { user_id: user.user_id });
          toast.success(`Deleted user ${user.username}.`);
          await load();
        } catch (err) {
          toast.error(err.message, { title: 'User not deleted' });
        }
      },
    });

  return (
    <div className="space-y-5">
      {loadError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {loadError}{' '}
          <button type="button" className="font-semibold underline" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {!users && !loadError && <p className="text-sm text-slate-500 dark:text-slate-400">Loading users…</p>}

      {users && (
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 dark:divide-slate-800 dark:ring-slate-700">
          {users.map((u) => {
            const isMe = u.user_id === me.user_id;
            return (
              <li key={u.user_id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {u.username} {isMe && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Added {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <label className="sr-only" htmlFor={`role-${u.user_id}`}>
                    Role for {u.username}
                  </label>
                  <select
                    id={`role-${u.user_id}`}
                    className={selectCls}
                    value={u.role}
                    disabled={isMe}
                    title={isMe ? "You can't change your own role" : undefined}
                    onChange={(e) => changeRole(u, e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button variant="secondary" className="min-h-[40px]" onClick={() => setResetFor(resetFor === u.user_id ? null : u.user_id)} aria-expanded={resetFor === u.user_id}>
                    <KeyRound className="h-4 w-4" aria-hidden="true" /> Reset password
                  </Button>
                  {!isMe && (
                    <Button variant="dangerSoft" className="min-h-[40px]" onClick={() => remove(u)} aria-label={`Delete user ${u.username}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                    </Button>
                  )}
                </div>
                {resetFor === u.user_id && <ResetPassword user={u} toast={toast} onDone={() => setResetFor(null)} />}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={addUser} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50" noValidate>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Add a user
        </h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="new-username" className={labelCls}>
              Username
            </label>
            <input
              id="new-username"
              className={inputCls}
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div>
            <label htmlFor="new-password" className={labelCls}>
              Password
            </label>
            <PasswordInput id="new-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="new-role" className={labelCls}>
              Role
            </label>
            <select id="new-role" className={`${selectCls} min-h-[44px] w-full`} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Members can view and edit all documents. Admins can also manage users. Passwords need at least {MIN_PASSWORD} characters.
        </p>
        {formError && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {formError}
          </p>
        )}
        <Button type="submit" className="mt-3" disabled={busy}>
          <UserPlus className="h-4 w-4" aria-hidden="true" /> {busy ? 'Creating…' : 'Create user'}
        </Button>
      </form>

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

/** Every user: who am I, change my password, sign out. */
export function AccountPanel({ auth, toast }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_PASSWORD) return setError(`New password must be at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    try {
      await auth.changePassword(current, next);
      toast.success('Your password has been changed.');
      setOpen(false);
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div>
      <p className="text-sm text-slate-700 dark:text-slate-200">
        Signed in as <strong>{auth.profile.username}</strong> ({auth.isAdmin ? 'admin' : 'member'})
      </p>
      {!open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Change my password
          </Button>
          <Button variant="ghost" onClick={auth.signOut}>
            Sign out
          </Button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-3 grid max-w-md gap-3" noValidate>
          <div>
            <label htmlFor="cur-pw" className={labelCls}>
              Current password
            </label>
            <PasswordInput id="cur-pw" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
          </div>
          <div>
            <label htmlFor="next-pw" className={labelCls}>
              New password
            </label>
            <PasswordInput id="next-pw" value={next} onChange={setNext} autoComplete="new-password" />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
