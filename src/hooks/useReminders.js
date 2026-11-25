import { useEffect, useMemo, useRef, useState } from 'react';
import { enrichItem, isDue, sortByDaysLeft, STATUS, daysLeftText } from '../utils/reminders';
import { todayStr, formatDisplay } from '../utils/dates';

const HOUR = 60 * 60 * 1000;

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Derives statuses from items. Recalculates:
 *  - on load
 *  - every 60 minutes while open
 *  - when the tab becomes visible again
 *  - whenever items change (add / edit / renew), since `enriched` depends on items
 */
export function useReminders({ items, settings, markNotified, toast, onOpenItem }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, HOUR);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const today = todayStr(now);
  const enriched = useMemo(() => items.map((i) => enrichItem(i, now)), [items, now]);
  const due = useMemo(() => enriched.filter((i) => isDue(i.status)).sort(sortByDaysLeft), [enriched]);
  const popupItems = useMemo(() => due.filter((i) => !i.snoozed), [due]);

  const counts = useMemo(() => {
    const c = { total: enriched.length, active: 0, soon: 0, expired: 0 };
    for (const i of enriched) if (c[i.status] !== undefined) c[i.status] += 1;
    return c;
  }, [enriched]);

  // Toast when an item crosses into its reminder window (or expires) during the
  // session because time passed, not because the user just edited it.
  const prev = useRef(null);
  useEffect(() => {
    const map = new Map(enriched.map((i) => [i.id, { status: i.status, updatedAt: i.updatedAt }]));
    if (prev.current) {
      for (const i of enriched) {
        const p = prev.current.get(i.id);
        if (!p || p.updatedAt !== i.updatedAt || p.status === i.status) continue;
        if (p.status === STATUS.ACTIVE && i.status === STATUS.SOON) {
          toast.warning(`${i.category.label} – ${i.title} is now in its reminder window (${daysLeftText(i.daysLeft)}).`, {
            title: 'Renewal coming up',
            action: { label: 'View', onClick: () => onOpenItem(i) },
          });
        } else if (i.status === STATUS.EXPIRED && p.status !== STATUS.EXPIRED) {
          toast.error(`${i.category.label} – ${i.title} has expired.`, { title: 'Expired', action: { label: 'View', onClick: () => onOpenItem(i) } });
        }
      }
    }
    prev.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched]);

  // Desktop notifications: one per due (non-snoozed) item per day.
  useEffect(() => {
    if (!settings.desktopAlerts || !notificationsSupported() || Notification.permission !== 'granted') return;
    const pending = popupItems.filter((i) => i.lastNotifiedOn !== today);
    if (!pending.length) return;
    for (const i of pending) {
      try {
        const n = new Notification(
          i.status === STATUS.EXPIRED ? `${i.category.label} expired – ${i.title}` : `Renew soon: ${i.category.label} – ${i.title}`,
          {
            body: `Expiry: ${formatDisplay(i.expiry)} · ${daysLeftText(i.daysLeft)}`,
            tag: `renewalvault-${i.id}-${today}`,
            icon: '/favicon.svg',
          },
        );
        n.onclick = () => {
          window.focus();
          onOpenItem(i);
          n.close();
        };
      } catch (err) {
        console.warn('[RenewalVault] Notification failed', err);
      }
    }
    markNotified(pending.map((i) => i.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupItems, settings.desktopAlerts, today]);

  return { now, today, enriched, due, popupItems, counts, refresh: () => setNow(new Date()) };
}
