/**
 * Excel (.xlsx) backup.
 *
 * Sheet "Documents" is for people: one readable row per item.
 * Sheet "Backup data" is for restoring: one row per item holding the full
 * item as JSON, so an import gets back exactly what was exported (renewal
 * history, snoozes, etc.). Don't edit that sheet by hand.
 *
 * The Excel libraries are loaded only when needed, to keep the app fast.
 */
import { CATEGORIES } from '../config/categories';
import { STATUS_META } from './reminders';
import { formatDisplay } from './dates';
import { STORAGE_VERSION, parseBackupObject } from './storage';

const DATA_SHEET = 'Backup data';
const DATA_HEADER = ['id', 'item (JSON)'];

/** Stop Excel from treating text that starts with = + - @ as a formula. */
function text(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function fieldColumns() {
  const cols = [];
  const seen = new Set();
  for (const c of CATEGORIES) {
    for (const f of c.fields) {
      if (f.isExpiry || f.isReminder || seen.has(f.key)) continue;
      seen.add(f.key);
      cols.push(f);
    }
  }
  return cols;
}

const bold = (value) => ({ value, fontWeight: 'bold' });

/**
 * @param items enriched items (with category, status, expiry, daysLeft), for the readable sheet
 * @param storedItems the items exactly as stored, for the restorable sheet
 * @param fileName e.g. renewalvault-backup-2026-11-27.xlsx
 */
export async function downloadExcelBackup(items, storedItems, fileName) {
  await (await buildExcelBackup(items, storedItems)).toFile(fileName);
}

/** Builds the workbook; call .toFile(name) or .toBlob() on the result. */
export async function buildExcelBackup(items, storedItems) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const fields = fieldColumns();

  const header = ['Category', 'Group', 'Status', 'Expiry Date', 'Reminder Date', 'Days Left', ...fields.map((f) => f.label), 'Renewals', 'Created'];
  const readable = [
    header.map(bold),
    ...items.map((i) => [
      { value: text(i.category?.label) },
      { value: text(i.category?.group) },
      { value: text(STATUS_META[i.status]?.label) },
      { value: formatDisplay(i.expiry) || '' },
      { value: formatDisplay(i.reminderDate) || '' },
      typeof i.daysLeft === 'number' ? { value: i.daysLeft, type: Number } : { value: '' },
      ...fields.map((f) => ({ value: text(i.values?.[f.key]) })),
      { value: i.renewalHistory?.length || 0, type: Number },
      { value: (i.createdAt || '').slice(0, 10) },
    ]),
  ];

  const raw = [
    DATA_HEADER.map(bold),
    ...storedItems.map((i) => {
      // eslint-disable-next-line no-unused-vars
      const { lastNotifiedOn, ...stored } = i; // per-browser, not part of the vault
      return [{ value: i.id }, { value: JSON.stringify({ v: STORAGE_VERSION, ...stored }) }];
    }),
  ];

  return writeXlsxFile([
    { sheet: 'Documents', data: readable, stickyRowsCount: 1, columns: header.map((h, n) => ({ width: n < 6 ? 16 : 22 })) },
    { sheet: DATA_SHEET, data: raw, stickyRowsCount: 1, columns: [{ width: 38 }, { width: 120 }] },
  ]);
}

/**
 * Read an .xlsx backup made by downloadExcelBackup.
 * Returns the same shape as parseBackup: { ok: true, state, skipped } or { ok: false, error }.
 */
export async function parseExcelBackup(file) {
  const { readSheet } = await import('read-excel-file/browser');
  let rows;
  try {
    rows = await readSheet(file, DATA_SHEET);
  } catch {
    return {
      ok: false,
      error: `That file is not a RenewalVault Excel backup (no "${DATA_SHEET}" sheet found). Use a file made with "Export backup (Excel)".`,
    };
  }
  const items = [];
  let bad = 0;
  for (const row of rows.slice(1)) {
    const cell = row && row[1];
    if (cell === null || cell === undefined || cell === '') continue;
    try {
      // eslint-disable-next-line no-unused-vars
      const { v, ...item } = JSON.parse(String(cell));
      items.push(item);
    } catch {
      bad += 1;
    }
  }
  const res = parseBackupObject({ items });
  if (res.ok) res.skipped += bad;
  return res;
}
