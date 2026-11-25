import { addDays, addMonths } from 'date-fns';
import { toISODate, today } from './dates';
import { computeReminderDate } from './reminders';
import { uuid } from './download';

/** Builds 1–2 items per category, with dates relative to today so every status shows. */
export function buildSampleItems(now = new Date()) {
  const t = today(now);
  const d = (n) => toISODate(addDays(t, n));
  const m = (n) => toISODate(addMonths(t, n));

  const raw = [
    ['driving-license', { name: 'Aarav Shah', dlNumber: 'GJ0120190012345', expiryDate: d(-1) }],
    ['driving-license', { name: 'Priya Shah', dlNumber: 'GJ0520210067890', expiryDate: m(26) }],
    ['puc', { vehicleNumber: 'GJ01AB1234', makeModel: 'Honda City', expiryDate: d(4) }],
    ['puc', { vehicleNumber: 'GJ05CD5678', makeModel: 'Maruti Swift', expiryDate: m(4) }],
    ['insurance', { vehicleNumber: 'GJ01AB1234', makeModel: 'Honda City', companyName: 'ICICI Lombard', policyNumber: '3001/123456789/00', expiryDate: d(18) }],
    ['insurance', { vehicleNumber: 'GJ05CD5678', makeModel: 'Maruti Swift', companyName: 'HDFC ERGO', policyNumber: '2311200098765', expiryDate: m(7) }],
    ['vehicle-rc', { vehicleNumber: 'GJ01AB1234', makeModel: 'Honda City', expiryDate: m(84) }],
    ['passport', { name: 'Aarav Shah', passportNumber: 'Z1234567', expiryDate: m(2) }],
    ['passport', { name: 'Priya Shah', passportNumber: 'W7654321', expiryDate: m(52) }],
    ['visa', { name: 'Aarav Shah', country: 'United States', visaNumber: 'B1B2998877', expiryDate: d(-12) }],
    ['visa', { name: 'Priya Shah', country: 'Schengen (France)', visaNumber: 'FRA4455667', expiryDate: m(11) }],
    ['lift', { location: 'Sunrise Apartments, Tower B', company: 'Otis', maintainedBy: 'Otis Service Ahmedabad', expiryDate: d(45) }],
    ['medical-insurance', { insuredPerson: 'Shah Family', companyName: 'Star Health', policyNumber: 'P/211100/01/2026/004321', plan: 'Family Health Optima', expiryDate: d(25) }],
    ['medical-insurance', { insuredPerson: 'Kantaben Shah', companyName: 'Niva Bupa', policyNumber: '31112233445566', plan: 'Senior First', expiryDate: m(9) }],
    ['health-safety-scheme', { insuredPerson: 'Aarav Shah', plan: 'Corporate Wellness Gold', expiryDate: m(5) }],
    ['fixed-deposit', { bank: 'SBI', accountHolder: 'Aarav Shah', fdAccountNo: '40012345678', expiryDate: d(3) }],
    ['fixed-deposit', { bank: 'HDFC Bank', accountHolder: 'Priya Shah', fdAccountNo: '50300011122233', expiryDate: m(14) }],
    ['others', { description: 'Society NOC', remarks: 'Collect from society office', expiryDate: d(10), reminderDate: d(0) }],
    ['others', { description: 'Gym membership', remarks: '', expiryDate: m(6), reminderDate: toISODate(addDays(addMonths(t, 6), -7)) }],
  ];

  const nowIso = new Date().toISOString();
  return raw.map(([categoryId, values], i) => ({
    id: uuid(),
    categoryId,
    values,
    reminderDate: computeReminderDate(categoryId, values),
    snoozedUntil: null,
    lastNotifiedOn: null,
    renewalHistory: [],
    isSample: true,
    // Stagger createdAt so "recently added" sort is meaningful.
    createdAt: new Date(Date.now() - (raw.length - i) * 3600_000 * 24 * 30).toISOString(),
    updatedAt: nowIso,
  }));
}

/** Identity of an item ignoring dates, so sample items can be recognised after renewals. */
function fingerprint(categoryId, values) {
  const entries = Object.entries(values || {})
    .filter(([k, v]) => v && !/date/i.test(k))
    .sort(([a], [b]) => a.localeCompare(b));
  return `${categoryId}|${JSON.stringify(entries)}`;
}

const SAMPLE_FINGERPRINTS = new Set(buildSampleItems().map((i) => fingerprint(i.categoryId, i.values)));

/**
 * True for items created by "Load sample data". Items loaded before the
 * isSample flag existed are recognised by their exact sample values.
 */
export function isSampleItem(item) {
  return item.isSample === true || SAMPLE_FINGERPRINTS.has(fingerprint(item.categoryId, item.values));
}
