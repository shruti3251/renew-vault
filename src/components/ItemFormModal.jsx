import { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Save } from 'lucide-react';
import Modal, { CloseButton } from './Modal';
import { CategoryIcon } from './Icon';
import { Button, inputCls } from './ui';
import { getCategory, getColor, CATEGORIES, reminderRuleText } from '../config/categories';
import { computeReminderDate } from '../utils/reminders';
import { formatDisplay, isValidISODate, todayStr, daysBetween } from '../utils/dates';
import { normalizeKey, normalizeUpper } from '../utils/mask';

export function validateValues(category, values) {
  const errors = {};
  for (const f of category.fields) {
    const v = String(values[f.key] ?? '').trim();
    if (f.required && !v) errors[f.key] = `${f.label} is required.`;
    else if (v && f.type === 'date' && !isValidISODate(v)) errors[f.key] = 'Please enter a valid date.';
  }
  if (category.reminder.type === 'custom') {
    const rKey = category.reminder.field;
    const eKey = category.fields.find((f) => f.isExpiry).key;
    if (!errors[rKey] && !errors[eKey] && values[rKey] && values[eKey] && values[rKey] > values[eKey]) {
      errors[rKey] = `Reminder Date must be on or before the ${category.fields.find((f) => f.isExpiry).label}.`;
    }
  }
  return errors;
}

/** Other items in the same category with the same identifying number. */
export function findDuplicates(category, values, items, excludeId) {
  const keys = category.fields.filter((f) => f.duplicateKey).map((f) => f.key);
  const hits = [];
  for (const other of items) {
    if (other.categoryId !== category.id || other.id === excludeId) continue;
    for (const k of keys) {
      const a = normalizeKey(values[k]);
      if (a && a === normalizeKey(other.values?.[k])) {
        hits.push({ item: other, field: category.fields.find((f) => f.key === k) });
        break;
      }
    }
  }
  return hits;
}

/** Vehicle numbers saved in any category with a `vehicle` field -> latest make/model. */
function vehicleSuggestions(items, excludeId) {
  const vehicleCats = new Set(CATEGORIES.filter((c) => c.fields.some((f) => f.vehicle)).map((c) => c.id));
  const map = new Map();
  [...items]
    .filter((i) => vehicleCats.has(i.categoryId) && i.id !== excludeId && i.values?.vehicleNumber)
    .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''))
    .forEach((i) => map.set(normalizeKey(i.values.vehicleNumber), { number: i.values.vehicleNumber, makeModel: i.values.makeModel || '' }));
  return [...map.values()];
}

