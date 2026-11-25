import { useEffect, useRef } from 'react';
import { BellOff, PartyPopper } from 'lucide-react';
import { CategoryBadge } from './Icon';
import StatusChip from './StatusChip';
import { CloseButton } from './Modal';
import { formatDisplay } from '../utils/dates';
import { daysLeftText } from '../utils/reminders';
import { focusRing } from './ui';

/** Dropdown listing ALL due + expired items (snoozed ones included), sorted by days left. */
export default function BellPanel({ items, onClose, onOpenItem }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[aria-haspopup="dialog"]')) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Items that need attention"
      className="fixed inset-x-2 top-16 z-40 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-scale-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem] dark:bg-slate-900 dark:ring-white/10"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
        <h2 className="font-bold text-slate-900 dark:text-white">
          Needs attention <span className="text-slate-400">({items.length})</span>
        </h2>
        <CloseButton onClick={onClose} label="Close notifications" className="!m-0" />
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <PartyPopper className="h-10 w-10 text-emerald-500" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">All caught up!</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing is expiring soon.</p>
        </div>
      ) : (
        <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onOpenItem(i);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 ${focusRing} focus-visible:ring-inset`}
              >
                <CategoryBadge category={i.category} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{i.title}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {i.category.label} · {formatDisplay(i.expiry)} · {daysLeftText(i.daysLeft)}
                  </span>
                  {i.snoozed && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <BellOff className="h-3 w-3" aria-hidden="true" /> Snoozed until {formatDisplay(i.snoozedUntil)}
                    </span>
                  )}
                </span>
                <StatusChip status={i.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
