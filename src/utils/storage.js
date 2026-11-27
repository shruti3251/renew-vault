/**
 * Storage adapter. ALL persistence goes through this module so it can be
 * swapped for Firebase / Supabase later: keep the same function signatures
 * (they're sync today; a cloud adapter would make load/save async and
 * useItems would await them).
 *
 * Everything lives under one versioned key. Bump STORAGE_VERSION and add a
 * step to `migrate()` when the shape changes.
 */
import { CATEGORY_MAP } from '../config/categories';
import { isValidISODate } from './dates';

export const STORAGE_KEY = 'renewalvault:v1';
export const STORAGE_VERSION = 1;

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'light' | 'dark' | 'system'
  desktopAlerts: false,
  popupDismissedOn: null, // 'YYYY-MM-DD'
};

export function emptyState() {
  return { version: STORAGE_VERSION, items: [], settings: { ...DEFAULT_SETTINGS } };
}

function migrate(raw) {
  // v1 is the first version. Future: if (raw.version === 1) { ...; raw.version = 2; }
  return raw;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Make an item safe to use, or return null if it's unusable. */
export function sanitizeItem(item) {
  if (!isPlainObject(item) || typeof item.id !== 'string' || !item.id) return null;
  if (!CATEGORY_MAP[item.categoryId] || !isPlainObject(item.values)) return null;
  const values = {};
  for (const [k, v] of Object.entries(item.values)) {
    if (v === null || v === undefined) continue;
    values[k] = String(v);
  }
  return {
    id: item.id,
    categoryId: item.categoryId,
    values,
    reminderDate: isValidISODate(item.reminderDate) ? item.reminderDate : null,
    snoozedUntil: isValidISODate(item.snoozedUntil) ? item.snoozedUntil : null,
    lastNotifiedOn: isValidISODate(item.lastNotifiedOn) ? item.lastNotifiedOn : null,
    renewalHistory: Array.isArray(item.renewalHistory)
      ? item.renewalHistory.filter((h) => isPlainObject(h) && typeof h.oldExpiry === 'string')
      : [],
    ...(item.isSample === true ? { isSample: true } : {}),
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  };
}

function normalizeState(raw) {
  const migrated = migrate(raw);
  const items = Array.isArray(migrated.items) ? migrated.items.map(sanitizeItem).filter(Boolean) : [];
  const settings = { ...DEFAULT_SETTINGS, ...(isPlainObject(migrated.settings) ? migrated.settings : {}) };
  if (!['light', 'dark', 'system'].includes(settings.theme)) settings.theme = 'system';
  settings.desktopAlerts = !!settings.desktopAlerts;
  if (!isValidISODate(settings.popupDismissedOn)) settings.popupDismissedOn = null;
  return { version: STORAGE_VERSION, items, settings };
}

/** Returns { state, error }. Never throws. On corrupted data, falls back to empty. */
export function loadState() {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return { state: emptyState(), error: null };
    const raw = JSON.parse(text);
    if (!isPlainObject(raw)) throw new Error('Stored data is not an object');
    return { state: normalizeState(raw), error: null };
  } catch (err) {
    console.warn('[RenewalVault] Could not read saved data, starting empty.', err);
    // Keep the corrupted copy so it isn't lost forever.
    try {
      const text = window.localStorage.getItem(STORAGE_KEY);
      if (text) window.localStorage.setItem(`${STORAGE_KEY}:corrupt-${Date.now()}`, text);
    } catch {
      /* ignore */
    }
    return { state: emptyState(), error: 'Saved data was unreadable, so the vault started empty. A copy of the old data was kept.' };
  }
}

/** Returns true on success. */
export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[RenewalVault] Could not save data.', err);
    return false;
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function exportBackup(state) {
  return JSON.stringify(
    { app: 'RenewalVault', exportedAt: new Date().toISOString(), version: STORAGE_VERSION, items: state.items, settings: state.settings },
    null,
    2,
  );
}

/**
 * Validate a backup file's text. Returns { ok: true, state, skipped } or { ok: false, error }.
 */
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  return parseBackupObject(raw);
}

/** Validate an already-parsed backup ({ items, settings? }). Same result shape as parseBackup. */
export function parseBackupObject(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.items)) {
    return { ok: false, error: 'That file is not a RenewalVault backup (no "items" list found).' };
  }
  if (typeof raw.version === 'number' && raw.version > STORAGE_VERSION) {
    return { ok: false, error: `This backup was made by a newer version (v${raw.version}).` };
  }
  const state = normalizeState(raw);
  const ids = new Set();
  state.items = state.items.filter((i) => (ids.has(i.id) ? false : ids.add(i.id)));
  return { ok: true, state, skipped: raw.items.length - state.items.length };
}

/* ------------------------------------------------------------------ */
/* Per-browser data that is NOT shared through the cloud vault.        */
/* ------------------------------------------------------------------ */

const NOTIFIED_KEY = 'renewalvault:notified';
const PRE_CLOUD_KEY = 'renewalvault:v1:pre-cloud';

/**
 * Which items this browser already showed a desktop alert for, and on what
 * day ({ [itemId]: 'YYYY-MM-DD' }). Kept per browser so every person viewing
 * the shared vault gets their own alerts.
 */
export function loadNotified(fallbackItems = []) {
  try {
    const raw = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) || 'null');
    if (isPlainObject(raw)) {
      return Object.fromEntries(Object.entries(raw).filter(([, d]) => isValidISODate(d)));
    }
  } catch {
    /* ignore */
  }
  // First run: pick up what older versions stored on the items themselves.
  return Object.fromEntries(fallbackItems.filter((i) => isValidISODate(i.lastNotifiedOn)).map((i) => [i.id, i.lastNotifiedOn]));
}

export function saveNotified(map) {
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Items saved in this browser before the shared vault existed. They are
 * parked under their own key until they've been uploaded, so nothing is lost
 * if the first upload fails. Returns the items still waiting to be uploaded.
 */
export function stashLocalItemsForCloud(items) {
  try {
    const prev = JSON.parse(window.localStorage.getItem(PRE_CLOUD_KEY) || 'null');
    const waiting = isPlainObject(prev) && !prev.migrated && Array.isArray(prev.items) ? prev.items : [];
    const byId = new Map(waiting.map((i) => [i.id, i]));
    for (const i of items) byId.set(i.id, i);
    const all = [...byId.values()].map(sanitizeItem).filter(Boolean);
    if (all.length || items.length) {
      window.localStorage.setItem(PRE_CLOUD_KEY, JSON.stringify({ migrated: all.length === 0, items: all }));
    }
    return all;
  } catch {
    return items;
  }
}

export function markLocalItemsUploaded() {
  try {
    const prev = JSON.parse(window.localStorage.getItem(PRE_CLOUD_KEY) || 'null');
    if (isPlainObject(prev)) window.localStorage.setItem(PRE_CLOUD_KEY, JSON.stringify({ ...prev, migrated: true }));
  } catch {
    /* ignore */
  }
}
