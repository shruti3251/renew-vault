import { AlarmClock, BellOff, Eye, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import { CategoryBadge } from './Icon';
import StatusChip from './StatusChip';
import { Button, focusRing } from './ui';
import { formatDisplay } from '../utils/dates';
import { daysLeftText } from '../utils/reminders';

function Action({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${focusRing} ${
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

/** Shown on load when items are due / expired (non-snoozed, not dismissed today). */
export default function ReminderPopup({ items, onRenew, onSnooze, onView, onDismissToday, onClose }) {
  const n = items.length;
  return (
    <Modal onClose={onClose} size="lg" labelledBy="popup-title">
      <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-5 py-5 text-white">
        <h2 id="popup-title" className="text-xl font-extrabold">
          <span aria-hidden="true">⚠️ </span>
          {n} item{n === 1 ? '' : 's'} need{n === 1 ? 's' : ''} your attention
        </h2>
        <p className="mt-1 text-sm text-white/90">Renew them now, or snooze the reminder.</p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {items.map((i) => (
          <li key={i.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <CategoryBadge category={i.category} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{i.category.label}</p>
                <p className="truncate font-bold text-slate-900 dark:text-white">{i.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {formatDisplay(i.expiry)} · <span className={i.status === 'expired' ? 'font-semibold text-red-600 dark:text-red-400' : 'font-semibold text-amber-700 dark:text-amber-300'}>{daysLeftText(i.daysLeft)}</span>
                </p>
              </div>
              <StatusChip status={i.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Action icon={RefreshCw} label="Renew" primary onClick={() => onRenew(i)} />
              <Action icon={AlarmClock} label="Remind me tomorrow" onClick={() => onSnooze(i, 1)} />
              <Action icon={BellOff} label="Snooze 7 days" onClick={() => onSnooze(i, 7)} />
              <Action icon={Eye} label="View" onClick={() => onView(i)} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" onClick={onDismissToday}>
          Dismiss all for today
        </Button>
      </div>
    </Modal>
  );
}
