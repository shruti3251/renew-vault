import { subMonths, subDays, differenceInCalendarDays } from 'date-fns';
import { getCategory, getExpiryField } from '../config/categories';
import { parseDate, toISODate, today as getToday, todayStr } from './dates';

export const STATUS = {
  ACTIVE: 'active',
  SOON: 'soon',
  EXPIRED: 'expired',
  UNKNOWN: 'unknown',
};

// Status colours are fixed and always shown together with a label/icon.
export const STATUS_META = {
  active: {
    label: 'Active',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  soon: {
    label: 'Expiring soon',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  expired: {
    label: 'Expired',
    chip: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
  },
  unknown: {
    label: 'No date',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    bar: 'bg-slate-400',
    dot: 'bg-slate-400',
  },
};

export function getExpiry(item) {
  const category = getCategory(item.categoryId);
  if (!category) return item.values?.expiryDate || null;
  return item.values?.[getExpiryField(category).key] || null;
}

/**
 * reminderDate = expiryDate − offset. subMonths clamps month-ends
 * (31 Mar − 1 month = 28/29 Feb). Custom categories use the user-picked date.
 * Returns 'YYYY-MM-DD' or null.
 */
export function computeReminderDate(categoryOrId, values) {
  const category = typeof categoryOrId === 'string' ? getCategory(categoryOrId) : categoryOrId;
  if (!category) return null;
  const rule = category.reminder;
  if (rule.type === 'custom') {
    const picked = parseDate(values?.[rule.field]);
    return picked ? toISODate(picked) : null;
  }
  const expiry = parseDate(values?.[getExpiryField(category).key]);
  if (!expiry) return null;
  const d = rule.type === 'months' ? subMonths(expiry, rule.value) : subDays(expiry, rule.value);
  return toISODate(d);
}

/** Status by calendar date only (time of day ignored). */
export function computeStatus(expiryStr, reminderStr, now = new Date()) {
  const t = getToday(now);
  const expiry = parseDate(expiryStr);
  if (!expiry) return STATUS.UNKNOWN;
  if (t > expiry) return STATUS.EXPIRED;
  const reminder = parseDate(reminderStr) || expiry;
  if (t >= reminder) return STATUS.SOON;
  return STATUS.ACTIVE;
}

export function daysLeft(expiryStr, now = new Date()) {
  const expiry = parseDate(expiryStr);
  if (!expiry) return null;
  return differenceInCalendarDays(expiry, getToday(now));
}

export function daysLeftText(days) {
  if (days === null || days === undefined) return 'No expiry date';
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  if (days > 0) return `${days} days left`;
  if (days === -1) return 'Expired 1 day ago';
  return `Expired ${Math.abs(days)} days ago`;
}

/** Snoozed items are hidden from the popup and desktop alerts (not from the bell). */
export function isSnoozed(item, now = new Date()) {
  return !!item.snoozedUntil && item.snoozedUntil > todayStr(now);
}

export function isDue(status) {
  return status === STATUS.SOON || status === STATUS.EXPIRED;
}

/**
 * Days-left progress bar: how much of the time between "added" (or the reminder
 * date, whichever is earlier) and expiry has passed. 100% = expired.
 */
export function progressPercent(item, now = new Date()) {
  const expiry = parseDate(item.expiry);
  if (!expiry) return 0;
  const t = getToday(now);
  if (t > expiry) return 100;
  const created = parseDate((item.createdAt || '').slice(0, 10)) || t;
  const reminder = parseDate(item.reminderDate) || expiry;
  const start = created < reminder ? created : reminder;
  const total = differenceInCalendarDays(expiry, start);
  if (total <= 0) return 100;
  const elapsed = differenceInCalendarDays(t, start);
  return Math.max(4, Math.min(100, Math.round((elapsed / total) * 100)));
}

/** Add computed fields used by the UI. Never mutates the stored item. */
export function enrichItem(item, now = new Date()) {
  const category = getCategory(item.categoryId);
  const expiry = getExpiry(item);
  const reminderDate = computeReminderDate(category, item.values) || item.reminderDate || null;
  const status = computeStatus(expiry, reminderDate, now);
  return {
    ...item,
    category,
    expiry,
    reminderDate,
    status,
    daysLeft: daysLeft(expiry, now),
    title: category ? item.values?.[category.titleField] || category.label : 'Unknown item',
    subtitle: category ? item.values?.[category.subtitleField] || '' : '',
    snoozed: isSnoozed(item, now),
  };
}

export function sortByDaysLeft(a, b) {
  return (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
}
