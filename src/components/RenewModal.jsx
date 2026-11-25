import { useState } from 'react';
import { addYears } from 'date-fns';
import { RefreshCw, History, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { Button, inputCls } from './ui';
import { CategoryBadge } from './Icon';
import { getColor } from '../config/categories';
import { computeReminderDate } from '../utils/reminders';
import { formatDisplay, isValidISODate, parseDate, toISODate, todayStr } from '../utils/dates';

function plusYear(str) {
  const d = parseDate(str);
  return d ? toISODate(addYears(d, 1)) : '';
}

/** Asks only for the new expiry date (+ optional new numbers where relevant). */
export default function RenewModal({ item, onSave, onClose }) {
  const category = item.category;
  const c = getColor(category);
  const expiryField = category.fields.find((f) => f.isExpiry);
  const isCustom = category.reminder.type === 'custom';
  const renewable = category.fields.filter((f) => f.renewable);

  const [expiry, setExpiry] = useState(() => plusYear(item.expiry));
  const [reminder, setReminder] = useState(() => (isCustom ? plusYear(item.reminderDate) : ''));
  const [extras, setExtras] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = {};
  if (!isValidISODate(expiry)) errors.expiry = 'Please enter the new expiry date.';
  if (isCustom) {
    if (!isValidISODate(reminder)) errors.reminder = 'Please enter a reminder date.';
    else if (!errors.expiry && reminder > expiry) errors.reminder = 'Reminder Date must be on or before the new expiry date.';
  }
  const notLater = isValidISODate(expiry) && item.expiry && expiry <= item.expiry;
  const past = isValidISODate(expiry) && expiry < todayStr();
  const preview = isValidISODate(expiry) ? computeReminderDate(category, { ...item.values, [expiryField.key]: expiry, ...(isCustom ? { [category.reminder.field]: reminder } : {}) }) : null;

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    onSave(expiry, extras, isCustom ? reminder : undefined);
  };

  return (
    <Modal onClose={onClose} size="sm" title={`Renew ${category.label}`}>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className={`flex items-center gap-3 rounded-xl p-3 ${c.soft}`}>
            <CategoryBadge category={category} size="md" solid />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">{item.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Current expiry: {formatDisplay(item.expiry)}</p>
            </div>
          </div>

          <div>
            <label htmlFor="renew-expiry" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              New {expiryField.label} <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="renew-expiry"
              type="date"
              required
              data-autofocus
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              aria-invalid={submitted && errors.expiry ? true : undefined}
              aria-describedby="renew-expiry-msg"
              className={`${inputCls} mt-1.5`}
            />
            <div id="renew-expiry-msg">
              {submitted && errors.expiry && <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">{errors.expiry}</p>}
              {preview && !errors.expiry && (
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                  Next reminder: <strong className="text-slate-900 dark:text-white">{formatDisplay(preview)}</strong>
                </p>
              )}
            </div>
          </div>

          {isCustom && (
            <div>
              <label htmlFor="renew-reminder" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                New Reminder Date <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="renew-reminder"
                type="date"
                required
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                aria-invalid={submitted && errors.reminder ? true : undefined}
                aria-describedby={errors.reminder ? 'renew-reminder-err' : undefined}
                className={`${inputCls} mt-1.5`}
              />
              {submitted && errors.reminder && (
                <p id="renew-reminder-err" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                  {errors.reminder}
                </p>
              )}
            </div>
          )}

          {renewable.map((f) => (
            <div key={f.key}>
              <label htmlFor={`renew-${f.key}`} className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                New {f.label} <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id={`renew-${f.key}`}
                type="text"
                autoComplete="off"
                value={extras[f.key] || ''}
                onChange={(e) => setExtras((x) => ({ ...x, [f.key]: e.target.value }))}
                placeholder="Leave blank to keep the current one"
                className={`${inputCls} mt-1.5`}
              />
            </div>
          ))}

          {(notLater || past) && (
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <p>{past ? 'The new date is already in the past.' : 'The new date is not later than the current expiry.'} You can still save it.</p>
            </div>
          )}

          {item.renewalHistory?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <History className="h-4 w-4" aria-hidden="true" /> Renewal history
              </h3>
              <ul className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-400">
                {[...item.renewalHistory].reverse().map((h, idx) => (
                  <li key={idx}>
                    Expiry was {formatDisplay(h.oldExpiry)}, renewed on {formatDisplay(h.renewedOn)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-900">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <button type="submit" className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${c.solid}`}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Save renewal
          </button>
        </div>
      </form>
    </Modal>
  );
}
