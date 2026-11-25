/**
 * RenewalVault category configuration.
 *
 * Everything in the UI (sidebar, dashboard cards, forms, item cards, search,
 * reminders, CSV export) is generated from this file. To add a category,
 * append an object to CATEGORIES. No component code needs to change.
 *
 * Category shape:
 *  id            unique, kebab-case. Stored on every item, so don't rename it once you have data.
 *  label         display name
 *  group         sidebar group, one of GROUPS (or add a new group to GROUPS)
 *  icon          lucide-react icon name, must also be registered in src/components/Icon.jsx
 *  color         key of COLORS below
 *  titleField    field key shown as the card title
 *  subtitleField field key shown under the title
 *  reminder      { type: 'months' | 'days', value: n }  -> n months/days before expiry
 *                { type: 'custom', field: '<dateFieldKey>' } -> user picks the reminder date
 *  fields        rendered in this order. Field options:
 *                  key, label, type ('text' | 'date' | 'textarea'), required,
 *                  sensitive (masked on cards), isExpiry (the expiry date field),
 *                  uppercase (auto-uppercase + collapse spaces),
 *                  vehicle (enables vehicle-number autocomplete),
 *                  duplicateKey (used for duplicate detection),
 *                  renewable (offered as an optional "new value" in the Renew flow),
 *                  placeholder
 */

export const GROUPS = ['Vehicle', 'Travel', 'Health', 'Finance', 'Property', 'Others'];

// Full literal class strings so Tailwind's scanner keeps them in the build.
// Never build these dynamically (e.g. `bg-${color}-500`).
export const COLORS = {
  indigo: {
    solid: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400',
    bg: 'bg-indigo-500', soft: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300',
    ring: 'ring-indigo-400', gradient: 'from-indigo-500 to-indigo-400', border: 'border-indigo-500', hex: '#6366f1',
  },
  emerald: {
    solid: 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-400',
    bg: 'bg-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-400', gradient: 'from-emerald-500 to-emerald-400', border: 'border-emerald-500', hex: '#10b981',
  },
  sky: {
    solid: 'bg-sky-700 hover:bg-sky-800 focus-visible:ring-sky-400',
    bg: 'bg-sky-500', soft: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-400', gradient: 'from-sky-500 to-sky-400', border: 'border-sky-500', hex: '#0ea5e9',
  },
  cyan: {
    solid: 'bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-400',
    bg: 'bg-cyan-500', soft: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300',
    ring: 'ring-cyan-400', gradient: 'from-cyan-500 to-cyan-400', border: 'border-cyan-500', hex: '#06b6d4',
  },
  violet: {
    solid: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-400',
    bg: 'bg-violet-500', soft: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-400', gradient: 'from-violet-500 to-violet-400', border: 'border-violet-500', hex: '#8b5cf6',
  },
  fuchsia: {
    solid: 'bg-fuchsia-700 hover:bg-fuchsia-800 focus-visible:ring-fuchsia-400',
    bg: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-700 dark:text-fuchsia-300',
    ring: 'ring-fuchsia-400', gradient: 'from-fuchsia-500 to-fuchsia-400', border: 'border-fuchsia-500', hex: '#d946ef',
  },
  orange: {
    solid: 'bg-orange-700 hover:bg-orange-800 focus-visible:ring-orange-400',
    bg: 'bg-orange-500', soft: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-400', gradient: 'from-orange-500 to-orange-400', border: 'border-orange-500', hex: '#f97316',
  },
  rose: {
    solid: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400',
    bg: 'bg-rose-500', soft: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-400', gradient: 'from-rose-500 to-rose-400', border: 'border-rose-500', hex: '#f43f5e',
  },
  teal: {
    solid: 'bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-400',
    bg: 'bg-teal-500', soft: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-400', gradient: 'from-teal-500 to-teal-400', border: 'border-teal-500', hex: '#14b8a6',
  },
  amber: {
    solid: 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-400',
    bg: 'bg-amber-500', soft: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-400', gradient: 'from-amber-500 to-amber-400', border: 'border-amber-500', hex: '#f59e0b',
  },
  slate: {
    solid: 'bg-slate-700 hover:bg-slate-800 focus-visible:ring-slate-400',
    bg: 'bg-slate-500', soft: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-300',
    ring: 'ring-slate-400', gradient: 'from-slate-500 to-slate-400', border: 'border-slate-500', hex: '#64748b',
  },
};

// Reusable field definitions
const expiry = { key: 'expiryDate', label: 'Expiry Date', type: 'date', required: true, isExpiry: true };
const vehicleNumber = {
  key: 'vehicleNumber', label: 'Vehicle Number', type: 'text', required: true,
  uppercase: true, vehicle: true, duplicateKey: true, placeholder: 'e.g. GJ01AB1234',
};
const makeModel = { key: 'makeModel', label: 'Vehicle Make – Model', type: 'text', required: true, placeholder: 'e.g. Honda City' };

