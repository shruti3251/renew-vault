import { useMemo } from 'react';
import { SearchX } from 'lucide-react';
import ItemGrid from '../components/ItemGrid';
import EmptyState from '../components/EmptyState';
import { matchesQuery } from '../utils/search';
import { sortByDaysLeft } from '../utils/reminders';

export default function SearchResults({ query, items, view, handlers }) {
  const results = useMemo(() => items.filter((i) => matchesQuery(i, query)).sort(sortByDaysLeft), [items, query]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Search results</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
          {results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”
        </p>
      </div>
      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="No matches" message="Search looks through every field in every category: names, numbers, vehicles, companies and dates." />
      ) : (
        <ItemGrid items={results} view={view} showCategory handlers={handlers} />
      )}
    </div>
  );
}
