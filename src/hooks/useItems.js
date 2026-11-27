import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCategory } from '../config/categories';
import {
  loadState,
  saveState,
  sanitizeItem,
  loadNotified,
  saveNotified,
  stashLocalItemsForCloud,
  markLocalItemsUploaded,
} from '../utils/storage';
import { supabase, TABLE } from '../lib/supabase';
import { computeReminderDate, getExpiry } from '../utils/reminders';
import { addDaysStr, todayStr } from '../utils/dates';
import { normalizeUpper } from '../utils/mask';
import { uuid } from '../utils/download';
import { buildSampleItems, isSampleItem } from '../utils/sampleData';

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

function toRow(item) {
  // lastNotifiedOn is per browser (see loadNotified), so it never goes to the cloud.
  // eslint-disable-next-line no-unused-vars
  const { id, lastNotifiedOn, ...data } = item;
  return { id, data, updated_at: new Date().toISOString() };
}

function fromRow(row) {
  return row && row.data ? sanitizeItem({ ...row.data, id: row.id }) : null;
}

/**
 * Owns the vault state (items + settings).
 *
 * Items live in the shared Supabase table `items` when the cloud is
 * configured: every local change is pushed there, and changes made by anyone
 * else arrive over Supabase Realtime and show up without a refresh. Settings
 * (theme, alerts, popup dismissal) and "already alerted today" stay in this
 * browser, since they are personal.
 *
 * Without the cloud env vars it behaves as before (browser-only storage).
 */
