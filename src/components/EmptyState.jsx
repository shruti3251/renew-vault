import { Plus } from 'lucide-react';
import { CategoryIcon } from './Icon';
import { getColor } from '../config/categories';

export default function EmptyState({ category, title, message, actionLabel, onAction, icon: IconCmp }) {
  const c = getColor(category);
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${c.soft} ${c.text}`}>
        {IconCmp ? <IconCmp className="h-8 w-8" aria-hidden="true" /> : <CategoryIcon name={category?.icon} className="h-8 w-8" />}
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${c.solid}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
