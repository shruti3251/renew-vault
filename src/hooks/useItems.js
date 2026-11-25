import { useCallback, useEffect, useRef, useState } from 'react';
import { getCategory } from '../config/categories';
import { loadState, saveState } from '../utils/storage';
import { computeReminderDate, getExpiry } from '../utils/reminders';
import { addDaysStr, todayStr } from '../utils/dates';
import { normalizeUpper } from '../utils/mask';
import { uuid } from '../utils/download';
import { buildSampleItems } from '../utils/sampleData';

/** Trim strings, apply uppercase rules, drop empty optional values. */
export function cleanValues(categoryId, values) {
  const category = getCategory(categoryId);
  const out = {};
  for (const f of category.fields) {
    let v = values[f.key];
    if (v === undefined || v === null) continue;
    v = String(v);
    v = f.uppercase ? normalizeUpper(v) : f.type === 'textarea' ? v.trim() : v.replace(/\s+/g, ' ').trim();
    if (v !== '') out[f.key] = v;
  }
  return out;
}

/**
 * Owns the persisted state (items + settings). All writes go through
 * storage.js. Every mutation recomputes and stores reminderDate.
 */
export function useItems(toast) {
  const initial = useRef(null);
  if (initial.current === null) initial.current = loadState();

  const [state, setState] = useState(initial.current.state);

  const errorShown = useRef(false);
  useEffect(() => {
    if (initial.current.error && !errorShown.current) {
      errorShown.current = true;
      toast.error(initial.current.error, { title: 'Could not read saved data' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    if (!saveState(state)) toast.error('Your browser refused to save. Storage may be full or disabled.', { title: 'Not saved' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const setItems = useCallback((fn) => setState((s) => ({ ...s, items: fn(s.items) })), []);

  const addItem = useCallback(
    (categoryId, values) => {
      const clean = cleanValues(categoryId, values);
      const now = new Date().toISOString();
      const item = {
        id: uuid(),
        categoryId,
        values: clean,
        reminderDate: computeReminderDate(categoryId, clean),
        snoozedUntil: null,
        lastNotifiedOn: null,
        renewalHistory: [],
        createdAt: now,
        updatedAt: now,
      };
      setItems((items) => [...items, item]);
      return item;
    },
    [setItems],
  );

  const updateItem = useCallback(
    (id, values) => {
      setItems((items) =>
        items.map((i) => {
          if (i.id !== id) return i;
          const clean = cleanValues(i.categoryId, values);
          const expiryChanged = getExpiry({ ...i, values: clean }) !== getExpiry(i);
          return {
            ...i,
            values: clean,
            reminderDate: computeReminderDate(i.categoryId, clean),
            // A new expiry date means old snoozes/notifications no longer apply.
            snoozedUntil: expiryChanged ? null : i.snoozedUntil,
            lastNotifiedOn: expiryChanged ? null : i.lastNotifiedOn,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setItems],
  );

  /** Save old expiry to history, set the new one, clear snooze. */
  const renewItem = useCallback(
    (id, newExpiry, extraValues = {}, newReminderDate) => {
      setItems((items) =>
        items.map((i) => {
          if (i.id !== id) return i;
          const category = getCategory(i.categoryId);
          const expiryKey = category.fields.find((f) => f.isExpiry).key;
          const changed = {};
          for (const [k, v] of Object.entries(extraValues)) {
            if (v && String(v).trim() && v !== i.values[k]) changed[k] = v;
          }
          const values = { ...i.values, ...changed, [expiryKey]: newExpiry };
          if (category.reminder.type === 'custom' && newReminderDate) values[category.reminder.field] = newReminderDate;
          const clean = cleanValues(i.categoryId, values);
          const history = {
            oldExpiry: getExpiry(i),
            renewedOn: todayStr(),
          };
          const oldChanged = Object.fromEntries(Object.keys(changed).map((k) => [k, i.values[k] ?? '']));
          if (Object.keys(oldChanged).length) history.oldValues = oldChanged;
          return {
            ...i,
            values: clean,
            reminderDate: computeReminderDate(i.categoryId, clean),
            snoozedUntil: null,
            lastNotifiedOn: null,
            renewalHistory: [...(i.renewalHistory || []), history],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setItems],
  );

  const deleteItem = useCallback((id) => setItems((items) => items.filter((i) => i.id !== id)), [setItems]);

  const restoreItem = useCallback((item) => setItems((items) => (items.some((i) => i.id === item.id) ? items : [...items, item])), [setItems]);

  /** Hide from popup & desktop alerts for `days` days. Does not touch updatedAt. */
  const snoozeItem = useCallback(
    (id, days) => setItems((items) => items.map((i) => (i.id === id ? { ...i, snoozedUntil: addDaysStr(days) } : i))),
    [setItems],
  );

  const markNotified = useCallback(
    (ids) => {
      const set = new Set(ids);
      const t = todayStr();
      setItems((items) => items.map((i) => (set.has(i.id) ? { ...i, lastNotifiedOn: t } : i)));
    },
    [setItems],
  );

  const setSettings = useCallback((patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), []);

  const replaceState = useCallback((next) => setState(next), []);

  const loadSample = useCallback(() => {
    const samples = buildSampleItems();
    setState((s) => ({ ...s, items: [...s.items, ...samples], settings: { ...s.settings, popupDismissedOn: null } }));
    return samples.length;
  }, []);

  return {
    items: state.items,
    settings: state.settings,
    state,
    addItem,
    updateItem,
    renewItem,
    deleteItem,
    restoreItem,
    snoozeItem,
    markNotified,
    setSettings,
    replaceState,
    loadSample,
  };
}