export default function ItemFormModal({ categoryId, item, allItems, onSave, onClose }) {
  const category = getCategory(categoryId);
  const c = getColor(category);
  const isEdit = !!item;
  const [values, setValues] = useState(() => ({ ...(item?.values || {}) }));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [autoFilled, setAutoFilled] = useState(null);

  const errors = useMemo(() => validateValues(category, values), [category, values]);
  const suggestions = useMemo(() => vehicleSuggestions(allItems, item?.id), [allItems, item?.id]);
  const duplicates = useMemo(() => findDuplicates(category, values, allItems, item?.id), [category, values, allItems, item?.id]);

  const expiryField = category.fields.find((f) => f.isExpiry);
  const expiry = values[expiryField.key];
  const reminderDate = computeReminderDate(category, values);
  const today = todayStr();
  const expiryPast = isValidISODate(expiry) && expiry < today;

  const setValue = (key, v) => {
    const next = { ...values, [key]: v };
    const field = category.fields.find((f) => f.key === key);
    // Vehicle autocomplete: picking/typing a known number fills Make – Model
    // (unless the user already typed their own Make – Model).
    if (field?.vehicle && category.fields.some((f) => f.key === 'makeModel')) {
      const hit = suggestions.find((s) => normalizeKey(s.number) === normalizeKey(v));
      if (hit && hit.makeModel && (!values.makeModel || values.makeModel === autoFilled)) {
        next.makeModel = hit.makeModel;
        setAutoFilled(hit.makeModel);
      }
    }
    setValues(next);
  };

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      const firstKey = category.fields.find((f) => errors[f.key])?.key;
      document.getElementById(`field-${firstKey}`)?.focus();
      return;
    }
    onSave(values);
  };

  const reminderPreview = () => {
    if (!reminderDate || !isValidISODate(expiry)) return null;
    const rule =
      category.reminder.type === 'custom'
        ? (() => {
            const n = daysBetween(reminderDate, expiry);
            return n === 0 ? 'on the expiry date' : `${n} day${n === 1 ? '' : 's'} before expiry`;
          })()
        : reminderRuleText(category);
    const past = reminderDate <= today && !expiryPast;
    return (
      <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
        <BellRing className={`mt-0.5 h-4 w-4 flex-none ${c.text}`} aria-hidden="true" />
        <span>
          We&apos;ll remind you on <strong className="text-slate-900 dark:text-white">{formatDisplay(reminderDate)}</strong> ({rule})
          {past && '. That’s already here, so it will show as Expiring soon.'}
        </span>
      </p>
    );
  };

  const titleText = `${isEdit ? 'Edit' : 'Add'} ${category.label}`;

  return (
    <Modal onClose={onClose} size="md" labelledBy="item-form-title">
      <div className={`relative bg-gradient-to-br ${c.gradient} px-5 py-4 text-white`}>
        <div className="flex items-center gap-3 pr-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
            <CategoryIcon name={category.icon} className="h-6 w-6" />
          </span>
          <div>
            <h2 id="item-form-title" className="text-lg font-bold">
              {titleText}
            </h2>
            <p className="text-sm text-white/85">Reminder {reminderRuleText(category)}</p>
          </div>
        </div>
        <CloseButton onClick={onClose} className="!absolute right-3 top-3 !m-0 text-white hover:bg-white/20 hover:text-white dark:text-white dark:hover:bg-white/20" />
      </div>

      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {category.fields.map((f, idx) => {
            const id = `field-${f.key}`;
            const showErr = (submitted || touched[f.key]) && errors[f.key];
            const hasPreview = category.reminder.type === 'custom' ? f.isReminder : f.isExpiry;
            const describedBy = [showErr ? `${id}-error` : null, f.isReminder ? `${id}-hint` : null, hasPreview ? `${id}-preview` : null].filter(Boolean).join(' ') || undefined;
            const common = {
              id,
              name: f.key,
              value: values[f.key] || '',
              required: f.required,
              'aria-invalid': showErr ? true : undefined,
              'aria-describedby': describedBy,
              onBlur: () => {
                setTouched((t) => ({ ...t, [f.key]: true }));
                if (f.uppercase && values[f.key]) setValue(f.key, normalizeUpper(values[f.key]));
              },
              className: `${inputCls} mt-1.5 ${showErr ? '!ring-red-500' : ''}`,
              'data-autofocus': idx === 0 ? true : undefined,
            };
            return (
              <div key={f.key}>
                <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {f.label}
                  {f.required ? (
                    <span className="text-red-600" aria-hidden="true">
                      {' '}
                      *
                    </span>
                  ) : (
                    <span className="font-normal text-slate-400"> (optional)</span>
                  )}
                </label>
                {f.type === 'textarea' ? (
                  <textarea {...common} rows={2} onChange={(e) => setValue(f.key, e.target.value)} placeholder={f.placeholder} />
                ) : f.type === 'date' ? (
                  <input {...common} type="date" onChange={(e) => setValue(f.key, e.target.value)} />
                ) : (
                  <>
                    <input
                      {...common}
                      type="text"
                      autoComplete="off"
                      placeholder={f.placeholder}
                      list={f.vehicle && suggestions.length ? 'vehicle-suggestions' : undefined}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setValue(f.key, f.uppercase ? raw.toUpperCase().replace(/^\s+/, '').replace(/\s{2,}/g, ' ') : raw);
                      }}
                      className={`${common.className} ${f.uppercase ? 'uppercase placeholder:normal-case' : ''}`}
                    />
                    {f.vehicle && suggestions.length > 0 && (
                      <datalist id="vehicle-suggestions">
                        {suggestions.map((s) => (
                          <option key={s.number} value={s.number}>
                            {s.makeModel}
                          </option>
                        ))}
                      </datalist>
                    )}
                  </>
                )}
                {showErr && (
                  <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                    {errors[f.key]}
                  </p>
                )}
                {f.isReminder && (
                  <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Must be on or before the expiry date.
                  </p>
                )}
                {hasPreview && <div id={`${id}-preview`}>{reminderPreview()}</div>}
              </div>
            );
          })}

          {(expiryPast || duplicates.length > 0) && (
            <div className="space-y-2" aria-live="polite">
              {expiryPast && (
                <Warning>
                  This {expiryField.label.toLowerCase()} is already in the past ({formatDisplay(expiry)}). You can still save it; it will show as <strong>Expired</strong>.
                </Warning>
              )}
              {duplicates.map((d) => (
                <Warning key={d.item.id}>
                  You already have a {category.label} with this {d.field.label} ({d.item.values[category.titleField]}, expires {formatDisplay(d.item.values[expiryField.key])}). Saving will add another one.
                </Warning>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="text-red-600" aria-hidden="true">
              *
            </span>{' '}
            Required field. Press Enter to save, Esc to cancel.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-900">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <button type="submit" className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${c.solid}`}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {isEdit ? 'Save changes' : `Save ${category.label}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