export function useItems(toast) {
  const cloud = !!supabase;
  const initial = useRef(null);
  if (initial.current === null) {
    const loaded = loadState();
    initial.current = {
      ...loaded,
      notified: loadNotified(loaded.state.items),
      // Items this browser had before the shared vault: upload them once.
      pendingUpload: cloud ? stashLocalItemsForCloud(loaded.state.items) : [],
    };
  }

  const [state, setState] = useState(() =>
    cloud ? { ...initial.current.state, items: [] } : initial.current.state,
  );
  const [notified, setNotified] = useState(initial.current.notified);
  const [loaded, setLoaded] = useState(!cloud);
  const [loadError, setLoadError] = useState(null);

  const toastRef = useRef(toast);
  toastRef.current = toast;
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  /** id -> the exact item object we last saw in / sent to the cloud. */
  const synced = useRef(new Map());
  /** Cloud writes run one at a time, in order. */
  const queue = useRef(Promise.resolve());
  const refetch = useRef(() => {});

  const errorShown = useRef(false);
  useEffect(() => {
    if (initial.current.error && !errorShown.current) {
      errorShown.current = true;
      toast.error(initial.current.error, { title: 'Could not read saved data' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser storage: settings always; items only in browser-only mode.
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const ok = saveState(cloud ? { ...state, items: [] } : state);
    if (!ok) toast.error('Your browser refused to save. Storage may be full or disabled.', { title: 'Not saved' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (loaded) saveNotified(notified);
  }, [notified, loaded]);

  // Cloud: initial load, live updates, and one-time upload of old browser data.
  useEffect(() => {
    if (!cloud) return undefined;
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase.from(TABLE).select('id, data');
      if (cancelled) return;
      if (error) {
        console.warn('[RenewalVault] Could not load the shared vault.', error);
        setLoadError('Could not connect to the shared vault. Check your internet connection and try again.');
        return;
      }
      const map = new Map();
      const list = [];
      for (const row of data) {
        const item = fromRow(row);
        if (item) {
          map.set(item.id, item);
          list.push(item);
        }
      }
      synced.current = map;
      setState((s) => ({ ...s, items: list }));
      setLoadError(null);
      setLoaded(true);
    };
    refetch.current = fetchAll;

    const uploadOldBrowserItems = async () => {
      const items = initial.current.pendingUpload;
      if (!items.length) return;
      // ignoreDuplicates: never overwrite something already in the shared vault.
      const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id', ignoreDuplicates: true });
      if (cancelled) return;
      if (error) {
        console.warn('[RenewalVault] Could not upload browser items.', error);
        return; // kept in browser storage; retried on next visit
      }
      initial.current.pendingUpload = [];
      markLocalItemsUploaded();
      toastRef.current.success(
        `Moved ${items.length} item${items.length === 1 ? '' : 's'} saved in this browser into the shared vault.`,
      );
    };

    (async () => {
      await uploadOldBrowserItems();
      if (!cancelled) await fetchAll();
    })();

    let firstSubscribe = true;
    const channel = supabase
      .channel('renewalvault-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old && payload.old.id;
          if (!id) return;
          synced.current.delete(id);
          setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
          return;
        }
        const item = fromRow(payload.new);
        if (!item) return;
        synced.current.set(item.id, item);
        setState((s) => {
          const idx = s.items.findIndex((i) => i.id === item.id);
          if (idx === -1) return { ...s, items: [...s.items, item] };
          const next = s.items.slice();
          next[idx] = item;
          return { ...s, items: next };
        });
      })
      .subscribe((status) => {
        // On a reconnect, reload everything so nothing missed while offline is lost.
        if (status === 'SUBSCRIBED') {
          if (!firstSubscribe) fetchAll();
          firstSubscribe = false;
        }
      });

    // A laptop waking from sleep may have missed updates.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchAll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cloud: push whatever changed locally since the last sync.
  useEffect(() => {
    if (!cloud || !loaded) return;
    const known = synced.current;
    const ids = new Set();
    const upserts = [];
    for (const i of state.items) {
      ids.add(i.id);
      if (known.get(i.id) !== i) upserts.push(i);
    }
    const deletes = [...known.keys()].filter((id) => !ids.has(id));
    if (!upserts.length && !deletes.length) return;
    for (const i of upserts) known.set(i.id, i);
    for (const id of deletes) known.delete(id);

    queue.current = queue.current
      .then(async () => {
        if (upserts.length) {
          const { error } = await supabase.from(TABLE).upsert(upserts.map(toRow));
          if (error) throw error;
        }
        if (deletes.length) {
          const { error } = await supabase.from(TABLE).delete().in('id', deletes);
          if (error) throw error;
        }
      })
      .catch((err) => {
        console.warn('[RenewalVault] Could not save to the shared vault.', err);
        toastRef.current.error('That change was not saved to the shared vault. Check your internet connection.', {
          title: 'Not saved',
        });
        refetch.current(); // show what is really stored
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, loaded]);

  /** Forget "already alerted" for items whose expiry changed. */
  const clearNotified = useCallback((ids) => {
    setNotified((n) => {
      if (!ids.some((id) => id in n)) return n;
      const next = { ...n };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

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
    [setItems, clearNotified],
  );

  const updateItem = useCallback(
    (id, values) => {
      const current = itemsRef.current.find((i) => i.id === id);
      if (current && getExpiry({ ...current, values: cleanValues(current.categoryId, values) }) !== getExpiry(current)) {
        clearNotified([id]);
      }
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
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setItems, clearNotified],
  );

  /** Save old expiry to history, set the new one, clear snooze. */
  const renewItem = useCallback(
    (id, newExpiry, extraValues = {}, newReminderDate) => {
      clearNotified([id]);
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
            renewalHistory: [...(i.renewalHistory || []), history],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setItems, clearNotified],
  );

  const deleteItem = useCallback((id) => setItems((items) => items.filter((i) => i.id !== id)), [setItems]);

  const restoreItem = useCallback((item) => setItems((items) => (items.some((i) => i.id === item.id) ? items : [...items, item])), [setItems]);

  /** Hide from popup & desktop alerts for `days` days. Does not touch updatedAt. */
  const snoozeItem = useCallback(
    (id, days) => setItems((items) => items.map((i) => (i.id === id ? { ...i, snoozedUntil: addDaysStr(days) } : i))),
    [setItems, clearNotified],
  );

  /** Alerts are tracked per browser, so this never touches the shared items. */
  const markNotified = useCallback((ids) => {
    const t = todayStr();
    setNotified((n) => ({ ...n, ...Object.fromEntries(ids.map((id) => [id, t])) }));
  }, []);

  const setSettings = useCallback((patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), []);

  const replaceState = useCallback((next) => setState(next), []);

  const loadSample = useCallback(() => {
    const samples = buildSampleItems();
    setState((s) => ({ ...s, items: [...s.items, ...samples], settings: { ...s.settings, popupDismissedOn: null } }));
    return samples.length;
  }, []);

  /** Delete only sample items; the user's own items are kept. Returns how many were removed. */
  const removeSampleItems = useCallback(() => {
    const n = state.items.filter(isSampleItem).length;
    setItems((items) => items.filter((i) => !isSampleItem(i)));
    return n;
  }, [state.items, setItems]);

  // Overlay this browser's own "alerted today" record onto the shared items.
  const items = useMemo(
    () =>
      state.items.map((i) => {
        const n = notified[i.id] || null;
        return i.lastNotifiedOn === n ? i : { ...i, lastNotifiedOn: n };
      }),
    [state.items, notified],
  );
  const exposedState = useMemo(() => ({ ...state, items }), [state, items]);

  return {
    cloud,
    loaded,
    loadError,
    retryLoad: () => refetch.current(),
    removeSampleItems,
    items,
    settings: state.settings,
    state: exposedState,
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
