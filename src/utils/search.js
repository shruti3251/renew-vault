import { formatDisplay } from './dates';
import { STATUS_META } from './reminders';
import { normalizeKey } from './mask';

/** Matches every field value plus category label, status and formatted dates. */
export function matchesQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qKey = normalizeKey(q);
  const hay = [
    item.category?.label,
    item.category?.group,
    STATUS_META[item.status]?.label,
    formatDisplay(item.expiry),
    formatDisplay(item.reminderDate),
    ...Object.values(item.values || {}),
  ].filter(Boolean);
  return hay.some((v) => {
    const s = String(v);
    return s.toLowerCase().includes(q) || (qKey && normalizeKey(s).includes(qKey));
  });
}
