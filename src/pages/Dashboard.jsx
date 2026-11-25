import { useMemo } from 'react';
import { format } from 'date-fns';
import { Sparkles, CalendarClock, PartyPopper, ChevronRight, Database, Trash2 } from 'lucide-react';
import StatCards from '../components/StatCards';
import CategoryCard from '../components/CategoryCard';
import StatusChip from '../components/StatusChip';
import { CategoryBadge } from '../components/Icon';
import { Card, Button, focusRing } from '../components/ui';
import { CATEGORIES, getColor } from '../config/categories';
import { formatDisplay, formatMonthYear } from '../utils/dates';
import { daysLeftText, sortByDaysLeft } from '../utils/reminders';

function SectionTitle({ icon: Icon, children, aside }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <Icon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
        {children}
      </h2>
      {aside}
    </div>
  );
}

export default function Dashboard({ items, due, counts, statsByCategory, onStatus, onOpenCategory, onAddCategory, onOpenItem, onLoadSample, sampleCount = 0, onRemoveSample }) {
  const upcoming = useMemo(() => {
    const list = items.filter((i) => i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= 90).sort(sortByDaysLeft);
    const groups = [];
    for (const i of list) {
      const key = i.expiry.slice(0, 7);
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, label: formatMonthYear(i.expiry), items: [] }));
      g.items.push(i);
    }
    return groups;
  }, [items]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Your renewal dashboard</h1>
        </div>
        {items.length === 0 && (
          <Button variant="secondary" onClick={onLoadSample}>
            <Database className="h-4 w-4" aria-hidden="true" /> Load sample data
          </Button>
        )}
      </div>

      {sampleCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200 sm:flex-row sm:items-center sm:justify-between dark:bg-indigo-500/10 dark:ring-indigo-500/30">
          <p className="flex items-start gap-2 text-sm text-indigo-900 dark:text-indigo-200">
            <Database className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>
              You&apos;re looking at <strong>{sampleCount} sample item{sampleCount === 1 ? '' : 's'}</strong>. Remove them when you&apos;re ready to add your real documents.
            </span>
          </p>
          <Button variant="secondary" onClick={onRemoveSample} className="flex-none">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove sample data
          </Button>
        </div>
      )}

      <StatCards counts={counts} onSelect={onStatus} />

      <section aria-labelledby="attention-title">
        <SectionTitle
          icon={Sparkles}
          aside={
            due.length > 0 && (
              <button type="button" onClick={() => onStatus('due')} className={`inline-flex min-h-[44px] items-center gap-0.5 rounded-lg px-2 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300 ${focusRing}`}>
                See all <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          }
        >
          <span id="attention-title">Needs attention</span>
        </SectionTitle>
        {due.length === 0 ? (
          <Card className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <PartyPopper className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">All caught up!</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{items.length ? 'Nothing is expiring soon.' : 'Add your first document using the + button.'}</p>
            </div>
          </Card>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
            <ul className="flex snap-x snap-mandatory gap-3">
              {due.map((i) => {
                const c = getColor(i.category);
                return (
                  <li key={i.id} className="w-64 flex-none snap-start sm:w-72">
                    <button
                      type="button"
                      onClick={() => onOpenItem(i)}
                      className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-900/5 transition motion-safe:hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:ring-white/10 ${focusRing}`}
                    >
                      <span className={`absolute inset-y-0 left-0 w-1.5 ${i.status === 'expired' ? 'bg-red-500' : 'bg-amber-500'}`} aria-hidden="true" />
                      <span className="flex items-start gap-3">
                        <CategoryBadge category={i.category} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-xs font-semibold ${c.text}`}>{i.category.label}</span>
                          <span className="block truncate font-bold text-slate-900 dark:text-white">{i.title}</span>
                        </span>
                      </span>
                      <span className="mt-3 flex items-center justify-between gap-2">
                        <span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDisplay(i.expiry)}</span>
                          <span className={`block text-sm font-bold ${i.status === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>{daysLeftText(i.daysLeft)}</span>
                        </span>
                        <StatusChip status={i.status} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="categories-title">
        <h2 id="categories-title" className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
          Categories
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c.id} category={c} stats={statsByCategory[c.id]} onOpen={() => onOpenCategory(c.id)} onAdd={() => onAddCategory(c.id)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="upcoming-title">
        <SectionTitle icon={CalendarClock}>
          <span id="upcoming-title">Upcoming in next 90 days</span>
        </SectionTitle>
        <Card className="p-5">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Nothing expires in the next 90 days.</p>
          ) : (
            <div className="space-y-6">
              {upcoming.map((g) => (
                <div key={g.key}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{g.label}</h3>
                  <ol className="relative ml-3 space-y-1 border-l-2 border-slate-100 dark:border-slate-800">
                    {g.items.map((i) => {
                      const c = getColor(i.category);
                      return (
                        <li key={i.id} className="relative pl-6">
                          <span className={`absolute -left-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ring-4 ring-white dark:ring-slate-900 ${c.bg}`} aria-hidden="true" />
                          <button
                            type="button"
                            onClick={() => onOpenItem(i)}
                            className={`flex min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 ${focusRing}`}
                          >
                            <span className="w-14 flex-none text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatDisplay(i.expiry).slice(0, 6)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{i.title}</span>
                              <span className={`block text-xs ${c.text}`}>{i.category.label}</span>
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{daysLeftText(i.daysLeft)}</span>
                            <StatusChip status={i.status} />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
