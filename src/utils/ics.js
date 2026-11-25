/**
 * Minimal RFC 5545 (iCalendar) generator, no library.
 * Each item produces two all-day events (reminder date + expiry date), each
 * with a VALARM using an ABSOLUTE trigger at 09:00 local time (converted to
 * UTC, as RFC 5545 requires for DATE-TIME triggers). No "-P1M" durations.
 */
import { addDays } from 'date-fns';
import { parseDate, formatDisplay } from './dates';
import { downloadFile, safeFilename } from './download';

const CRLF = '\r\n';

function escapeText(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold lines longer than 75 octets (UTF-8 aware). */
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + len > limit) {
      out.push(current);
      current = ch;
      bytes = len;
    } else {
      current += ch;
      bytes += len;
    }
  }
  out.push(current);
  return out.join(CRLF + ' ');
}

const pad = (n) => String(n).padStart(2, '0');

function icsDate(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function icsUtcDateTime(date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function buildEvent({ uid, date, summary, description }) {
  const nineAm = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsUtcDateTime(new Date())}`,
    `DTSTART;VALUE=DATE:${icsDate(date)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(date, 1))}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    `TRIGGER;VALUE=DATE-TIME:${icsUtcDateTime(nineAm)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

/** @param item an enriched item (see enrichItem) */
export function buildICS(item) {
  const label = item.category?.label || 'Document';
  const name = item.title;
  const expiry = parseDate(item.expiry);
  const reminder = parseDate(item.reminderDate);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RenewalVault//Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

  const details = (item.category?.fields || [])
    .filter((f) => !f.sensitive && item.values?.[f.key] && f.type !== 'date')
    .map((f) => `${f.label}: ${item.values[f.key]}`)
    .join('\n');

  if (reminder && expiry && reminder.getTime() !== expiry.getTime()) {
    lines.push(
      ...buildEvent({
        uid: `${item.id}-reminder@renewalvault`,
        date: reminder,
        summary: `Renew soon: ${label} – ${name}, expires ${formatDisplay(item.expiry)}`,
        description: `${label} expires on ${formatDisplay(item.expiry)}.\n${details}`,
      }),
    );
  }
  if (expiry) {
    lines.push(
      ...buildEvent({
        uid: `${item.id}-expiry@renewalvault`,
        date: expiry,
        summary: `${label} expires today – ${name}`,
        description: `${label} expires today.\n${details}`,
      }),
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join(CRLF) + CRLF;
}

export function downloadICS(item) {
  const filename = `${safeFilename(item.category?.label)}-${safeFilename(item.title)}.ics`;
  downloadFile(filename, buildICS(item), 'text/calendar;charset=utf-8');
}
