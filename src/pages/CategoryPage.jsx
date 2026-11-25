import { useEffect, useMemo, useState } from 'react';
import { Plus, LayoutGrid, List, Layers, SearchX } from 'lucide-react';
import { getCategory, getColor, reminderRuleText } from '../config/categories';
import { CategoryIcon } from '../components/Icon';
import ItemGrid from '../components/ItemGrid';
import EmptyState from '../components/EmptyState';
import { focusRing } from '../components/ui';
import { sortByDaysLeft, isDue } from '../utils/reminders';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active', dot: 'bg-emerald-500' },
  { id: 'soon', label: 'Expiring soon', dot: 'bg-amber-500' },
  { id: 'expired', label: 'Expired', dot: 'bg-red-500' },
];

const SORTS = {
  expiry: { label: 'Expiry (soonest first)', fn: sortByDaysLeft },
  az: { label: 'Name (A–Z)', fn: (a, b) => String(a.title).localeCompare(String(b.title)) },
  recent: { label: 'Recently added', fn: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
};

export function applyFilter(items, filter) {
  if (filter === 'all' || !filter) return items;
  if (filter === 'due') return items.filter((i) => isDue(i.status));
  return items.filter((i) => i.status === filter);
}

export function Toolbar({ filter, setFilter, sort, setSort, view, setView, counts }) {
  const filters = filter === 'due' ? [...FILTERS, { id: 'due', label: 'Needs attention', dot: 'bg-orange-500' }] : FILTERS;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1" role="group" aria-label="Filter by status">
        {filters.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={on}
              className={`inline-flex min-h-[44px] flex-none items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${focusRing} ${
                on ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} aria-hidden="true" />}
              {f.label}
              <span className={`tabular-nums ${on ? 'opacity-80' : 'text-slate-400'}`}>{counts[f.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border-0 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-none dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
        >
          {Object.entries(SORTS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" role="group" aria-label="Layout">
          {[
            { id: 'grid', icon: LayoutGrid, label: 'Grid view' },
            { id: 'list', icon: List, label: 'List view' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              aria-label={label}
              className={`inline-flex h-9 w-11 items-center justify-center rounded-lg ${focusRing} ${view === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function countByFilter(items) {
  const c = { all: items.length, active: 0, soon: 0, expired: 0, due: 0 };
  for (const i of items) {
    if (c[i.status] !== undefined) c[i.status] += 1;
    if (isDue(i.status)) c.due += 1;
  }
  return c;
}

export default function CategoryPage({ categoryId, initialFilter = 'all', items, view, setView, focusItemId, onFocused, onAdd, onPickAdd, handlers }) {
  const category = categoryId ? getCategory(categoryId) : null;
  const c = getColor(category || { color: 'indigo' });
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState('expiry');

  useEffect(() => setFilter(initialFilter), [categoryId, initialFilter]);

  const inCategory = useMemo(() => (category ? items.filter((i) => i.categoryId === category.id) : items), [items, category]);
  const counts = useMemo(() => countByFilter(inCategory), [inCategory]);
  const shown = useMemo(() => [...applyFilter(inCategory, filter)].sort(SORTS[sort].fn), [inCategory, filter, sort]);

  // Make sure a focused item is visible even if the current filter hides it.
  useEffect(() => {
    if (focusItemId && inCategory.some((i) => i.id === focusItemId) && !shown.some((i) => i.id === focusItemId)) setFilter('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusItemId]);

  const title = category ? category.label : 'All items';

  return (
    <div className="space-y-6">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${category ? c.gradient : 'from-indigo-500 via-violet-500 to-fuchsia-500'} p-5 text-white shadow-lg sm:p-7`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" aria-hidden="true" />
        <div className="absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
              {category ? <CategoryIcon name={category.icon} className="h-7 w-7" /> : <Layers className="h-7 w-7" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
              <p className="text-sm text-white/90">
                {category ? `Reminder: ${reminderRuleText(category)}` : 'Every document across all categories'} · {inCategory.length} item{inCategory.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (category ? onAdd(category.id) : onPickAdd())}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-5 text-base font-bold text-slate-900 shadow-md transition hover:shadow-lg motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add {category ? category.label : 'item'}
          </button>
        </div>
      </section>

      {inCategory.length === 0 ? (
        <EmptyState
          category={category}
          icon={category ? undefined : Layers}
          title={category ? `No ${category.label} added yet` : 'Nothing added yet'}
          message={category ? `Add your ${category.label} and we'll remind you ${reminderRuleText(category)}.` : 'Add your first document and RenewalVault will remind you before it expires.'}
          actionLabel={`Add ${category ? category.label : 'item'}`}
          onAction={() => (category ? onAdd(category.id) : onPickAdd())}
        />
      ) : (
        <>
          <Toolbar filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} view={view} setView={setView} counts={counts} />
          {shown.length === 0 ? (
            <EmptyState category={category} icon={SearchX} title="No items match this filter" message="Try a different status filter." />
          ) : (
            <ItemGrid items={shown} view={view} showCategory={!category} focusItemId={focusItemId} onFocused={onFocused} handlers={handlers} />
          )}
        </>
      )}
    </div>
  );
}
