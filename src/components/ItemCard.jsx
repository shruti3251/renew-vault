import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Pencil, RefreshCw, CalendarPlus, Trash2, BellOff, History, BellRing } from 'lucide-react';
import { getColor } from '../config/categories';
import { CategoryBadge } from './Icon';
import StatusChip from './StatusChip';
import { formatDisplay } from '../utils/dates';
import { daysLeftText, progressPercent, STATUS_META } from '../utils/reminders';
import { mask } from '../utils/mask';
import { focusRing } from './ui';

export function SensitiveValue({ value, label }) {
  const [shown, setShown] = useState(false);
  if (!value) return <span>—</span>;
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      {/* Revealed values wrap instead of truncating, so the full number is always readable. */}
      <span className={`min-w-0 font-mono tracking-wide ${shown ? 'whitespace-normal break-all text-left' : 'truncate'}`}>{shown ? value : mask(value)}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShown((s) => !s);
        }}
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={shown}
        className={`-my-2 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white ${focusRing}`}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  );
}

function ActionButton({ icon: Icon, label, ariaLabel, onClick, danger, compact }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || (compact ? label : undefined)}
      title={label}
      className={`inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition ${focusRing} ${
        danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </button>
  );
}

function subtitleNode(item) {
  const f = item.category.fields.find((x) => x.key === item.category.subtitleField);
  if (!item.subtitle) return null;
  return f?.sensitive ? <SensitiveValue value={item.subtitle} label={f.label} /> : item.subtitle;
}

const ItemCard = forwardRef(function ItemCard({ item, view = 'grid', showCategory = false, highlight = false, onEdit, onRenew, onDelete, onCalendar }, ref) {
  const c = getColor(item.category);
  const meta = STATUS_META[item.status];
  const pct = progressPercent(item);
  const fields = item.category.fields.filter((f) => !f.isExpiry && !f.isReminder && f.key !== item.category.titleField && f.key !== item.category.subtitleField);
  const actions = [
    { icon: Pencil, label: 'Edit', onClick: () => onEdit(item) },
    { icon: RefreshCw, label: 'Renew', onClick: () => onRenew(item) },
    { icon: CalendarPlus, label: 'Calendar', onClick: () => onCalendar(item), full: 'Add to Calendar' },
    { icon: Trash2, label: 'Delete', onClick: () => onDelete(item), danger: true },
  ];

  const ring = highlight ? `ring-2 ${c.ring} ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950` : 'ring-1 ring-slate-900/5 dark:ring-white/10';

  if (view === 'list') {
    return (
      <article
        ref={ref}
        id={`item-${item.id}`}
        tabIndex={-1}
        aria-label={`${item.category.label}: ${item.title}`}
        className={`flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md focus:outline-none sm:flex-row sm:items-center dark:bg-slate-900 ${ring}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <CategoryBadge category={item.category} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900 dark:text-white">{item.title}</h3>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {showCategory && <span className={`font-medium ${c.text}`}>{item.category.label} · </span>}
              {subtitleNode(item)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDisplay(item.expiry)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{daysLeftText(item.daysLeft)}</p>
          </div>
          <StatusChip status={item.status} />
        </div>
        <div className="flex border-t border-slate-100 pt-1 sm:border-0 sm:pt-0 dark:border-slate-800">
          {actions.map((a) => (
            <ActionButton key={a.label} icon={a.icon} label={a.full || a.label} onClick={a.onClick} danger={a.danger} compact />
          ))}
        </div>
      </article>
    );
  }

  return (
    <article
      ref={ref}
      id={`item-${item.id}`}
      tabIndex={-1}
      aria-label={`${item.category.label}: ${item.title}`}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition motion-safe:hover:-translate-y-1 hover:shadow-lg focus:outline-none dark:bg-slate-900 ${ring}`}
    >
      <div className={`h-1.5 bg-gradient-to-r ${c.gradient}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <CategoryBadge category={item.category} size="md" />
          <div className="min-w-0 flex-1">
            {showCategory && <p className={`text-xs font-semibold ${c.text}`}>{item.category.label}</p>}
            <h3 className="truncate font-bold text-slate-900 dark:text-white" title={item.title}>
              {item.title}
            </h3>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{subtitleNode(item)}</p>
          </div>
        </div>

        {fields.length > 0 && (
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
            {fields.map((f) => (
              <div key={f.key} className="flex min-w-0 justify-between gap-3">
                <dt className="flex-none text-slate-500 dark:text-slate-400">{f.label}</dt>
                <dd className="min-w-0 truncate text-right font-medium text-slate-800 dark:text-slate-100">
                  {f.sensitive ? <SensitiveValue value={item.values[f.key]} label={f.label} /> : item.values[f.key] || '—'}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto pt-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.category.fields.find((f) => f.isExpiry)?.label || 'Expiry Date'}</p>
            <StatusChip status={item.status} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">{formatDisplay(item.expiry)}</p>
            <p className={`text-sm font-semibold ${item.status === 'expired' ? 'text-red-600 dark:text-red-400' : item.status === 'soon' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {daysLeftText(item.daysLeft)}
            </p>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-label="Time used before expiry"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full rounded-full ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" /> Reminder {formatDisplay(item.reminderDate)}
            </span>
            {item.snoozed && (
              <span className="inline-flex items-center gap-1">
                <BellOff className="h-3.5 w-3.5" aria-hidden="true" /> Snoozed to {formatDisplay(item.snoozedUntil)}
              </span>
            )}
            {item.renewalHistory?.length > 0 && (
              <span className="inline-flex items-center gap-1" title={item.renewalHistory.map((h) => `Was ${formatDisplay(h.oldExpiry)}, renewed ${formatDisplay(h.renewedOn)}`).join('\n')}>
                <History className="h-3.5 w-3.5" aria-hidden="true" /> Renewed {item.renewalHistory.length}×
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-0.5 border-t border-slate-100 p-1.5 dark:border-slate-800">
        {actions.map((a) => (
          <ActionButton key={a.label} icon={a.icon} label={a.label} ariaLabel={a.full} onClick={a.onClick} danger={a.danger} />
        ))}
      </div>
    </article>
  );
});

export default ItemCard;
