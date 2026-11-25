/** Mask all but the last 4 characters: 'ABC1234567' -> '••••••4567'. */
export function mask(value, visible = 4) {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visible) return '•'.repeat(str.length);
  return '•'.repeat(Math.min(6, str.length - visible)) + str.slice(-visible);
}

/** Uppercase, trim and collapse whitespace: ' gj01  ab1234 ' -> 'GJ01 AB1234'. */
export function normalizeUpper(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Compare identifiers ignoring case and spaces. */
export function normalizeKey(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}