export const CATEGORIES = [
  {
    id: 'driving-license',
    label: 'Driving License',
    group: 'Vehicle',
    icon: 'IdCard',
    color: 'indigo',
    titleField: 'name',
    subtitleField: 'dlNumber',
    reminder: { type: 'months', value: 1 },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'dlNumber', label: 'DL Number', type: 'text', required: true, sensitive: true, duplicateKey: true, uppercase: true },
      expiry,
    ],
  },
  {
    id: 'puc',
    label: 'PUC',
    group: 'Vehicle',
    icon: 'Wind',
    color: 'emerald',
    titleField: 'vehicleNumber',
    subtitleField: 'makeModel',
    reminder: { type: 'days', value: 5 },
    fields: [vehicleNumber, makeModel, expiry],
  },
  {
    id: 'insurance',
    label: 'Insurance',
    group: 'Vehicle',
    icon: 'ShieldCheck',
    color: 'sky',
    titleField: 'vehicleNumber',
    subtitleField: 'companyName',
    reminder: { type: 'months', value: 1 },
    fields: [
      vehicleNumber,
      makeModel,
      { key: 'companyName', label: 'Insurance Company Name', type: 'text', required: true },
      { key: 'policyNumber', label: 'Policy Number', type: 'text', required: true, sensitive: true, duplicateKey: true, renewable: true },
      expiry,
    ],
  },
  {
    id: 'vehicle-rc',
    label: 'Vehicle RC',
    group: 'Vehicle',
    icon: 'Car',
    color: 'cyan',
    titleField: 'vehicleNumber',
    subtitleField: 'makeModel',
    reminder: { type: 'months', value: 1 },
    fields: [vehicleNumber, makeModel, expiry],
  },
  {
    id: 'passport',
    label: 'Passport',
    group: 'Travel',
    icon: 'BookUser',
    color: 'violet',
    titleField: 'name',
    subtitleField: 'passportNumber',
    reminder: { type: 'months', value: 3 },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'passportNumber', label: 'Passport Number', type: 'text', required: true, sensitive: true, duplicateKey: true, uppercase: true, renewable: true },
      expiry,
    ],
  },
  {
    id: 'visa',
    label: 'Visa',
    group: 'Travel',
    icon: 'Plane',
    color: 'fuchsia',
    titleField: 'name',
    subtitleField: 'country',
    reminder: { type: 'months', value: 3 },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'visaNumber', label: 'Visa Number', type: 'text', required: true, sensitive: true, duplicateKey: true, uppercase: true, renewable: true },
      expiry,
    ],
  },
  {
    id: 'lift',
    label: 'Lift',
    group: 'Property',
    icon: 'Building2',
    color: 'orange',
    titleField: 'location',
    subtitleField: 'company',
    reminder: { type: 'months', value: 3 },
    fields: [
      { key: 'location', label: 'Location', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'maintainedBy', label: 'Maintained By', type: 'text', required: true },
      expiry,
    ],
  },
  {
    id: 'medical-insurance',
    label: 'Medical Insurance',
    group: 'Health',
    icon: 'HeartPulse',
    color: 'rose',
    titleField: 'insuredPerson',
    subtitleField: 'companyName',
    reminder: { type: 'months', value: 1 },
    fields: [
      { key: 'insuredPerson', label: 'Insured Person', type: 'text', required: true },
      { key: 'companyName', label: 'Company Name', type: 'text', required: true },
      { key: 'policyNumber', label: 'Policy Number', type: 'text', required: true, sensitive: true, duplicateKey: true, renewable: true },
      { key: 'plan', label: 'Plan', type: 'text', required: true },
      expiry,
    ],
  },
  {
    id: 'health-safety-scheme',
    label: 'Health Safety Scheme',
    group: 'Health',
    icon: 'Stethoscope',
    color: 'teal',
    titleField: 'insuredPerson',
    subtitleField: 'plan',
    reminder: { type: 'months', value: 1 },
    fields: [
      { key: 'insuredPerson', label: 'Insured Person', type: 'text', required: true },
      { key: 'plan', label: 'Plan', type: 'text', required: true },
      expiry,
    ],
  },
  {
    id: 'fixed-deposit',
    label: 'Fixed Deposit',
    group: 'Finance',
    icon: 'Landmark',
    color: 'amber',
    titleField: 'bank',
    subtitleField: 'accountHolder',
    reminder: { type: 'days', value: 5 },
    fields: [
      { key: 'bank', label: 'Bank', type: 'text', required: true },
      { key: 'accountHolder', label: 'Account Holder', type: 'text', required: true },
      { key: 'fdAccountNo', label: 'FD Account No.', type: 'text', required: true, sensitive: true, duplicateKey: true, renewable: true },
      expiry,
    ],
  },
  {
    id: 'others',
    label: 'Others',
    group: 'Others',
    icon: 'FileText',
    color: 'slate',
    titleField: 'description',
    subtitleField: 'remarks',
    reminder: { type: 'custom', field: 'reminderDate' },
    fields: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false },
      { key: 'expiryDate', label: 'Validity / Exp. Date', type: 'date', required: true, isExpiry: true },
      { key: 'reminderDate', label: 'Reminder Date', type: 'date', required: true, isReminder: true },
    ],
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return CATEGORY_MAP[id];
}

export function getColor(category) {
  return COLORS[category?.color] || COLORS.slate;
}

export function getExpiryField(category) {
  return category.fields.find((f) => f.isExpiry) || { key: 'expiryDate' };
}

/** Human text for a category's reminder rule, e.g. "1 month before expiry". */
export function reminderRuleText(category) {
  const r = category.reminder;
  if (r.type === 'custom') return 'on the date you choose';
  const unit = r.type === 'months' ? 'month' : 'day';
  return `${r.value} ${unit}${r.value === 1 ? '' : 's'} before expiry`;
}
