import { CATEGORIES } from '../config/categories';
import { STATUS_META } from './reminders';
import { formatDisplay } from './dates';
import { downloadFile } from './download';

function cell(value) {
  const s = String(value ?? '');
  // Guard against spreadsheet formula injection, then quote.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** @param items enriched items */
export function buildCSV(items) {
  // One column per distinct field label across all categories, in config order.
  const fieldCols = [];
  const seen = new Set();
  for (const c of CATEGORIES) {
    for (const f of c.fields) {
      if (f.isExpiry || f.isReminder) continue;
      if (!seen.has(f.key)) {
        seen.add(f.key);
        fieldCols.push(f);
      }
    }
  }
  const header = ['Category', 'Group', 'Status', 'Expiry Date', 'Reminder Date', 'Days Left', ...fieldCols.map((f) => f.label), 'Renewals', 'Created'];
  const rows = items.map((i) => [
    i.category?.label,
    i.category?.group,
    STATUS_META[i.status]?.label,
    formatDisplay(i.expiry),
    formatDisplay(i.reminderDate),
    i.daysLeft ?? '',
    ...fieldCols.map((f) => i.values?.[f.key] ?? ''),
    i.renewalHistory?.length || 0,
    (i.createdAt || '').slice(0, 10),
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function downloadCSV(items) {
  downloadFile(`renewalvault-${new Date().toISOString().slice(0, 10)}.csv`, buildCSV(items), 'text/csv;charset=utf-8');
}
