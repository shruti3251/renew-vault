import { format, isValid, parse, startOfDay, addDays, differenceInCalendarDays } from 'date-fns';

export const ISO = 'yyyy-MM-dd';
export const DISPLAY = 'dd MMM yyyy';

/** Parse a stored 'YYYY-MM-DD' string as a LOCAL date at midnight. Returns null if invalid. */
export function parseDate(str) {
  if (!str || typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = parse(str, ISO, new Date());
  return isValid(d) ? startOfDay(d) : null;
}

export function toISODate(date) {
  return format(date, ISO);
}

export function isValidISODate(str) {
  return parseDate(str) !== null;
}

/** Today as a local date at midnight. */
export function today(now = new Date()) {
  return startOfDay(now);
}

export function todayStr(now = new Date()) {
  return toISODate(today(now));
}

export function addDaysStr(n, now = new Date()) {
  return toISODate(addDays(today(now), n));
}

/** '2026-11-25' -> '25 Nov 2026'. Returns '—' for empty / invalid. */
export function formatDisplay(str) {
  const d = parseDate(str);
  return d ? format(d, DISPLAY) : '—';
}

export function formatMonthYear(str) {
  const d = parseDate(str);
  return d ? format(d, 'MMMM yyyy') : '';
}

export function daysBetween(fromStr, toStr) {
  const a = parseDate(fromStr);
  const b = parseDate(toStr);
  if (!a || !b) return null;
  return differenceInCalendarDays(b, a);
}
