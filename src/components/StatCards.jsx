import { Layers, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { focusRing } from './ui';

const CARDS = [
  { key: 'total', status: null, label: 'Total', icon: Layers, grad: 'from-indigo-500 to-violet-500', text: 'text-indigo-700 dark:text-indigo-300', soft: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { key: 'active', status: 'active', label: 'Active', icon: CheckCircle2, grad: 'from-emerald-500 to-green-400', text: 'text-emerald-700 dark:text-emerald-300', soft: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { key: 'soon', status: 'soon', label: 'Expiring soon', icon: AlertTriangle, grad: 'from-amber-500 to-yellow-400', text: 'text-amber-700 dark:text-amber-300', soft: 'bg-amber-50 dark:bg-amber-500/10' },
  { key: 'expired', status: 'expired', label: 'Expired', icon: XCircle, grad: 'from-red-500 to-rose-400', text: 'text-red-700 dark:text-red-300', soft: 'bg-red-50 dark:bg-red-500/10' },
];

export default function StatCards({ counts, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {CARDS.map(({ key, status, label, icon: Icon, grad, text, soft }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(status)}
          aria-label={`${label}: ${counts[key]} items. Show ${label.toLowerCase()} items`}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-900/5 transition motion-safe:hover:-translate-y-0.5 hover:shadow-md sm:p-5 dark:bg-slate-900 dark:ring-white/10 ${focusRing}`}
        >
          <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${grad}`} aria-hidden="true" />
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${soft} ${text}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="mt-3 block text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">{counts[key]}</span>
          <span className={`block text-sm font-semibold ${text}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}
