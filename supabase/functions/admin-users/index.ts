// RenewalVault user management. Runs with the service role, so every action
// other than `status`/`setup` first checks that the caller is a signed-in admin.
//
// Actions (POST JSON { action, ... }):
//   status                      -> { needsSetup }            (public)
//   setup  { username, password } -> creates the first admin (public, only while no admin exists)
//   list                        -> { users }                 (admin)
//   create { username, password, role }                      (admin)
//   set_password { user_id, password }                       (admin)
//   set_role { user_id, role }                               (admin)
//   delete { user_id }                                       (admin)
import { createClient } from 'npm:@supabase/supabase-js@2';

const USER_EMAIL_DOMAIN = 'users.renewalvault.invalid';
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD = 8;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const emailFor = (username: string) => `${username}@${USER_EMAIL_DOMAIN}`;

function cleanUsername(v: unknown): string {
  const u = String(v ?? '').trim().toLowerCase();
  if (!USERNAME_RE.test(u)) {
    throw new HttpError(400, 'Username must be 3–32 characters: letters, numbers, dot, dash or underscore.');
  }
  return u;
}

function cleanPassword(v: unknown): string {
  const p = String(v ?? '');
  if (p.length < MIN_PASSWORD) throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
  if (p.length > 72) throw new HttpError(400, 'Password must be at most 72 characters.');
  return p;
}

function cleanRole(v: unknown): 'admin' | 'member' {
  if (v === 'admin' || v === 'member') return v;
  throw new HttpError(400, 'Role must be admin or member.');
}

async function adminCount(): Promise<number> {
  const { count, error } = await db.from('profiles').select('user_id', { count: 'exact', head: true }).eq('role', 'admin');
  if (error) throw error;
  return count ?? 0;
}

async function createUser(username: string, password: string, role: 'admin' | 'member') {
  const { data: taken } = await db.from('profiles').select('user_id').eq('username', username).maybeSingle();
  if (taken) throw new HttpError(409, `The username "${username}" is already taken.`);

  const { data, error } = await db.auth.admin.createUser({
    email: emailFor(username),
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) throw new HttpError(400, error?.message ?? 'Could not create the user.');

  const { error: pErr } = await db.from('profiles').insert({ user_id: data.user.id, username, role });
  if (pErr) {
    await db.auth.admin.deleteUser(data.user.id); // don't leave a half-made account
    throw new HttpError(pErr.code === '23505' ? 409 : 500, pErr.code === '23505' ? `The username "${username}" is already taken.` : 'Could not create the user.');
  }
  return { user_id: data.user.id, username, role };
}

async function requireAdmin(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in.');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  const { data: me } = await db.from('profiles').select('user_id, username, role').eq('user_id', data.user.id).maybeSingle();
  if (!me || me.role !== 'admin') throw new HttpError(403, 'Only admins can manage users.');
  return me;
}

async function getProfile(userId: unknown) {
  const id = String(userId ?? '');
  const { data } = await db.from('profiles').select('user_id, username, role').eq('user_id', id).maybeSingle();
  if (!data) throw new HttpError(404, 'That user does not exist.');
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'status') {
      return json({ needsSetup: (await adminCount()) === 0 });
    }

    if (action === 'setup') {
      if ((await adminCount()) > 0) throw new HttpError(403, 'Setup is already done. Please sign in.');
      const user = await createUser(cleanUsername(body.username), cleanPassword(body.password), 'admin');
      return json({ user });
    }

    const me = await requireAdmin(req);

    switch (action) {
      case 'list': {
        const { data, error } = await db.from('profiles').select('user_id, username, role, created_at').order('username');
        if (error) throw error;
        return json({ users: data });
      }
      case 'create': {
        const user = await createUser(cleanUsername(body.username), cleanPassword(body.password), cleanRole(body.role ?? 'member'));
        return json({ user });
      }
      case 'set_password': {
        const target = await getProfile(body.user_id);
        const { error } = await db.auth.admin.updateUserById(target.user_id, { password: cleanPassword(body.password) });
        if (error) throw new HttpError(400, error.message);
        return json({ ok: true });
      }
      case 'set_role': {
        const target = await getProfile(body.user_id);
        const role = cleanRole(body.role);
        if (target.user_id === me.user_id && role !== 'admin') throw new HttpError(400, "You can't remove your own admin rights.");
        const { error } = await db.from('profiles').update({ role }).eq('user_id', target.user_id);
        if (error) throw error;
        return json({ ok: true });
      }
      case 'delete': {
        const target = await getProfile(body.user_id);
        if (target.user_id === me.user_id) throw new HttpError(400, "You can't delete your own account.");
        const { error } = await db.auth.admin.deleteUser(target.user_id); // profile row cascades
        if (error) throw new HttpError(400, error.message);
        return json({ ok: true });
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
