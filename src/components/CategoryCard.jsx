import { Plus } from 'lucide-react';
import { getColor, reminderRuleText } from '../config/categories';
import { CategoryIcon } from './Icon';

export default function CategoryCard({ category, stats, onOpen, onAdd }) {
  const c = getColor(category);
  const { count = 0, soon = 0, expired = 0 } = stats || {};
  const parts = [`${count} item${count === 1 ? '' : 's'}`];
  if (soon) parts.push(`${soon} expiring`);
  if (expired) parts.push(`${expired} expired`);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition motion-safe:hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-400 dark:bg-slate-900 dark:ring-white/10">
      <div className={`relative h-20 bg-gradient-to-br ${c.gradient}`}>
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" aria-hidden="true" />
        <div className="absolute -bottom-10 left-10 h-20 w-20 rounded-full bg-white/10" aria-hidden="true" />
        <span className="absolute -bottom-6 left-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-4 ring-white dark:bg-slate-800 dark:ring-slate-900">
          <CategoryIcon name={category.icon} className={`h-7 w-7 ${c.text}`} />
        </span>
      </div>
      <div className="px-4 pb-4 pt-8">
        {/* Stretched button: the whole card opens the category page. */}
        <button type="button" onClick={onOpen} className="text-left font-bold text-slate-900 after:absolute after:inset-0 after:content-[''] focus:outline-none dark:text-white">
          {category.label}
        </button>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          {parts.join(' • ')}
          {(soon > 0 || expired > 0) && <span className={`ml-1.5 inline-block h-2 w-2 rounded-full align-middle ${expired ? 'bg-red-500' : 'bg-amber-500'}`} aria-hidden="true" />}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Reminder {reminderRuleText(category)}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${category.label}`}
        className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md transition motion-safe:hover:rotate-90 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:bg-slate-900/90 dark:text-white"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
